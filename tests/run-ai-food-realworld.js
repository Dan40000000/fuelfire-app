#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import foodParserHandler from '../api/ai-food-parser.js';
import foodVisionHandler from '../api/ai-food-vision.js';
import { getTestAuthHeaders, invokeApi, loadEnvFile, startApiTestServer } from './lib/api-test-utils.js';

loadEnvFile('.env.local');

const textOnly = process.argv.includes('--text-only');
const includeVision = !textOnly && (process.argv.includes('--include-vision') || process.env.INCLUDE_VISION === '1');
const visionLimitArg = process.argv.find((arg) => arg.startsWith('--vision-limit='));
const visionLimit = visionLimitArg
    ? Math.max(0, Number.parseInt(visionLimitArg.split('=')[1], 10) || 0)
    : Number.POSITIVE_INFINITY;
const outputDir = 'tests';

const textCases = [
    {
        name: 'McDonald Big Mac',
        query: "McDonald's Big Mac",
        sourceUrl: 'https://www.mcdonalds.com/us/en-us/product/big-mac.html',
        expected: { calories: 580, protein: 25, carbs: 46, fat: 34 },
        tolerance: { calories: 0.08, protein: 0.20, carbs: 0.20, fat: 0.20 },
        forceWebSearch: false,
    },
    {
        name: 'Chick-fil-A Chicken Sandwich',
        query: 'Chick-fil-A Chicken Sandwich',
        sourceUrl: 'https://www.chick-fil-a.com/menu/entrees/chick-fil-a-chicken-sandwich',
        expected: { calories: 420, protein: 29, carbs: 41, fat: 18 },
        tolerance: { calories: 0.08, protein: 0.15, carbs: 0.15, fat: 0.15 },
        forceWebSearch: false,
    },
    {
        name: 'Chipotle Custom Chicken Bowl',
        query: 'Chipotle bowl with chicken, cilantro-lime white rice, black beans, fajita veggies, fresh tomato salsa, cheese, and romaine lettuce',
        sourceUrl: 'https://www.chipotle.com/content/dam/chipotle/menu/nutrition/US-Nutrition-Facts-Paper-Menu-3-2025.pdf',
        expected: { calories: 680, protein: 51, carbs: 73, fat: 21 },
        tolerance: { calories: 0.15, protein: 0.18, carbs: 0.18, fat: 0.25 },
        forceWebSearch: false,
    },
    {
        name: 'Panda Express Orange Chicken And Chow Mein',
        query: 'Panda Express Orange Chicken with Chow Mein',
        sourceUrl: 'https://www.pandaexpress.com/menu',
        expected: { calories: 1000, protein: 38, carbs: 131, fat: 37 },
        tolerance: { calories: 0.15, protein: 0.25, carbs: 0.20, fat: 0.25 },
        forceWebSearch: false,
    },
    {
        name: 'Taco Bell Crunchwrap Supreme',
        query: 'Taco Bell Crunchwrap Supreme',
        sourceUrl: 'https://www.tacobell.com/food/specialties/crunchwrap-supreme',
        expected: { calories: 540, protein: 16, carbs: 71, fat: 21 },
        tolerance: { calories: 0.12, protein: 0.25, carbs: 0.20, fat: 0.25 },
        forceWebSearch: false,
    },
    {
        name: 'Voice Sausage Egg McMuffin Alias',
        query: "McDonald's sausage egg McMuffin",
        sourceUrl: 'https://www.mcdonalds.com/us/en-us/product/sausage-mcmuffin-with-egg.html',
        expected: { calories: 480, protein: 21, carbs: 29, fat: 31 },
        tolerance: { calories: 0.01, protein: 0.05, carbs: 0.05, fat: 0.05 },
        forceWebSearch: false,
        source: 'voice',
    },
    {
        name: 'Voice Sausage Egg McMuffin Explicit Calories',
        query: "McDonald's sausage egg McMuffin 480 calories",
        sourceUrl: 'https://www.mcdonalds.com/us/en-us/product/sausage-mcmuffin-with-egg.html',
        expected: { calories: 480, protein: 21, carbs: 29, fat: 31 },
        tolerance: { calories: 0.01, protein: 0.05, carbs: 0.05, fat: 0.05 },
        forceWebSearch: false,
        source: 'voice',
    },
    {
        name: 'Voice Calories Only Quick Entry',
        query: 'add three hundred calories',
        sourceUrl: null,
        expected: { calories: 300, protein: 0, carbs: 0, fiber: 0, netCarbs: 0, fat: 0 },
        tolerance: { calories: 0.01, protein: 0.01, carbs: 0.01, fiber: 0.01, netCarbs: 0.01, fat: 0.01 },
        forceWebSearch: false,
        source: 'voice',
    },
    {
        name: 'Voice Protein Shake Spoken Macros',
        query: 'protein shake two hundred calories thirty grams protein eight carbs two fat',
        sourceUrl: null,
        expected: { calories: 200, protein: 30, carbs: 8, fat: 2 },
        tolerance: { calories: 0.01, protein: 0.01, carbs: 0.01, fat: 0.01 },
        forceWebSearch: false,
        source: 'voice',
    },
    {
        name: 'Voice Quest Dictated Net Carbs',
        query: 'Quest supreme full pizza should be Fournett carbs and 760 cal for the whole pizza',
        sourceUrl: 'https://www.questnutrition.com/collections/more-products/products/supreme-pizza',
        expected: { calories: 760, protein: 60, carbs: 54, fiber: 50, netCarbs: 4, fat: 51 },
        tolerance: { calories: 0.01, protein: 0.05, carbs: 0.01, fiber: 0.01, netCarbs: 0.01, fat: 0.05 },
        forceWebSearch: false,
        source: 'voice',
    },
    {
        name: 'Johnsonville Small Breakfast Sausage Links Quantity',
        query: '6 Johnsonville Vermont Maple Syrup breakfast sausage links',
        sourceUrl: 'https://www.calorieking.com/us/en/foods/f/calories-in-franks-wieners-sausages-vermont-maple-syrup-breakfast-sausage-links/mz4dOyNORMWVCjKVD37Xxg',
        expected: { calories: 340, protein: 20, carbs: 4, fiber: 0, netCarbs: 4, fat: 26 },
        tolerance: { calories: 0.01, protein: 0.01, carbs: 0.01, fiber: 0.01, netCarbs: 0.01, fat: 0.01 },
        forceWebSearch: false,
        source: 'photo',
    },
];

