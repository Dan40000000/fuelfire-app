import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const guardPath = path.join(root, 'scripts/check-release-files.sh');
const temporaryRepositories = new Set();

function git(repository, args) {
    spawnSync('git', args, {
        cwd: repository,
        encoding: 'utf8',
        stdio: 'ignore',
    });
}

function createRepository(files) {
    const repository = fs.mkdtempSync(path.join(os.tmpdir(), 'fuelfire-release-guard-'));
    temporaryRepositories.add(repository);
    git(repository, ['init', '-q']);
    fs.writeFileSync(path.join(repository, 'README.md'), 'base\n');
    git(repository, ['add', '--', 'README.md']);
    git(repository, [
        '-c', 'user.name=Release Guard Test',
        '-c', 'user.email=release-guard@example.invalid',
        'commit', '-qm', 'base',
    ]);

    for (const [relativePath, contents] of Object.entries(files)) {
        const filePath = path.join(repository, relativePath);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, contents);
    }
    git(repository, ['add', '--all']);
    git(repository, [
        '-c', 'user.name=Release Guard Test',
        '-c', 'user.email=release-guard@example.invalid',
        'commit', '-qm', 'change',
    ]);
    return repository;
}

function runGuard(repository) {
    return spawnSync('bash', [guardPath, '--base', 'HEAD^'], {
        cwd: repository,
        encoding: 'utf8',
    });
}

function combinedOutput(result) {
    return `${result.stdout || ''}\n${result.stderr || ''}`;
}

afterEach(() => {
    for (const repository of temporaryRepositories) {
        fs.rmSync(repository, { recursive: true, force: true });
    }
    temporaryRepositories.clear();
});

describe('release-file guard', () => {
    it('allows ordinary backup-named source/docs files but rejects archive paths', () => {
        const allowed = createRepository({
            'tests/backup.test.js': 'export const passes = true;\n',
            'docs/backup-plan.md': '# Plan\n',
            'tests/back-up.test.js': 'export const passes = true;\n',
        });
        expect(runGuard(allowed).status).toBe(0);

        const blockedDirectory = createRepository({
            'archives/release-notes.md': 'metadata only\n',
        });
        expect(runGuard(blockedDirectory).status).toBe(1);

        const blockedExtension = createRepository({
            'releases/app.ipa': 'archive placeholder\n',
        });
        expect(runGuard(blockedExtension).status).toBe(1);
    });

    it('allows example dotenv templates but rejects tracked environment files', () => {
        const allowed = createRepository({
            'config/.env.example': 'API_URL=https://example.invalid\n',
            'config/.env.sample': 'API_URL=https://example.invalid\n',
            'config/.env.template': 'API_URL=https://example.invalid\n',
        });
        expect(runGuard(allowed).status).toBe(0);

        const blocked = createRepository({
            'config/.env.local': 'placeholder only\n',
        });
        expect(runGuard(blocked).status).toBe(1);
    });

    it('detects Anthropic and Vercel provider prefixes without printing values', () => {
        const providerPrefixA = ['sk', 'ant', 'api03'].join('-');
        const providerPrefixB = ['vercel', '_'].join('');
        const providerTokenA = `${providerPrefixA}-${'A'.repeat(24)}`;
        const providerTokenB = `${providerPrefixB}${'B'.repeat(24)}`;
        const repository = createRepository({
            'fixtures/provider-values.txt': `${providerTokenA}\n${providerTokenB}\n`,
        });

        const result = runGuard(repository);
        const output = combinedOutput(result);
        expect(result.status).toBe(1);
        expect(output).toContain('candidate values were withheld');
        expect(output).not.toContain(providerTokenA);
        expect(output).not.toContain(providerTokenB);
    });

    it('consumes a large positive diff before returning a secret violation', () => {
        const keyName = ['API', 'KEY'].join('_');
        const syntheticValue = 'placeholder-secret-value-123456';
        const largeDiff = `${keyName}=${syntheticValue}\n`
            + `${'filler-line-for-pipe-safety\n'.repeat(4000)}`;
        expect(Buffer.byteLength(largeDiff)).toBeGreaterThan(64 * 1024);

        const repository = createRepository({
            'fixtures/large-added-file.txt': largeDiff,
        });
        const result = runGuard(repository);
        const output = combinedOutput(result);

        expect(result.status).toBe(1);
        expect(output).toContain('secret-like material in added lines');
        expect(output).not.toContain(syntheticValue);
    });
});
