#!/usr/bin/env node
// AI Food Parser Accuracy Test Suite
// Tests the AI food parsing against known nutrition data

import fs from 'fs';
import { testFoods, testCategories } from './nutrition-test-data.js';

const API_URL = process.env.API_URL || 'https://fuelfire-app.vercel.app';
const DELAY_BETWEEN_TESTS = 500; // ms between API calls to avoid rate limiting

// Results storage
const results = {
    passed: [],
    failed: [],
    errors: [],
    totalTests: 0,
    startTime: null,
    endTime: null
};

// Color codes for terminal output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logBold(message) {
    console.log(`${colors.bold}${message}${colors.reset}`);
}

// Calculate percentage difference
function percentDiff(expected, actual) {
    if (expected === 0) return actual === 0 ? 0 : 100;
    return Math.abs((actual - expected) / expected) * 100;
}

// Check if result is within tolerance
function isWithinTolerance(expected, actual, tolerance) {
    const diff = percentDiff(expected, actual);
    return diff <= (tolerance * 100);
}

// Call the AI food parser API
async function callFoodParser(query) {
    try {
        const response = await fetch(`${API_URL}/api/ai-food-parser`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query, source: 'test' })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        throw new Error(`API call failed: ${error.message}`);
    }
}

// Calculate total nutrition from multiple food items
function calculateTotals(foods) {
    return foods.reduce((totals, food) => {
        const qty = food.quantity || 1;
        return {
            calories: Math.round(totals.calories + (food.calories * qty)),
            protein: Math.round(totals.protein + (food.protein * qty)),
            carbs: Math.round(totals.carbs + (food.carbs * qty)),
            fat: Math.round(totals.fat + (food.fat * qty))
        };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

// Run a single test
async function runTest(testCase, index) {
    const { query, expected, tolerance, source, isCombo } = testCase;

    process.stdout.write(`  [${index + 1}/${testFoods.length}] Testing: "${query.substring(0, 40)}${query.length > 40 ? '...' : ''}"... `);

    try {
        const response = await callFoodParser(query);

        if (!response.success || !response.foods || response.foods.length === 0) {
            results.errors.push({
                query,
                expected,
                error: 'No foods returned',
                response
            });
            log('red', 'ERROR - No foods returned');
            return;
        }

        // Calculate totals from all returned foods
        const totals = calculateTotals(response.foods);

        // Check each macro against expected
        const checks = {
            calories: isWithinTolerance(expected.calories, totals.calories, tolerance),
            protein: isWithinTolerance(expected.protein, totals.protein, tolerance),
            carbs: isWithinTolerance(expected.carbs, totals.carbs, tolerance),
            fat: isWithinTolerance(expected.fat, totals.fat, tolerance)
        };

        const allPassed = checks.calories && checks.protein && checks.carbs && checks.fat;

        const result = {
            query,
            expected,
            actual: totals,
            foods: response.foods,
            tolerance,
            source,
            checks,
            caloriesDiff: percentDiff(expected.calories, totals.calories).toFixed(1),
            proteinDiff: percentDiff(expected.protein, totals.protein).toFixed(1),
            carbsDiff: percentDiff(expected.carbs, totals.carbs).toFixed(1),
            fatDiff: percentDiff(expected.fat, totals.fat).toFixed(1)
        };

        if (allPassed) {
            results.passed.push(result);
            log('green', `PASS (${totals.calories} cal, ±${result.caloriesDiff}%)`);
        } else {
            results.failed.push(result);
            log('red', `FAIL - Expected ${expected.calories} cal, got ${totals.calories} cal (${result.caloriesDiff}% off)`);
        }

    } catch (error) {
        results.errors.push({
            query,
            expected,
            error: error.message
        });
        log('red', `ERROR - ${error.message}`);
    }
}

// Sleep function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Run all tests
async function runAllTests() {
    logBold('\n========================================');
    logBold('  AI Food Parser Accuracy Test Suite');
    logBold('========================================\n');

    log('cyan', `API URL: ${API_URL}`);
    log('cyan', `Total tests: ${testFoods.length}`);
    log('cyan', `Starting tests...\n`);

    results.startTime = new Date();
    results.totalTests = testFoods.length;

    for (let i = 0; i < testFoods.length; i++) {
        await runTest(testFoods[i], i);

        // Small delay between API calls
        if (i < testFoods.length - 1) {
            await sleep(DELAY_BETWEEN_TESTS);
        }
    }

    results.endTime = new Date();

    printSummary();
    printDetailedFailures();
    printCategoryBreakdown();
    saveResults();
}

// Print summary
function printSummary() {
    const duration = (results.endTime - results.startTime) / 1000;
    const passRate = ((results.passed.length / results.totalTests) * 100).toFixed(1);

    logBold('\n========================================');
    logBold('           TEST SUMMARY');
    logBold('========================================\n');

    log('green', `  PASSED: ${results.passed.length}/${results.totalTests} (${passRate}%)`);
    log('red', `  FAILED: ${results.failed.length}/${results.totalTests}`);
    log('yellow', `  ERRORS: ${results.errors.length}/${results.totalTests}`);
    log('cyan', `  Duration: ${duration.toFixed(1)}s`);

    // Average calorie accuracy for passed tests
    if (results.passed.length > 0) {
        const avgCalorieDiff = results.passed.reduce((sum, r) => sum + parseFloat(r.caloriesDiff), 0) / results.passed.length;
        log('blue', `  Avg calorie accuracy: ±${avgCalorieDiff.toFixed(1)}%`);
    }
}

// Print detailed failure information
function printDetailedFailures() {
    if (results.failed.length === 0) return;

    logBold('\n========================================');
    logBold('         FAILED TESTS DETAILS');
    logBold('========================================\n');

    results.failed.forEach((result, i) => {
        console.log(`${i + 1}. "${result.query}"`);
        console.log(`   Expected: ${result.expected.calories} cal | ${result.expected.protein}g P | ${result.expected.carbs}g C | ${result.expected.fat}g F`);
        console.log(`   Actual:   ${result.actual.calories} cal | ${result.actual.protein}g P | ${result.actual.carbs}g C | ${result.actual.fat}g F`);
        console.log(`   Diff:     ${result.caloriesDiff}% cal | ${result.proteinDiff}% P | ${result.carbsDiff}% C | ${result.fatDiff}% F`);
        console.log(`   Foods returned: ${result.foods.map(f => f.name).join(', ')}`);
        console.log(`   Tolerance: ${(result.tolerance * 100).toFixed(0)}%`);
        console.log('');
    });
}

// Print category breakdown
function printCategoryBreakdown() {
    logBold('\n========================================');
    logBold('       ACCURACY BY CATEGORY');
    logBold('========================================\n');

    for (const [category, tests] of Object.entries(testCategories)) {
        if (tests.length === 0) continue;

        const categoryQueries = tests.map(t => t.query);
        const passed = results.passed.filter(r => categoryQueries.includes(r.query)).length;
        const failed = results.failed.filter(r => categoryQueries.includes(r.query)).length;
        const errors = results.errors.filter(r => categoryQueries.includes(r.query)).length;
        const total = tests.length;
        const passRate = ((passed / total) * 100).toFixed(0);

        const color = passed === total ? 'green' : (passed > total / 2 ? 'yellow' : 'red');
        log(color, `  ${category}: ${passed}/${total} (${passRate}%)`);
    }
}

// Save results to file
function saveResults() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `test-results-${timestamp}.json`;

    const reportData = {
        timestamp: new Date().toISOString(),
        apiUrl: API_URL,
        summary: {
            total: results.totalTests,
            passed: results.passed.length,
            failed: results.failed.length,
            errors: results.errors.length,
            passRate: ((results.passed.length / results.totalTests) * 100).toFixed(1) + '%',
            duration: ((results.endTime - results.startTime) / 1000).toFixed(1) + 's'
        },
        passed: results.passed,
        failed: results.failed,
        errors: results.errors
    };

    // Write to file
    const filePath = new URL(`./${filename}`, import.meta.url);
    fs.writeFileSync(filePath, JSON.stringify(reportData, null, 2));
    log('cyan', `\nResults saved to: tests/${filename}`);
}

// Main execution
runAllTests().catch(error => {
    log('red', `Fatal error: ${error.message}`);
    process.exit(1);
});
