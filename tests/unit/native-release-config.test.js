import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const packageJson = JSON.parse(read('package.json'));
const packageLock = JSON.parse(read('package-lock.json'));

function versionAtLeast(version, minimum) {
    const actual = version.split('.').map(Number);
    const required = minimum.split('.').map(Number);
    return actual[0] > required[0]
        || (actual[0] === required[0] && actual[1] > required[1])
        || (actual[0] === required[0] && actual[1] === required[1] && actual[2] >= required[2]);
}

describe('native release configuration', () => {
    it('pins the patched Capacitor runtime and supported Node toolchain', () => {
        expect(packageJson.engines.node).toBe('>=22.12.0');
        expect(packageLock.packages[''].engines.node).toBe('>=22.12.0');

        for (const name of ['@capacitor/android', '@capacitor/cli', '@capacitor/core', '@capacitor/ios']) {
            expect(packageJson.dependencies[name]).toBe('^7.6.10');
            expect(versionAtLeast(packageLock.packages[`node_modules/${name}`].version, '7.6.9')).toBe(true);
        }
    });

    it('keeps core-module coverage explicit and adds WebKit mobile coverage', () => {
        const vitestConfig = read('vitest.config.mjs');
        for (const modulePath of [
            'public/workout-store.js',
            'public/food-store.js',
            'public/activity-energy.js',
            'public/account-data.js',
        ]) {
            expect(vitestConfig).toContain(`'${modulePath}'`);
        }
        expect(vitestConfig).toContain('not a whole-application coverage claim');

        const playwrightConfig = read('playwright.config.js');
        expect(playwrightConfig).toContain("name: 'mobile-webkit'");
        expect(playwrightConfig).toContain("browserName: 'webkit'");
        expect(packageJson.scripts['test:e2e:webkit']).toBe('playwright test --project=mobile-webkit');
        expect(read('.github/workflows/test.yml')).toContain('chromium webkit');
    });

    it('guards release metadata without exposing secret values', () => {
        const guard = read('scripts/check-release-files.sh');
        expect(guard).toContain('git diff --name-only --diff-filter=ACR');
        expect(guard).toContain('git diff --unified=0 --no-ext-diff');
        expect(guard).toContain('rg -N --pcre2');
        expect(guard).not.toContain('rg -N -q --pcre2');
        expect(guard).toContain('sk-ant-');
        expect(guard).toContain('vercel_');
        expect(guard).toContain('candidate values were withheld');
        expect(guard).not.toContain('cat ');
    });

    it('targets the real app in native UI tests and validates archive privacy metadata', () => {
        const project = read('ios/App/App.xcodeproj/project.pbxproj');
        const scheme = read('ios/App/App.xcodeproj/xcshareddata/xcschemes/AppUITests.xcscheme');
        expect(project).toContain('TEST_TARGET_NAME = App;');
        expect(project).toContain('target = 504EC3031FED79650016851F /* App */;');
        expect(scheme).toContain('BlueprintName = "App"');
        expect(scheme).not.toContain('AppUITestHost');

        const runner = read('scripts/run-ios-ui-tests.sh');
        expect(runner).toContain('IOS_SIMULATOR_UDID');
        expect(runner).toContain('select(.udid == $udid)');

        const archiveVerifier = read('scripts/verify-ios-archive.sh');
        expect(archiveVerifier).toContain('PrivacyInfo.xcprivacy');
        expect(archiveVerifier).toContain('--require-signed');
        expect(archiveVerifier).toContain('Frameworks/Capacitor.framework/Info.plist');
        expect(archiveVerifier).toContain('!atLeast(embeddedVersion)');
        expect(archiveVerifier).toContain("embeddedVersion !== packages['node_modules/@capacitor/ios'].version");
        expect(read('ios/App/App/PrivacyInfo.xcprivacy')).toContain('NSPrivacyAccessedAPITypes');
    });

    it('settles FoodDepth calls around permission and presentation races', () => {
        const plugin = read('ios/App/App/FoodDepthCapturePlugin.swift');
        expect(plugin.indexOf('pendingCall = call')).toBeLessThan(plugin.indexOf('requestAccess(for: .video)'));
        expect(plugin).toContain('self.pendingCall === call');
        expect(plugin).toContain('captureViewController === viewController');
        expect(plugin).toContain('PRESENTATION_FAILED');
        expect(plugin).toContain('pendingCall = nil');
    });
});
