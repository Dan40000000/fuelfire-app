#!/usr/bin/env node
// AI Food Vision Accuracy Test Suite
// Tests the photo analysis API against known food images

import fs from 'fs';
import https from 'https';
import http from 'http';

const API_URL = process.env.API_URL || 'https://fuelfire-app.vercel.app';
const DELAY_BETWEEN_TESTS = 2000; // ms between API calls (vision is slower)

// Test images with known nutrition values
// Using publicly accessible food images from Wikipedia Commons
const testImages = [
    {
        name: "Whole Pizza (Margherita)",
        url: "https://upload.wikimedia.org/wikipedia/commons/a/a3/Eq_it-na_pizza-margherita_sep2005_sml.jpg",
        expected: {
            restaurant: null,
            itemName: "Pizza",
            calories: { min: 700, max: 1200 }, // whole pizza ~900-1000 cal
            protein: { min: 25, max: 50 },
        },
        tolerance: 0.25
    },
    {
        name: "Hamburger",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Hamburger_%28black_bg%29.jpg/1200px-Hamburger_%28black_bg%29.jpg",
        expected: {
            restaurant: null,
            itemName: "Hamburger",
            calories: { min: 250, max: 500 }, // typical range
            protein: { min: 12, max: 30 },
        },
        tolerance: 0.25
    },
    {
        name: "French Fries",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/French_Fries.JPG/1200px-French_Fries.JPG",
        expected: {
            restaurant: null,
            itemName: "Fries",
            calories: { min: 200, max: 550 }, // medium-large serving
            protein: { min: 2, max: 10 },
        },
        tolerance: 0.30
    },
    {
        name: "Hot Dog",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Hotdog_-_Evan_Swigart.jpg/1200px-Hotdog_-_Evan_Swigart.jpg",
        expected: {
            restaurant: null,
            itemName: "Hot Dog",
            calories: { min: 200, max: 400 }, // standard hot dog
            protein: { min: 8, max: 18 },
        },
        tolerance: 0.30
    },
    {
        name: "Caesar Salad",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Caesar_salad_%281%29.jpg/1200px-Caesar_salad_%281%29.jpg",
        expected: {
            restaurant: null,
            itemName: "Salad",
            calories: { min: 200, max: 500 }, // with dressing
            protein: { min: 5, max: 20 },
        },
        tolerance: 0.35
    },
    {
        name: "Donut",
        url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Glazed-Donut.jpg/1200px-Glazed-Donut.jpg",
        expected: {
            restaurant: null,
            itemName: "Donut",
            calories: { min: 180, max: 350 }, // glazed donut
            protein: { min: 2, max: 6 },
        },
        tolerance: 0.25
    }
];

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

