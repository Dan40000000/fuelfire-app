import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const script = path.resolve('scripts/validate-web.mjs');
const directories = [];
function validate(files) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fuelfire-static-gate-'));
    directories.push(directory);
    fs.mkdirSync(path.join(directory, 'public'));
    Object.entries(files).forEach(([filename, contents]) => fs.writeFileSync(path.join(directory, 'public', filename), contents));
    return spawnSync(process.execPath, [script], { cwd: directory, encoding: 'utf8' });
}
afterEach(() => directories.splice(0).forEach(directory => fs.rmSync(directory, { recursive: true, force: true })));
describe('static app build gate', () => {
    it('checks classic, module and inline scripts without executing them', () => {
        const result = validate({
            'index.html': '<script src="app.js?v=1"></script><script>window.loaded = true;</script>',
            'app.js': 'window.start = () => true;',
            'exports.js': 'export const data = [];',
        });
        expect(result.status).toBe(0);
        expect(result.stdout).toContain('Validated 3');
    });
    it('rejects broken inline JavaScript and missing script assets', () => {
        const result = validate({ 'index.html': '<script>const broken = ;</script><script src="missing.js"></script>' });
        expect(result.status).toBe(1);
        expect(result.stderr).toContain('inline script');
        expect(result.stderr).toContain('missing local script');
    });
    it('rejects script references escaping the public directory', () => {
        const result = validate({ 'index.html': '<script src="../outside.js"></script>' });
        expect(result.status).toBe(1);
    });
});
