import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const directories = [];
const seed = JSON.parse(fs.readFileSync('tests/accuracy/golden-dataset.json', 'utf8')).cases[0];
function run(cases, extra = []) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fuelfire-accuracy-runner-'));
    directories.push(directory);
    const dataset = path.join(directory, 'dataset.json');
    fs.writeFileSync(dataset, JSON.stringify({ schemaVersion: 1, cases }));
    const result = spawnSync(process.execPath, ['tests/accuracy/run-food-accuracy.mjs', `--dataset=${dataset}`, `--output=${directory}/output`, '--gate', ...extra], { encoding: 'utf8' });
    const reportPath = path.join(directory, 'output/latest.json');
    return { ...result, directory, report: fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null };
}
afterEach(() => directories.splice(0).forEach(directory => fs.rmSync(directory, { recursive: true, force: true })));

describe('accuracy runner safety and honest release gates', () => {
    it('labels complete fixture runs as stored predictions without provider calls', () => {
        const result = run([seed]);
        expect(result.status).toBe(0);
        expect(result.report.run).toMatchObject({ verificationKind: 'stored-fixture-contract', complete: true, callsUsed: 0, selectedCount: 1 });
        expect(result.stdout).toContain('not live recognition or nutrition accuracy');
    });
    it('fails the gate when one selected prediction is missing', () => {
        const { fixturePrediction, ...missing } = { ...seed, id: 'missing' };
        const result = run([seed, missing]);
        expect(result.status).toBe(1);
        expect(result.report.summary.releaseGatePassed).toBe(false);
        expect(result.report.run.skipped).toHaveLength(1);
    });
    it('rejects empty selections and duplicate IDs', () => {
        expect(run([seed], ['--case=not-a-case']).status).toBe(1);
        expect(run([seed, seed]).status).toBe(1);
    });
    it('rejects unknown modes and live execution without opt-in before importing providers', () => {
        expect(run([seed], ['--mode=oops']).stderr).toContain('Mode must be fixture or live');
        const result = run([seed], ['--mode=live']);
        expect(result.status).toBe(1);
        expect(result.stderr).toContain('--allow-live=true');
        expect(result.report).toBeNull();
    });
    it('rejects nonfinite live budgets before provider calls', () => {
        const result = run([seed], ['--mode=live', '--allow-live=true', '--max-live-calls=Infinity']);
        expect(result.status).toBe(1);
        expect(result.stderr).toContain('positive integer call limit');
    });
    it('escapes imported titles in generated HTML', () => {
        const result = run([{ ...seed, title: '<img src=x onerror=alert(1)>' }]);
        const html = fs.readFileSync(path.join(result.directory, 'output/latest.html'), 'utf8');
        expect(html).not.toContain('<img src=x');
        expect(html).toContain('&lt;img src=x');
    });
});