const clarificationCases = [
    {
        name: 'Unspecified Combo Drink',
        query: 'Chick-fil-A chicken sandwich meal with waffle fries and a drink',
        expectedQuestionIds: ['drink_type', 'drink_size'],
    },
    {
        name: 'Unspecified Sausage Link Size',
        query: '6x sausage links',
        expectedQuestionIds: ['sausage_size'],
    },
];

const visionCases = [
    {
        name: 'Visible Nutrition Facts Label Fixture',
        imagePath: 'tests/fixtures/food-label.png',
        imageContext: 'Nutrition Facts label visible; use the printed values for one whole container',
        photoContextDetails: {
            labelVisibility: 'nutrition-label-visible',
            portionMode: 'whole-item',
            portionDetail: '1 container',
        },
        expected: { calories: 160, protein: 14, carbs: 15, fat: 5, itemIncludes: [] },
        tolerance: { calories: 0.01, protein: 0.01, carbs: 0.01, fat: 0.01 },
    },
    {
        name: 'Whole Margherita Pizza Photo',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a3/Eq_it-na_pizza-margherita_sep2005_sml.jpg',
        imageContext: 'one whole Margherita pizza; estimate the entire visible pizza, not one slice',
        expected: { calories: 950, protein: 38, carbs: 120, fat: 34, itemIncludes: ['pizza'] },
        tolerance: { calories: 0.25, protein: 0.35, carbs: 0.35, fat: 0.40 },
    },
    {
        name: 'McDonald Big Mac Official Image',
        pageUrl: 'https://www.mcdonalds.com/us/en-us/product/big-mac.html',
        imageContext: "McDonald's Big Mac burger",
        expected: { calories: 580, itemIncludes: ['big mac'] },
        tolerance: { calories: 0.15 },
    },
    {
        name: 'Chick-fil-A Sandwich Official Image',
        pageUrl: 'https://www.chick-fil-a.com/menu/entrees/chick-fil-a-chicken-sandwich',
        imageContext: 'Chick-fil-A Chicken Sandwich',
        expected: { calories: 420, itemIncludes: ['chick', 'sandwich'] },
        tolerance: { calories: 0.15 },
    },
    {
        name: 'Taco Bell Crunchwrap Official Image',
        pageUrl: 'https://www.tacobell.com/food/specialties/crunchwrap-supreme',
        imageContext: 'Taco Bell Crunchwrap Supreme',
        expected: { calories: 540, itemIncludes: ['crunchwrap'] },
        tolerance: { calories: 0.18 },
    },
];

