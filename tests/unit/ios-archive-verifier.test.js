import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const temporaryRoots = [];
const runtimeVersion = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'))
    .packages['node_modules/@capacitor/ios'].version;

function makeMetadataFixture(version) {
    const archive = fs.mkdtempSync(path.join(os.tmpdir(), 'fuelfire-archive-metadata-test-'));
    temporaryRoots.push(archive);
    const app = path.join(archive, 'Products/Applications/App.app');
    const framework = path.join(app, 'Frameworks/Capacitor.framework');
    fs.mkdirSync(framework, { recursive: true });
    const permissions = [
        'NSCameraUsageDescription', 'NSHealthShareUsageDescription', 'NSHealthUpdateUsageDescription',
        'NSLocationWhenInUseUsageDescription', 'NSMicrophoneUsageDescription',
        'NSPhotoLibraryAddUsageDescription', 'NSPhotoLibraryUsageDescription', 'NSSpeechRecognitionUsageDescription',
    ];
    const plist = entries => `<?xml version="1.0" encoding="UTF-8"?><plist version="1.0"><dict>${entries}</dict></plist>`;
    fs.writeFileSync(path.join(app, 'Info.plist'), plist(
        '<key>CFBundleIdentifier</key><string>com.wellfit.app</string>'
        + permissions.map(key => `<key>${key}</key><string>Metadata test usage.</string>`).join(''),
    ));
    fs.writeFileSync(path.join(app, 'PrivacyInfo.xcprivacy'), plist(''));
    if (version) fs.writeFileSync(path.join(framework, 'Info.plist'), plist(
        `<key>CFBundleShortVersionString</key><string>${version}</string>`,
    ));
    return archive;
}

function verifyMetadata(version) {
    return spawnSync('bash', ['scripts/verify-ios-archive.sh', makeMetadataFixture(version)], { encoding: 'utf8' });
}

afterEach(() => {
    for (const directory of temporaryRoots.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

// These are synthetic metadata fixtures, not signed archives or device proof.
// The script uses Apple's plutil and is intentionally checked on macOS only.
describe.skipIf(process.platform !== 'darwin')('iOS archive metadata guard', () => {
    it('accepts the embedded runtime matching the patched candidate', () => {
        const result = verifyMetadata(runtimeVersion);
        expect(result.status, result.stderr).toBe(0);
        expect(result.stdout).toContain('Signed verification skipped');
    });
    it('rejects an affected runtime even when the source lock is patched', () => {
        const result = verifyMetadata('7.6.5');
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain('Embedded Capacitor runtime');
    });
    it('rejects a different runtime rather than approving a stale candidate', () => {
        const result = verifyMetadata('7.6.9');
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain('does not match');
    });
    it('rejects an archive without embedded runtime metadata', () => {
        const result = verifyMetadata(null);
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain('embedded Capacitor framework metadata');
    });
});
