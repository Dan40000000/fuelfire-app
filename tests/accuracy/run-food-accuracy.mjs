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

function readDataset() {
    const parsed = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.cases)) {
        throw new Error(`Unsupported accuracy dataset: ${datasetPath}`);
    }
    const selected = parsed.cases.filter((testCase) => {
        if (args.case && testCase.id !== args.case) return false;
        if (args.modality && testCase.modality !== args.modality) return false;
        if (args.tag && !testCase.tags?.includes(args.tag)) return false;
        return true;
    });
    return { ...parsed, cases: selected };
}

function readImage(testCase) {
    if (testCase.input?.imageData) return testCase.input.imageData.replace(/^data:[^;]+;base64,/, '');
    if (!testCase.input?.imagePath) return null;
    const imagePath = path.resolve(path.dirname(datasetPath), testCase.input.imagePath);
    return fs.readFileSync(imagePath).toString('base64');
}

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
        `- Cases scored: ${summary.overall.count}`,
        `- Calls used: ${runMeta.callsUsed}/${maxCalls || 0}`,
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
        return `<tr><td>${result.title}</td><td>${result.modality}</td><td>${result.evidence}</td><td class="${result.pass ? 'pass' : 'fail'}">${result.pass ? 'PASS' : 'FAIL'}</td><td>${calorie ? `${(calorie.relativeError * 100).toFixed(1)}%` : 'n/a'}</td><td>${result.latencyMs ?? 'n/a'} ms</td></tr>`;
    }).join('');
    return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Food Accuracy Report</title><style>body{font:15px system-ui;margin:32px;color:#13233a}h1{color:#287fb6}.summary{padding:16px;border:1px solid #d8e4ef;border-radius:8px;background:#f7fbff}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{padding:10px;border-bottom:1px solid #d8e4ef;text-align:left}.pass{color:#08783e;font-weight:800}.fail{color:#b42318;font-weight:800}pre{white-space:pre-wrap;background:#f6f8fa;padding:14px;border-radius:8px}</style><body><h1>Food Accuracy Report</h1><div class="summary"><strong>Release gate: <span class="${summary.releaseGatePassed ? 'pass' : 'fail'}">${summary.releaseGatePassed ? 'PASS' : 'FAIL'}</span></strong><br>Pass rate ${(summary.overall.passRate * 100).toFixed(1)}% · identity ${(summary.overall.identityPassRate * 100).toFixed(1)}% · catastrophic ${(summary.overall.catastrophicRate * 100).toFixed(1)}%</div><table><thead><tr><th>Case</th><th>Mode</th><th>Evidence</th><th>Result</th><th>Calorie error</th><th>Latency</th></tr></thead><tbody>${rows}</tbody></table><details><summary>Text report</summary><pre>${markdown.replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char]))}</pre></details></body></html>`;
}

async function main() {
    loadEnvFile('.env.local');
    if (mode !== 'live') {
        delete process.env.CLAUDE_API_KEY;
        delete process.env.ANTHROPIC_API_KEY;
    }
    const dataset = readDataset();
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
    const runMeta = { mode, datasetPath, callsUsed, maxCalls, estimatedCostUsd, maxEstimatedCostUsd, skipped };
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