function requestBuffer(url, redirects = 0) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https:') ? https : http;
        const req = client.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 FuelFireTest/1.0',
                Accept: '*/*',
            },
        }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects < 5) {
                const nextUrl = new URL(res.headers.location, url).toString();
                res.resume();
                requestBuffer(nextUrl, redirects + 1).then(resolve).catch(reject);
                return;
            }

            if (res.statusCode !== 200) {
                res.resume();
                reject(new Error(`HTTP ${res.statusCode} for ${url}`));
                return;
            }

            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => resolve({
                buffer: Buffer.concat(chunks),
                contentType: res.headers['content-type'] || '',
                finalUrl: url,
            }));
        });

        req.on('error', reject);
        req.setTimeout(30000, () => {
            req.destroy(new Error(`Timeout fetching ${url}`));
        });
    });
}

async function resolveOpenGraphImage(pageUrl) {
    const { buffer } = await requestBuffer(pageUrl);
    const html = buffer.toString('utf8');
    const patterns = [
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
        /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
    ];

    for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match?.[1]) {
            return new URL(match[1].replace(/&amp;/g, '&'), pageUrl).toString();
        }
    }

    throw new Error(`No social image found on ${pageUrl}`);
}

function totalsFromFoods(foods = []) {
    return foods.reduce((totals, food) => {
        const quantity = Number(food.quantity || 1);
        const carbs = Number(food.carbs || 0);
        const fiber = Number(food.fiber || 0);
        const explicitNetCarbs = Number(food.netCarbs);
        totals.calories += Math.round(Number(food.calories || 0) * quantity);
        totals.protein += Math.round(Number(food.protein || 0) * quantity);
        totals.carbs += Math.round(carbs * quantity);
        totals.fiber += Math.round(fiber * quantity);
        totals.netCarbs += Math.round((Number.isFinite(explicitNetCarbs) ? explicitNetCarbs : Math.max(0, carbs - fiber)) * quantity);
        totals.fat += Math.round(Number(food.fat || 0) * quantity);
        return totals;
    }, { calories: 0, protein: 0, carbs: 0, fiber: 0, netCarbs: 0, fat: 0 });
}

function percentDiff(expected, actual) {
    if (expected === 0) return actual === 0 ? 0 : 1;
    return Math.abs(actual - expected) / expected;
}

function checkNutrition(expected, actual, tolerance) {
    const checks = {};
    for (const metric of Object.keys(expected)) {
        if (metric === 'itemIncludes') continue;
        const diff = percentDiff(expected[metric], actual[metric]);
        checks[metric] = {
            pass: diff <= (tolerance[metric] ?? 0.2),
            expected: expected[metric],
            actual: actual[metric],
            diff: Number((diff * 100).toFixed(1)),
        };
    }
    return checks;
}

function allChecksPassed(checks) {
    return Object.values(checks).every((check) => check.pass);
}

function printCaseResult(label, pass, details) {
    const icon = pass ? 'PASS' : 'FAIL';
    console.log(`${icon} ${label}: ${details}`);
}

async function runTextCase(testCase) {
    const response = await invokeApi(foodParserHandler, {
        headers: getTestAuthHeaders(),
        body: {
            query: testCase.query,
            source: testCase.source || 'realworld-test',
            forceWebSearch: testCase.forceWebSearch === true,
            alternatives: Array.isArray(testCase.alternatives) ? testCase.alternatives : [],
        },
    });

    const body = response.body;
    const totals = totalsFromFoods(body?.foods || []);
    const checks = checkNutrition(testCase.expected, totals, testCase.tolerance);
    const pass = response.status === 200 && body?.success && allChecksPassed(checks);

    printCaseResult(testCase.name, pass, `${totals.calories} cal, ${totals.protein}g protein, source=${body?.source || 'unknown'}`);

    return {
        type: 'text',
        name: testCase.name,
        query: testCase.query,
        sourceUrl: testCase.sourceUrl,
        pass,
        status: response.status,
        expected: testCase.expected,
        actual: totals,
        checks,
        foods: body?.foods || [],
        responseSource: body?.source || null,
        clarifyingQuestions: body?.clarifyingQuestions || [],
    };
}

