#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { aggregateFoodAccuracy, evaluateFoodCase } from '../../public/food-accuracy-core.mjs';
import { getTestAuthHeaders, invokeApi, loadEnvFile } from '../lib/api-test-utils.js';

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
    const [key, ...value] = arg.replace(/^--/, '').split('=');
    return [key, value.length ? value.join('=') : true];
}));
const mode = String(args.mode || 'fixture');
const datasetPath = path.resolve(String(args.dataset || 'tests/accuracy/golden-dataset.json'));
const outputDir = path.resolve(String(args.output || 'output/accuracy'));
const maxCalls = Math.max(0, Number(args['max-live-calls'] ?? (mode === 'live' ? 5 : 0)));
const maxEstimatedCostUsd = Math.max(0, Number(args['max-estimated-cost-usd'] ?? (mode === 'live' ? 0.25 : 0)));
const conservativeCostPerCall = Math.max(0.001, Number(args['estimated-cost-per-call-usd'] || 0.05));
const shouldGate = args.gate !== 'false';
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function validateRunOptions() {
    if (!['fixture', 'live'].includes(mode)) throw new Error('Mode must be fixture or live.');
    if (mode === 'live' && args['allow-live'] !== 'true') {
        throw new Error('Live evaluation requires --allow-live=true and explicit call/spend limits.');
    }
    if (mode === 'live' && (!Number.isSafeInteger(maxCalls) || maxCalls < 1
        || !Number.isFinite(maxEstimatedCostUsd) || maxEstimatedCostUsd <= 0
        || !Number.isFinite(conservativeCostPerCall))) {
        throw new Error('Live evaluation needs a positive integer call limit and finite spend limits.');
    }
}

function readDataset() {
    const parsed = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.cases)) {
        throw new Error(`Unsupported accuracy dataset: ${datasetPath}`);
    }
    const ids = new Set();
    for (const testCase of parsed.cases) {
        if (!testCase || typeof testCase.id !== 'string' || !testCase.id.trim() || ids.has(testCase.id)
            || !['voice', 'photo', 'typed'].includes(testCase.modality)
            || !['visible_label', 'dictated_values', 'official_brand', 'generic'].includes(testCase.evidence)
            || !testCase.truth?.totals || typeof testCase.truth.totals !== 'object'
            || !Object.keys(testCase.truth.totals).length
            || Object.values(testCase.truth.totals).some(value => typeof value !== 'number' || !Number.isFinite(value) || value < 0)) {
            throw new Error('Dataset cases need unique IDs, valid modality/evidence and nonnegative numeric truth.');
        }
        ids.add(testCase.id);
    }
    const selected = parsed.cases.filter((testCase) => {
        if (args.case && testCase.id !== args.case) return false;
        if (args.modality && testCase.modality !== args.modality) return false;
        if (args.tag && !testCase.tags?.includes(args.tag)) return false;
        return true;
    });
    if (!selected.length) throw new Error('No dataset cases match the requested selection.');
    return { ...parsed, cases: selected };
}

function readImage(testCase) {
    let bytes;
    if (testCase.input?.imageData) {
        const encoded = String(testCase.input.imageData).replace(/^data:image\/(?:jpeg|png|webp);base64,/, '');
        if (encoded.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) {
            throw new Error('Image must be valid base64 and at most 8 MiB.');
        }
        bytes = Buffer.from(encoded, 'base64');
    } else {
        if (!testCase.input?.imagePath) return null;
        const directory = fs.realpathSync(path.dirname(datasetPath));
        const imagePath = fs.realpathSync(path.resolve(directory, testCase.input.imagePath));
        if (!imagePath.startsWith(`${directory}${path.sep}`)) throw new Error('Images must remain inside the dataset directory.');
        if (fs.statSync(imagePath).size > MAX_IMAGE_BYTES) throw new Error('Image exceeds 8 MiB.');
        bytes = fs.readFileSync(imagePath);
    }
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const webp = bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
    if (!jpeg && !png && !webp) throw new Error('Only JPEG, PNG or WebP images are accepted.');
    return bytes.toString('base64');
}

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