// Download image and convert to base64
function downloadImageAsBase64(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;

        const request = protocol.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
        }, (response) => {
            // Handle redirects
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                return downloadImageAsBase64(response.headers.location).then(resolve).catch(reject);
            }

            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}`));
                return;
            }

            const chunks = [];
            response.on('data', chunk => chunks.push(chunk));
            response.on('end', () => {
                const buffer = Buffer.concat(chunks);
                const base64 = buffer.toString('base64');
                const contentType = response.headers['content-type'] || 'image/jpeg';
                resolve({ base64, mimeType: contentType });
            });
            response.on('error', reject);
        });

        request.on('error', reject);
        request.setTimeout(30000, () => {
            request.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

// Call the AI food vision API
async function callFoodVision(base64, mimeType) {
    try {
        const response = await fetch(`${API_URL}/api/ai-food-vision`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                image: base64,
                mimeType: mimeType
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        throw new Error(`API call failed: ${error.message}`);
    }
}

// Check if result is within range
function isWithinRange(actual, range) {
    return actual >= range.min && actual <= range.max;
}

// Run a single test
async function runTest(testCase, index) {
    const { name, url, expected, tolerance } = testCase;

    process.stdout.write(`  [${index + 1}/${testImages.length}] Testing: "${name}"... `);

    try {
        // Download image
        log('cyan', 'downloading...');
        const { base64, mimeType } = await downloadImageAsBase64(url);

        process.stdout.write(`    Analyzing with AI... `);

        // Call API
        const response = await callFoodVision(base64, mimeType);

        if (!response.success) {
            results.errors.push({
                name,
                expected,
                error: response.error || 'Analysis failed',
                response
            });
            log('red', `ERROR - ${response.error || 'Analysis failed'}`);
            return;
        }

        // Extract results
        const totalCalories = response.totalCalories || 0;
        const totalProtein = response.totalProtein || 0;
        const restaurant = response.restaurantIdentified || 'Unknown';
        const confidence = response.overallConfidence || 'unknown';
        const foods = response.foods || [];

        // Check calories are in expected range
        const caloriesPass = isWithinRange(totalCalories, expected.calories);
        const proteinPass = isWithinRange(totalProtein, expected.protein);

        // Check if restaurant was identified (if expected)
        const restaurantPass = !expected.restaurant ||
            restaurant.toLowerCase().includes(expected.restaurant.toLowerCase()) ||
            foods.some(f => f.restaurant?.toLowerCase().includes(expected.restaurant.toLowerCase()));

        const allPassed = caloriesPass && proteinPass;

        const result = {
            name,
            expected,
            actual: {
                calories: totalCalories,
                protein: totalProtein,
                restaurant,
                confidence,
                foods: foods.map(f => f.name)
            },
            checks: {
                calories: caloriesPass,
                protein: proteinPass,
                restaurant: restaurantPass
            }
        };

        if (allPassed) {
            results.passed.push(result);
            log('green', `PASS (${totalCalories} cal, ${totalProtein}g protein, ${confidence} confidence)`);
            if (foods.length > 0) {
                console.log(`      Foods identified: ${foods.map(f => f.name).join(', ')}`);
            }
        } else {
            results.failed.push(result);
            log('red', `FAIL`);
            console.log(`      Expected: ${expected.calories.min}-${expected.calories.max} cal`);
            console.log(`      Got: ${totalCalories} cal, ${totalProtein}g protein`);
            console.log(`      Foods: ${foods.map(f => f.name).join(', ')}`);
        }

    } catch (error) {
        results.errors.push({
            name,
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
    logBold('  AI Food Vision Accuracy Test Suite');
    logBold('========================================\n');

    log('cyan', `API URL: ${API_URL}`);
    log('cyan', `Total tests: ${testImages.length}`);
    log('cyan', `Starting tests...\n`);

    results.startTime = new Date();
    results.totalTests = testImages.length;

    for (let i = 0; i < testImages.length; i++) {
        await runTest(testImages[i], i);

        // Delay between API calls
        if (i < testImages.length - 1) {
            await sleep(DELAY_BETWEEN_TESTS);
        }
    }

    results.endTime = new Date();

    printSummary();
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

    if (results.failed.length > 0) {
        logBold('\n  FAILED TESTS:');
        results.failed.forEach((f, i) => {
            console.log(`    ${i + 1}. ${f.name}`);
            console.log(`       Expected: ${f.expected.calories.min}-${f.expected.calories.max} cal`);
            console.log(`       Got: ${f.actual.calories} cal`);
        });
    }

    if (results.errors.length > 0) {
        logBold('\n  ERRORS:');
        results.errors.forEach((e, i) => {
            console.log(`    ${i + 1}. ${e.name}: ${e.error}`);
        });
    }

    log('cyan', '\n  Note: Vision tests use product images from restaurant websites.');
    log('cyan', '  Real-world accuracy may vary with photo quality and lighting.\n');
}

// Main execution
runAllTests().catch(error => {
    log('red', `Fatal error: ${error.message}`);
    process.exit(1);
});