async function runClarificationCase(testCase) {
    const response = await invokeApi(foodParserHandler, {
        headers: getTestAuthHeaders(),
        body: {
            query: testCase.query,
            source: 'realworld-test',
            forceWebSearch: testCase.forceWebSearch === true,
        },
    });

    const questionIds = (response.body?.clarifyingQuestions || []).map((question) => question.id);
    const pass = response.status === 200
        && testCase.expectedQuestionIds.every((id) => questionIds.includes(id));

    printCaseResult(testCase.name, pass, `questions=${questionIds.join(', ') || 'none'}`);

    return {
        type: 'clarification',
        name: testCase.name,
        query: testCase.query,
        pass,
        status: response.status,
        expectedQuestionIds: testCase.expectedQuestionIds,
        actualQuestionIds: questionIds,
        foods: response.body?.foods || [],
    };
}

async function runVisionCase(testCase) {
    const imagePath = testCase.imagePath ? path.resolve(testCase.imagePath) : null;
    const imageUrl = imagePath ? null : (testCase.imageUrl || await resolveOpenGraphImage(testCase.pageUrl));
    const image = imagePath
        ? { buffer: fs.readFileSync(imagePath), contentType: imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg' }
        : await requestBuffer(imageUrl);

    const response = await invokeApi(foodVisionHandler, {
        headers: getTestAuthHeaders(),
        body: {
            image: image.buffer.toString('base64'),
            mimeType: image.contentType.split(';')[0] || 'image/jpeg',
            imageContext: testCase.imageContext,
            photoContextDetails: testCase.photoContextDetails || {},
            fileName: imagePath ? path.basename(imagePath) : `${testCase.name}.jpg`,
            forceWebSearch: true,
        },
    });

    const body = response.body;
    const totals = totalsFromFoods(body?.foods || []);
    const checks = checkNutrition(testCase.expected, totals, testCase.tolerance);
    const foodText = (body?.foods || []).map((food) => `${food.name} ${food.matchedItem || ''}`).join(' ').toLowerCase();
    const includesPass = testCase.expected.itemIncludes.every((term) => foodText.includes(term));
    const pass = response.status === 200 && body?.success && allChecksPassed(checks) && includesPass;

    printCaseResult(testCase.name, pass, `${totals.calories} cal, lookup=${body?.lookupQuery || 'none'}, source=${body?.source || 'unknown'}`);

    return {
        type: 'vision',
        name: testCase.name,
        pageUrl: testCase.pageUrl,
        imagePath,
        imageUrl,
        pass,
        status: response.status,
        expected: testCase.expected,
        actual: totals,
        checks,
        includesPass,
        foods: body?.foods || [],
        responseSource: body?.source || null,
        lookupQuery: body?.lookupQuery || null,
    };
}

const server = await startApiTestServer({
    '/api/ai-food-parser': foodParserHandler,
    '/api/ai-food-vision': foodVisionHandler,
});
process.env.APP_BASE_URL = server.baseUrl;

const results = {
    generatedAt: new Date().toISOString(),
    parserBaseUrl: server.baseUrl,
    text: [],
    clarification: [],
    vision: [],
};

try {
    console.log('Running real-world text food parser cases...');
    for (const testCase of textCases) {
        results.text.push(await runTextCase(testCase));
    }

    console.log('\nRunning clarification guardrail cases...');
    for (const testCase of clarificationCases) {
        results.clarification.push(await runClarificationCase(testCase));
    }

    if (includeVision) {
        console.log('\nRunning official restaurant image cases...');
        const selectedVisionCases = visionCases.slice(0, visionLimit);
        console.log(`Live vision calls capped at ${selectedVisionCases.length}/${visionCases.length} case(s).`);
        for (const testCase of selectedVisionCases) {
            results.vision.push(await runVisionCase(testCase));
        }
    } else if (!textOnly) {
        console.log('\nSkipping live vision cases. Use --include-vision or npm run test:ai-food:vision:live to spend credits intentionally.');
    }
} finally {
    await server.close();
}

const allResults = [...results.text, ...results.clarification, ...results.vision];
const passCount = allResults.filter((result) => result.pass).length;
const outputPath = `${outputDir}/realworld-food-results-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

console.log(`\nReal-world food tests: ${passCount}/${allResults.length} passed.`);
console.log(`Saved details to ${outputPath}`);

if (passCount !== allResults.length) {
    process.exit(1);
}