async function runLiveCase(testCase) {
    const startedAt = Date.now();
    let response;
    if (testCase.modality === 'photo') {
        const { default: foodVisionHandler } = await import('../../api/ai-food-vision.js');
        const image = readImage(testCase);
        if (!image) return { skipped: true, reason: 'No image data in dataset case' };
        response = await invokeApi(foodVisionHandler, {
            headers: getTestAuthHeaders(),
            body: {
                image,
                mimeType: testCase.input?.mimeType || 'image/jpeg',
                imageContext: testCase.input?.context || '',
                photoContextDetails: testCase.input?.photoContextDetails || {},
                ...(testCase.input?.spatialContext ? { spatialContext: testCase.input.spatialContext } : {}),
                forceWebSearch: true,
            },
        });
    } else {
        const { default: foodParserHandler } = await import('../../api/ai-food-parser.js');
        response = await invokeApi(foodParserHandler, {
            headers: getTestAuthHeaders(),
            body: {
                query: testCase.input?.transcript || testCase.input?.intendedPhrase || '',
                alternatives: testCase.input?.alternatives || [],
                source: testCase.modality === 'voice' ? 'voice' : 'search',
                forceWebSearch: Boolean(testCase.forceWebSearch),
            },
        });
    }
    const payload = response.body && typeof response.body === 'object' ? response.body : { success: false, error: String(response.body || '') };
    if (response.status >= 400) payload.success = false;
    return { prediction: payload, latencyMs: Date.now() - startedAt, status: response.status };
}

function markdownReport(dataset, summary, results, runMeta) {
    const percent = (value) => `${((value || 0) * 100).toFixed(1)}%`;
    const lines = [
        `# Food Accuracy Report`,
        '',
        `- Dataset: ${dataset.name || path.basename(datasetPath)}`,
        `- Mode: ${mode}`,
        `- Evidence: ${mode === 'fixture' ? 'stored fixture predictions; not live recognition or nutrition accuracy' : 'live provider responses; not a physical iPhone capture test'}`,
        `- Selected cases: ${dataset.cases.length}`,
        `- Cases scored: ${summary.overall.count}`,
        `- Complete selection: ${runMeta.complete ? 'yes' : 'no'}`,
        `- Case requests used: ${runMeta.callsUsed}/${maxCalls || 0}`,
        `- Conservative estimated spend: $${runMeta.estimatedCostUsd.toFixed(2)} / $${maxEstimatedCostUsd.toFixed(2)}`,
        `- Release gate: ${summary.releaseGatePassed ? 'PASS' : 'FAIL'}`,
        `- Overall pass rate: ${percent(summary.overall.passRate)}`,
        `- Identity pass rate: ${percent(summary.overall.identityPassRate)}`,
        `- Catastrophic error rate: ${percent(summary.overall.catastrophicRate)}`,
        '',
        '| Case | Mode | Evidence | Result | Calorie error | Latency |',
        '|---|---|---|---:|---:|---:|',
    ];
    for (const result of results) {
        const calorie = result.nutrients?.find((metric) => metric.field === 'calories');
        lines.push(`| ${result.title} | ${result.modality} | ${result.evidence} | ${result.pass ? 'PASS' : 'FAIL'} | ${calorie ? percent(calorie.relativeError) : 'n/a'} | ${result.latencyMs ?? 'n/a'} ms |`);
    }
    return `${lines.join('\n')}\n`;
}

function htmlReport(summary, results, markdown) {
    const rows = results.map((result) => {
        const calorie = result.nutrients?.find((metric) => metric.field === 'calories');
        return `<tr><td>${escapeHtml(result.title)}</td><td>${escapeHtml(result.modality)}</td><td>${escapeHtml(result.evidence)}</td><td class="${result.pass ? 'pass' : 'fail'}">${result.pass ? 'PASS' : 'FAIL'}</td><td>${calorie ? `${(calorie.relativeError * 100).toFixed(1)}%` : 'n/a'}</td><td>${result.latencyMs ?? 'n/a'} ms</td></tr>`;
    }).join('');
    return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Food Accuracy Report</title><style>body{font:15px system-ui;margin:32px;color:#13233a}h1{color:#287fb6}.summary{padding:16px;border:1px solid #d8e4ef;border-radius:8px;background:#f7fbff}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{padding:10px;border-bottom:1px solid #d8e4ef;text-align:left}.pass{color:#08783e;font-weight:800}.fail{color:#b42318;font-weight:800}pre{white-space:pre-wrap;background:#f6f8fa;padding:14px;border-radius:8px}</style><body><h1>Food Accuracy Report</h1><div class="summary"><strong>Release gate: <span class="${summary.releaseGatePassed ? 'pass' : 'fail'}">${summary.releaseGatePassed ? 'PASS' : 'FAIL'}</span></strong><br>Pass rate ${(summary.overall.passRate * 100).toFixed(1)}% · identity ${(summary.overall.identityPassRate * 100).toFixed(1)}% · catastrophic ${(summary.overall.catastrophicRate * 100).toFixed(1)}%</div><table><thead><tr><th>Case</th><th>Mode</th><th>Evidence</th><th>Result</th><th>Calorie error</th><th>Latency</th></tr></thead><tbody>${rows}</tbody></table><details><summary>Text report</summary><pre>${markdown.replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char]))}</pre></details></body></html>`;
}

async function main() {
    validateRunOptions();
    const dataset = readDataset();
    if (mode === 'live') loadEnvFile('.env.local');
    if (mode !== 'live') {
        delete process.env.CLAUDE_API_KEY;
        delete process.env.ANTHROPIC_API_KEY;
        delete process.env.FOOD_AI_API_KEY;
        delete process.env.HF_TOKEN;
        delete process.env.HUGGING_FACE_HUB_TOKEN;
        delete process.env.FOOD_AI_BASE_URL;
    }
    fs.mkdirSync(outputDir, { recursive: true });
    const results = [];
    const skipped = [];
    let callsUsed = 0;
    let estimatedCostUsd = 0;

    for (const testCase of dataset.cases) {
        let prediction = testCase.fixturePrediction;
        let latencyMs = testCase.fixtureLatencyMs ?? null;
        if (mode === 'live') {
            if (callsUsed >= maxCalls || estimatedCostUsd + conservativeCostPerCall > maxEstimatedCostUsd) {
                skipped.push({ id: testCase.id, reason: 'Live-call or estimated-spend cap reached' });
                continue;
            }
            const live = await runLiveCase(testCase);
            if (live.skipped) {
                skipped.push({ id: testCase.id, reason: live.reason });
                continue;
            }
            callsUsed += 1;
            estimatedCostUsd += conservativeCostPerCall;
            prediction = live.prediction;
            latencyMs = live.latencyMs;
        }
        if (!prediction) {
            skipped.push({ id: testCase.id, reason: 'No fixture prediction' });
            continue;
        }
        results.push(evaluateFoodCase(testCase, prediction, { latencyMs }));
    }

    const summary = aggregateFoodAccuracy(results);
    const complete = skipped.length === 0 && results.length === dataset.cases.length;
    summary.gates.completeSelection = complete;
    summary.releaseGatePassed = summary.releaseGatePassed && complete;
    const runMeta = { mode, datasetPath, callsUsed, maxCalls, estimatedCostUsd, maxEstimatedCostUsd, skipped, complete, selectedCount: dataset.cases.length,
        verificationKind: mode === 'fixture' ? 'stored-fixture-contract' : 'live-provider-evaluation', requestUnit: 'evaluated-cases' };
    const report = { schemaVersion: 1, run: runMeta, summary, results };
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = `food-accuracy-${mode}-${stamp}`;
    const markdown = markdownReport(dataset, summary, results, runMeta);
    fs.writeFileSync(path.join(outputDir, `${baseName}.json`), `${JSON.stringify(report, null, 2)}\n`);
    fs.writeFileSync(path.join(outputDir, `${baseName}.md`), markdown);
    fs.writeFileSync(path.join(outputDir, `${baseName}.html`), htmlReport(summary, results, markdown));
    fs.writeFileSync(path.join(outputDir, 'latest.json'), `${JSON.stringify(report, null, 2)}\n`);
    fs.writeFileSync(path.join(outputDir, 'latest.md'), markdown);
    fs.writeFileSync(path.join(outputDir, 'latest.html'), htmlReport(summary, results, markdown));

    process.stdout.write(markdown);
    if (skipped.length) process.stdout.write(`\nSkipped ${skipped.length} case(s).\n`);
    if (shouldGate && !summary.releaseGatePassed) process.exitCode = 1;
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
