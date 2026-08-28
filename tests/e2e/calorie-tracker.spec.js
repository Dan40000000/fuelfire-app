import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { expectInsideViewport, localDateKey, seedPaidAiAccess } from './helpers.js';

const fixtureDir = path.resolve(process.cwd(), 'tests/fixtures');

test.beforeEach(async ({ page }) => {
    await seedPaidAiAccess(page);
});

test('page exposes one page-title heading', async ({ page }) => {
    await page.goto('/calorie-tracker.html');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1, name: 'Calorie Tracker' })).toBeVisible();
});

test('manual food entry persists valid nutrition and timestamp data', async ({ page }) => {
    const date = localDateKey();
    await page.goto('/calorie-tracker.html');
    await page.evaluate(() => {
        window.showSmartEntry();
        window.showManualEntry();
    });

    await page.locator('#manual-food-name').fill('Test Greek Yogurt');
    await page.locator('#manual-calories').fill('160');
    await page.locator('#manual-protein').fill('14');
    await page.locator('#manual-carbs').fill('15');
    await page.locator('#manual-fiber').fill('1');
    await page.locator('#manual-fat').fill('5');
    await page.locator('#manual-sugar').fill('11');

    page.on('dialog', async (dialog) => {
        if (dialog.type() === 'prompt') await dialog.accept('1');
        else await dialog.accept();
    });
    await page.getByRole('button', { name: 'Add Food' }).click();

    await expect(page.locator('#calories-today')).toHaveText('160');
    await expect(page.locator('#today-meals')).toContainText('Test Greek Yogurt');
    await expect(page.locator('#today-meals')).not.toContainText('Invalid Date');

    const saved = await page.evaluate((dateKey) => JSON.parse(localStorage.getItem('fuelfire_logged_meals'))[dateKey].meals[0], date);
    expect(saved).toMatchObject({
        name: 'Test Greek Yogurt', type: 'breakfast', calories: 160,
        protein: 14, carbs: 15, fiber: 1, netCarbs: 14, fat: 5, sugar: 11,
    });
    expect(Number.isNaN(Date.parse(saved.time))).toBe(false);
});

test('editing quantity recalculates calories and every macro', async ({ page }) => {
    const date = localDateKey();
    await page.addInitScript(({ dateKey }) => {
        localStorage.setItem('fuelfire_logged_meals', JSON.stringify({
            [dateKey]: {
                totalCalories: 200,
                meals: [{
                    name: 'Test Protein Shake', type: 'breakfast', time: new Date().toISOString(),
                    quantity: 1, serving: '1 bottle', calories: 200, protein: 30,
                    carbs: 8, fiber: 2, netCarbs: 6, fat: 4, sugar: 3,
                    baseNutrition: { calories: 200, protein: 30, carbs: 8, fiber: 2, netCarbs: 6, fat: 4, sugar: 3 },
                }],
            },
        }));
    }, { dateKey: date });

    await page.goto('/calorie-tracker.html');
    await expect(page.locator('#calories-today')).toHaveText('200');
    await page.locator('button[onclick="editMeal(0)"]').click();
    await expect(page.locator('#edit-meal-modal')).toBeVisible();

    await page.locator('#edit-quantity').fill('2');
    await expect(page.locator('#edit-calories')).toHaveValue('400');
    await expect(page.locator('#edit-protein')).toHaveValue('60');
    await expect(page.locator('#edit-carbs')).toHaveValue('16');
    await expect(page.locator('#edit-fiber')).toHaveValue('4');
    await expect(page.locator('#edit-fat')).toHaveValue('8');
    await expect(page.locator('#edit-sugar')).toHaveValue('6');

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.locator('#calories-today')).toHaveText('400');

    const saved = await page.evaluate((dateKey) => JSON.parse(localStorage.getItem('fuelfire_logged_meals'))[dateKey].meals[0], date);
    expect(saved).toMatchObject({ quantity: 2, calories: 400, protein: 60, carbs: 16, fiber: 4, netCarbs: 12, fat: 8, sugar: 6 });
    const memory = await page.evaluate(() => JSON.parse(localStorage.getItem('fuelfire_learned_foods') || '[]'));
    expect(memory[0]).toMatchObject({ name: 'Test Protein Shake', correctionCount: 0, acceptedCount: 1, memoryAction: 'accepted' });
});

test('voice review supports multiple editable foods without a live AI call', async ({ page }) => {
    await page.route('**/api/ai-food-parser', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                source: 'test-fixture',
                foods: [
                    { name: 'Egg', calories: 70, protein: 6, carbs: 0, fiber: 0, netCarbs: 0, fat: 5, sugar: 0, quantity: 2, serving: '1 large egg', confidence: 'high', sourceType: 'database' },
                    { name: 'Blueberry Muffin', calories: 135, protein: 2, carbs: 31, fiber: 1, netCarbs: 30, fat: 1, sugar: 15, quantity: 4, serving: '1 standard muffin', confidence: 'medium', sourceType: 'database' },
                ],
            }),
        });
    });

    await page.goto('/calorie-tracker.html');
    await page.evaluate(() => {
        window.openVoiceModal();
        return window.searchFoodByVoice('2 eggs and 4 standard blueberry muffins');
    });

    await expect(page.locator('.food-checkbox')).toHaveCount(2);
    await expect(page.locator('.food-name-edit')).toHaveCount(2);
    await page.locator('.food-name-edit').first().fill('Free-range Eggs');
    await expect(page.locator('#voice-button')).toHaveText('Log Selected Foods');
});

test('voice branded lookup ignores generic saved sausage and keeps the official item', async ({ page }) => {
    let requestBody;
    await page.addInitScript(() => {
        localStorage.setItem('fuelfire_learned_foods', JSON.stringify([{
            key: 'sausage', name: 'Sausage', serving: '1 serving',
            calories: 170, protein: 10, carbs: 2, fiber: 0, netCarbs: 2, fat: 13, sugar: 1,
            baseNutrition: { calories: 170, protein: 10, carbs: 2, fiber: 0, netCarbs: 2, fat: 13, sugar: 1 },
            count: 4, correctionCount: 1, memoryAction: 'corrected', evidenceTier: 95,
            aliases: ['sausage'], source: 'user correction',
        }]));
    });
    await page.route('**/api/ai-food-parser', async (route) => {
        requestBody = route.request().postDataJSON();
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                source: 'database',
                foods: [{
                    name: "McDonald's Sausage McMuffin with Egg", calories: 480, protein: 21,
                    carbs: 29, fiber: 2, netCarbs: 27, fat: 31, sugar: 2, quantity: 1,
                    serving: '1 sandwich', confidence: 'high', sourceType: 'official',
                    source: "McDonald's Official Nutrition",
                }],
            }),
        });
    });

    await page.goto('/calorie-tracker.html');
    await page.evaluate(() => {
        window.openVoiceModal();
        return window.searchFoodByVoice("McDonald's sausage egg McMuffin");
    });

    await expect(page.locator('.food-name-edit')).toHaveValue("McDonald's Sausage McMuffin with Egg");
    await expect(page.locator('#food-results')).toContainText('480 cal');
    expect(requestBody).toMatchObject({ source: 'voice' });
    expect(requestBody.foodMemoryHints).toEqual([]);
});

test('typed AI lookup uses the resolver, supports name correction, and logs the selected item', async ({ page }) => {
    const date = localDateKey();
    let requestBody;
    await page.addInitScript(() => {
        localStorage.setItem('fuelfire_learned_foods', JSON.stringify([{
            key: 'sausage', name: 'Sausage', serving: '1 serving',
            calories: 170, protein: 10, carbs: 2, fiber: 0, netCarbs: 2, fat: 13, sugar: 1,
            baseNutrition: { calories: 170, protein: 10, carbs: 2, fiber: 0, netCarbs: 2, fat: 13, sugar: 1 },
            count: 4, correctionCount: 1, memoryAction: 'corrected', evidenceTier: 95,
            aliases: ['sausage'], source: 'user correction',
        }]));
    });
    await page.route('**/api/ai-food-parser', async (route) => {
        requestBody = route.request().postDataJSON();
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                source: 'database',
                foods: [{
                    name: "McDonald's Sausage McMuffin with Egg", calories: 480, protein: 21,
                    carbs: 29, fiber: 2, netCarbs: 27, fat: 31, sugar: 2, quantity: 1,
                    serving: '1 sandwich', confidence: 'high', sourceType: 'official',
                    source: "McDonald's Official Nutrition",
                }],
            }),
        });
    });

    await page.goto('/calorie-tracker.html');
    await page.evaluate(() => {
        window.requireAIAccess = () => true;
        window.showSmartEntry();
        return window.searchFood("McDonald's sausage egg McMuffin");
    });

    const nameInput = page.locator('.manual-food-name-edit');
    await expect(nameInput).toHaveValue("McDonald's Sausage McMuffin with Egg");
    await nameInput.fill("McDonald's Breakfast Sandwich");
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByText('Log Selected Foods', { exact: false }).click();

    expect(requestBody).toMatchObject({ source: 'search' });
    expect(requestBody.foodMemoryHints).toEqual([]);
    const saved = await page.evaluate((dateKey) => JSON.parse(localStorage.getItem('fuelfire_logged_meals'))[dateKey].meals[0], date);
    expect(saved).toMatchObject({
        name: "McDonald's Breakfast Sandwich",
        calories: 480,
        protein: 21,
        carbs: 29,
        fat: 31,
        serving: '1 sandwich',
    });
});

test('saved usual meal resolves locally and preserves every component', async ({ page }) => {
    let apiCalls = 0;
    await page.route('**/api/ai-food-parser', async (route) => {
        apiCalls += 1;
        await route.abort();
    });
    await page.goto('/calorie-tracker.html');
    await page.evaluate(() => {
        const bundle = window.FoodPersonalization.createMealBundle('Usual breakfast', [
            {
                name: '2x Eggs', quantity: 2, serving: '1 large egg', calories: 140, protein: 12,
                carbs: 2, fiber: 0, netCarbs: 2, fat: 10, sugar: 0,
                baseNutrition: { calories: 70, protein: 6, carbs: 1, fiber: 0, netCarbs: 1, fat: 5, sugar: 0 },
            },
            {
                name: '3x Small Sausage Links', quantity: 3, serving: '1 small link', calories: 170, protein: 10,
                carbs: 2, fiber: 0, netCarbs: 2, fat: 13, sugar: 1,
                baseNutrition: { calories: 56.67, protein: 3.33, carbs: 0.67, fiber: 0, netCarbs: 0.67, fat: 4.33, sugar: 0.33 },
            },
        ], 'breakfast');
        localStorage.setItem('fuelfire_saved_meal_bundles_v1', JSON.stringify([bundle]));
        window.openVoiceModal();
        window.searchFoodByVoice('log my usual breakfast');
    });

    await expect(page.locator('.food-checkbox')).toHaveCount(2);
    await expect(page.locator('.food-name-edit').first()).toHaveValue('Eggs');
    await expect(page.locator('.food-quantity').first()).toHaveValue('2');
    expect(apiCalls).toBe(0);
});

test('voice resolves two tuna and cracker questions by chips with affected-food query rewrites', async ({ page }) => {
    const requests = [];
    await page.route('**/api/ai-food-parser', async (route) => {
        const body = route.request().postDataJSON();
        requests.push(body);
        const refined = /canned tuna in water/i.test(body.query) && /10 crackers/i.test(body.query);
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                foods: refined ? [
                    { name: 'Canned Tuna in Water', calories: 120, protein: 26, carbs: 0, fiber: 0, netCarbs: 0, fat: 1, sugar: 0, quantity: 1, serving: '1 can', confidence: 'high', sourceType: 'database' },
                    { name: 'Crackers', calories: 150, protein: 3, carbs: 24, fiber: 1, netCarbs: 23, fat: 5, sugar: 2, quantity: 1, serving: '10 crackers', confidence: 'high', sourceType: 'database' },
                ] : [
                    { name: 'Canned Tuna', calories: 150, protein: 25, carbs: 0, fiber: 0, netCarbs: 0, fat: 6, sugar: 0, quantity: 1, confidence: 'high', sourceType: 'database' },
                    { name: 'Crackers', calories: 90, protein: 2, carbs: 14, fiber: 1, netCarbs: 13, fat: 3, sugar: 1, quantity: 1, confidence: 'high', sourceType: 'database' },
                ],
                clarifyingQuestions: refined ? [] : [
                    {
                        id: 'tuna_packing_liquid', question: 'Was the canned tuna packed in water or oil?',
                        reason: 'Oil materially changes calories.', examples: ['Water', 'Oil'], affectedFood: 'canned tuna',
                        answerType: 'single-choice-or-voice', acceptsVoice: true, estimatedCalorieImpact: 70,
                    },
                    {
                        id: 'cracker_count', question: 'How many crackers did you eat?',
                        reason: 'The count changes the total.', examples: ['6', '10', '15'], affectedFood: 'crackers',
                        answerType: 'number', acceptsVoice: true, estimatedCalorieImpact: 90,
                    },
                ],
            }),
        });
    });

    await page.goto('/calorie-tracker.html');
    await page.evaluate(() => {
        window.openVoiceModal();
        window.searchFoodByVoice('canned tuna and crackers');
    });
    await expect(page.locator('#food-clarification')).toBeVisible();
    await expect(page.locator('#clarification-question-heading')).toContainText('packed in water or oil');
    await page.getByRole('button', { name: 'Answer question 1 with Water' }).click();
    await expect(page.locator('#food-clarification')).toContainText('Question 2 of 2');
    await page.getByRole('button', { name: 'Answer question 2 with 10' }).click();
    await expect(page.locator('.food-checkbox')).toHaveCount(2);
    expect(requests).toHaveLength(2);
    expect(requests[1].query).toMatch(/canned tuna in water/i);
    expect(requests[1].query).toMatch(/10 crackers/i);
    expect(requests[1].query).not.toMatch(/10 canned tuna/i);
});

test('current clarification accepts a stubbed spoken answer without starting a new food query', async ({ page }) => {
    const requests = [];
    await page.route('**/api/ai-food-parser', async (route) => {
        const body = route.request().postDataJSON();
        requests.push(body);
        const refined = /canned tuna in oil/i.test(body.query);
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                foods: [{ name: refined ? 'Canned Tuna in Oil' : 'Canned Tuna', calories: refined ? 190 : 150, protein: 25, carbs: 0, fiber: 0, netCarbs: 0, fat: refined ? 9 : 5, sugar: 0, quantity: 1, confidence: 'high', sourceType: 'database' }],
                clarifyingQuestions: refined ? [] : [{
                    id: 'tuna_packing_liquid', question: 'Was the tuna packed in water or oil?', examples: ['Water', 'Oil'],
                    reason: 'Packing liquid changes calories.', affectedFood: 'tuna', answerType: 'single-choice-or-voice', acceptsVoice: true,
                }],
            }),
        });
    });

    await page.goto('/calorie-tracker.html');
    await page.evaluate(() => {
        window.openVoiceModal();
        window.searchFoodByVoice('canned tuna');
    });
    await expect(page.getByRole('button', { name: 'Answer question 1 by voice' })).toBeVisible();
    const accepted = await page.evaluate(() => window.submitClarificationVoiceAnswer('oil'));
    expect(accepted).toBe(true);
    await expect(page.locator('.food-name-edit')).toHaveValue('Canned Tuna in Oil');
    expect(requests).toHaveLength(2);
    expect(requests[1].query).toMatch(/canned tuna in oil/i);
});

test('skipping a material voice question blocks terminal auto-log and keeps review confirmation', async ({ page }) => {
    const date = localDateKey();
    let calls = 0;
    await page.route('**/api/ai-food-parser', async (route) => {
        calls += 1;
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                foods: [{ name: 'Canned Tuna', calories: 150, protein: 25, carbs: 0, fiber: 0, netCarbs: 0, fat: 5, sugar: 0, quantity: 1, confidence: 'high', sourceType: 'database' }],
                clarifyingQuestions: [{
                    id: 'tuna_packing_liquid', question: 'Was the tuna packed in water or oil?', examples: ['Water', 'Oil'],
                    reason: 'Packing liquid materially changes calories.', affectedFood: 'tuna', answerType: 'single-choice-or-voice', acceptsVoice: true,
                }],
            }),
        });
    });

    await page.goto('/calorie-tracker.html');
    await page.evaluate(() => {
        window.openVoiceModal();
        window.searchFoodByVoice('canned tuna and log as lunch');
    });
    await page.getByRole('button', { name: 'Skip question' }).click();
    await expect(page.locator('#meal-type-select')).toHaveValue('lunch');
    await expect(page.locator('#food-results')).toContainText('Review required');
    await expect(page.locator('#voice-live-status')).toContainText('Automatic logging was stopped');
    const meals = await page.evaluate((dateKey) => JSON.parse(localStorage.getItem('fuelfire_logged_meals') || '{}')[dateKey]?.meals || [], date);
    expect(meals).toEqual([]);
    expect(calls).toBe(1);
});

test('voice meal intent parser strips only recognized terminal commands', async ({ page }) => {
    await page.goto('/calorie-tracker.html');
    const intents = await page.evaluate(() => [
        window.extractVoiceMealLogIntent('2 eggs and log as lunch'),
        window.extractVoiceMealLogIntent('log turkey sandwich as dinner'),
        window.extractVoiceMealLogIntent('2 eggs for dinner'),
        window.extractVoiceMealLogIntent('turkey lunch meat'),
    ]);
    expect(intents).toEqual([
        { foodQuery: '2 eggs', mealType: 'lunch', shouldAutoLog: true },
        { foodQuery: 'turkey sandwich', mealType: 'dinner', shouldAutoLog: true },
        { foodQuery: '2 eggs', mealType: 'dinner', shouldAutoLog: false },
        { foodQuery: 'turkey lunch meat', mealType: null, shouldAutoLog: false },
    ]);
});

test('exact high-confidence voice command logs lunch once with returned macros and persistent status', async ({ page }) => {
    const date = localDateKey();
    let requestBody;
    await page.route('**/api/ai-food-parser', async (route) => {
        requestBody = route.request().postDataJSON();
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                foods: [{
                    name: 'Quick calorie entry', calories: 700, protein: 50, carbs: 60, fiber: 0,
                    netCarbs: 60, fat: 25, sugar: 0, quantity: 1, serving: '1 entry',
                    confidence: 'high', sourceType: 'official', nutritionBasis: 'user-provided',
                }],
            }),
        });
    });

    await page.goto('/calorie-tracker.html');
    await page.evaluate(() => {
        window.openVoiceModal();
        return window.searchFoodByVoice('700 calories 50 grams protein 60 grams carbs 25 grams fat log as lunch');
    });

    expect(requestBody.query).toBe('700 calories 50 grams protein 60 grams carbs 25 grams fat');
    await expect(page.locator('#voice-modal')).not.toHaveAttribute('open', '');
    const meals = await page.evaluate((dateKey) => JSON.parse(localStorage.getItem('fuelfire_logged_meals'))[dateKey].meals, date);
    expect(meals).toHaveLength(1);
    expect(meals[0]).toMatchObject({ type: 'lunch', calories: 700, protein: 50, carbs: 60, fat: 25 });
    await expect(page.locator('#voice-live-status')).toHaveText('Logged 1 item to Lunch: 700 calories, 50g protein, 60g carbs, 25g fat.');
});

test('trailing meal context strips from lookup and preselects dinner without auto logging', async ({ page }) => {
    const date = localDateKey();
    let requestBody;
    await page.route('**/api/ai-food-parser', async (route) => {
        requestBody = route.request().postDataJSON();
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                foods: [{ name: 'Eggs', calories: 140, protein: 12, carbs: 1, fiber: 0, netCarbs: 1, fat: 10, sugar: 0, quantity: 1, confidence: 'high', sourceType: 'database' }],
            }),
        });
    });

    await page.goto('/calorie-tracker.html');
    await page.evaluate(() => {
        window.openVoiceModal();
        return window.searchFoodByVoice('2 eggs for dinner');
    });

    expect(requestBody.query).toBe('2 eggs');
    await expect(page.locator('#voice-modal')).toHaveAttribute('open', '');
    await expect(page.locator('#meal-type-select')).toHaveValue('dinner');
    await expect(page.locator('#voice-live-status')).toContainText('Dinner preselected');
    const stored = await page.evaluate((dateKey) => JSON.parse(localStorage.getItem('fuelfire_logged_meals') || '{}')[dateKey]?.meals || [], date);
    expect(stored).toEqual([]);
});

test('uncertain estimate blocks explicit voice auto log and announces review', async ({ page }) => {
    const date = localDateKey();
    await page.route('**/api/ai-food-parser', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                foods: [{
                    name: 'Mystery Sausage', calories: 230, protein: 11, carbs: 4, fiber: 0,
                    netCarbs: 4, fat: 19, sugar: 1, quantity: 1, sourceType: 'estimate',
                    needsVerification: true, nutritionWarnings: ['Brand not verified'],
                }],
            }),
        });
    });

    await page.goto('/calorie-tracker.html');
    await page.evaluate(() => {
        window.openVoiceModal();
        return window.searchFoodByVoice('mystery sausage and log as lunch');
    });

    await expect(page.locator('#voice-modal')).toHaveAttribute('open', '');
    await expect(page.locator('#meal-type-select')).toHaveValue('lunch');
    await expect(page.locator('#food-results')).toContainText('Review required');
    await expect(page.locator('#voice-live-status')).toContainText('Review required');
    const stored = await page.evaluate((dateKey) => JSON.parse(localStorage.getItem('fuelfire_logged_meals') || '{}')[dateKey]?.meals || [], date);
    expect(stored).toEqual([]);
});

test('voice commit rejects invalid quantity and remains idempotent after correction', async ({ page }) => {
    const date = localDateKey();
    await page.route('**/api/ai-food-parser', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                foods: [{ name: 'Egg', calories: 70, protein: 6, carbs: 0, fiber: 0, netCarbs: 0, fat: 5, sugar: 0, quantity: 1, confidence: 'medium', sourceType: 'database' }],
            }),
        });
    });

    await page.goto('/calorie-tracker.html');
    await page.evaluate(() => {
        window.openVoiceModal();
        return window.searchFoodByVoice('egg');
    });
    await page.locator('.food-quantity').fill('-1');
    await page.locator('#voice-button').click();
    await expect(page.locator('#voice-modal')).toHaveAttribute('open', '');
    await expect(page.locator('.food-quantity')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#voice-live-alert')).toContainText('0.25 to 20');
    let stored = await page.evaluate((dateKey) => JSON.parse(localStorage.getItem('fuelfire_logged_meals') || '{}')[dateKey]?.meals || [], date);
    expect(stored).toEqual([]);

    await page.locator('.food-quantity').fill('2');
    await page.evaluate(() => {
        window.commitVoiceReview();
        window.commitVoiceReview();
    });
    stored = await page.evaluate((dateKey) => JSON.parse(localStorage.getItem('fuelfire_logged_meals'))[dateKey].meals, date);
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ name: '2x Egg', quantity: 2, calories: 140, protein: 12, fat: 10 });
});

test('open voice review dialog has an accessible name, labeled fields, and no critical axe findings', async ({ page }) => {
    await page.route('**/api/ai-food-parser', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                foods: [{ name: 'Egg', calories: 70, protein: 6, carbs: 0, fiber: 0, netCarbs: 0, fat: 5, sugar: 0, quantity: 1, confidence: 'medium', sourceType: 'database' }],
            }),
        });
    });
    await page.goto('/calorie-tracker.html');
    await page.evaluate(() => { window.requireAIAccess = () => true; });
    const trigger = page.getByRole('button', { name: 'Voice', exact: true });
    await expect(trigger).toHaveAttribute('aria-controls', 'voice-modal');
    await trigger.click();
    await expect(page.locator('#voice-close-button')).toBeFocused();
    await expect(page.locator('#voice-modal #voice-live-status')).toHaveCount(1);
    await expect(page.locator('#voice-modal #voice-live-alert')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await page.evaluate(() => {
        window.openVoiceModal(document.getElementById('voice-log-trigger'));
        return window.searchFoodByVoice('egg');
    });

    const dialog = page.getByRole('dialog', { name: 'Voice Logging' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Add food context (optional)')).toBeVisible();
    await expect(dialog.getByLabel('Include Egg')).toBeChecked();
    await expect(dialog.getByLabel('Food name for Egg')).toBeVisible();
    await expect(dialog.getByLabel('Quantity for Egg')).toBeVisible();
    await expect(dialog.getByLabel('Which meal?')).toHaveValue('breakfast');
    await dialog.getByLabel('Food name for Egg').fill('Free-range Egg');
    await expect(dialog.getByLabel('Include Free-range Egg')).toBeChecked();
    await expect(dialog.getByLabel('Food name for Free-range Egg')).toBeVisible();
    await expect(dialog.getByLabel('Quantity for Free-range Egg')).toBeVisible();
    await expect(dialog.locator('legend').first()).toContainText('Item 1: Free-range Egg');
    await expect(dialog.locator('#food-results')).toContainText('Protein: 6g');
    await expect(dialog.locator('#food-results')).not.toContainText(/\bP:\s|\bC:\s|\bNet:\s|\bF:\s|\bS:\s/);
    const results = await new AxeBuilder({ page }).include('#voice-modal').analyze();
    const critical = results.violations.filter((violation) => violation.impact === 'critical');
    expect(critical, critical.map((item) => `${item.id}: ${item.help}`).join('\n')).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
});

test('foreground restaurant location is coarse, opt-in, and not stored with the meal', async ({ page }) => {
    let requestBody;
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'geolocation', {
            configurable: true,
            value: {
                getCurrentPosition(success) {
                    success({ coords: { latitude: 39.739236, longitude: -104.990251, accuracy: 31.8 } });
                },
            },
        });
    });
    await page.route('**/api/ai-food-parser', async (route) => {
        requestBody = route.request().postDataJSON();
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                foods: [{ name: 'Cheeseburger', calories: 500, protein: 25, carbs: 40, fiber: 2, netCarbs: 38, fat: 28, sugar: 8, quantity: 1, serving: '1 burger', confidence: 'medium', sourceType: 'official' }],
            }),
        });
    });

    await page.goto('/calorie-tracker.html');
    await page.evaluate(() => {
        window.requireAIAccess = () => true;
        window.startVoiceLogging();
    });
    await page.locator('#voice-location-button').click();
    await expect(page.locator('#voice-location-status')).toContainText('not saved');
    await page.evaluate(() => window.searchFoodByVoice('nearby restaurant cheeseburger'));
    await expect(page.locator('.food-checkbox')).toHaveCount(1);
    expect(requestBody.locationContext).toEqual({ latitude: 39.739, longitude: -104.99, accuracyMeters: 32 });
    await page.locator('#voice-button').click();

    const stored = await page.evaluate(() => localStorage.getItem('fuelfire_logged_meals'));
    expect(stored).not.toContain('latitude');
    expect(stored).not.toContain('longitude');
});

test('photo flow sends brand and portion context before displaying mocked results', async ({ page }) => {
    let requestBody;
    await page.route('**/api/ai-food-vision', async (route) => {
        requestBody = route.request().postDataJSON();
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                overallConfidence: 'high',
                foods: [{
                    name: 'Daisy Cottage Cheese', calories: 160, protein: 14, carbs: 15,
                    fiber: 0, netCarbs: 15, fat: 5, sugar: 11, quantity: 1,
                    serving: '1 container (170g)', confidence: 'high', dataSource: 'visible nutrition label',
                }],
            }),
        });
    });

    await page.goto('/calorie-tracker.html');
    await page.evaluate(() => {
        window.requireAIAccess = () => true;
        window.startFoodPhotoCapture();
    });
    await page.locator('#photo-brand-input').fill('Daisy');
    await page.locator('#photo-label-visibility').selectOption('nutrition-label-visible');
    await page.locator('#photo-portion-mode').selectOption('whole-item');
    await page.locator('#photo-portion-detail-input').fill('1 container 170g');
    await page.locator('#photo-modal input[type="file"]').setInputFiles(path.join(fixtureDir, 'food-label.svg'));
    await page.evaluate(() => window.handlePhotoData('PHN2Zy8+', 'image/svg+xml', {
        fileName: 'lidar-food-capture.jpg',
        spatialContext: {
            captureMode: 'lidarSceneDepth',
            lidarAvailable: true,
            sceneDepthAvailable: true,
            centerDistanceMeters: 0.42,
            platePlaneDistanceMeters: 0.47,
        },
    }));
    await expect(page.locator('#analyze-photo-btn')).toBeVisible();
    await page.locator('#analyze-photo-btn').click();

    await expect(page.locator('#photo-results')).toBeVisible();
    await expect(page.locator('#photo-total-calories')).toHaveText('160');
    await expect(page.locator('#photo-live-status')).toContainText('Confidence is high');
    await expect(page.locator('#photo-food-items')).toContainText('Protein: 14g');
    await expect(page.locator('#photo-food-items')).not.toContainText(/\bP:\s|\bC:\s|\bNet:\s|\bF:\s|\bS:\s/);
    await page.locator('.photo-food-qty').fill('2');
    await page.locator('.photo-food-qty').dispatchEvent('change');
    await expect(page.locator('#photo-live-status')).toContainText('1 item selected. Total 320 calories');
    expect(requestBody.photoContextDetails).toMatchObject({
        brand: 'Daisy', labelVisibility: 'nutrition-label-visible', portionMode: 'whole-item', portionDetail: '1 container 170g',
    });
    expect(requestBody.spatialContext).toMatchObject({
        captureMode: 'lidarSceneDepth',
        lidarAvailable: true,
        centerDistanceMeters: 0.42,
        platePlaneDistanceMeters: 0.47,
    });
    await page.evaluate(() => window.closePhotoModal());
});

test('photo questions resolve before one parser recalculation and preserve range assumptions', async ({ page }) => {
    const parserRequests = [];
    await page.route('**/api/ai-food-vision', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                overallConfidence: 'medium',
                calorieRange: { min: 210, max: 390 },
                assumptions: ['Cracker count estimated from the visible stack', 'Tuna packing liquid is not visible'],
                foods: [
                    { name: 'Canned Tuna', calories: 150, protein: 25, carbs: 0, fiber: 0, netCarbs: 0, fat: 5, sugar: 0, quantity: 1, confidence: 'medium' },
                    { name: 'Crackers', calories: 90, protein: 2, carbs: 14, fiber: 1, netCarbs: 13, fat: 3, sugar: 1, quantity: 1, visualCount: 6, confidence: 'medium' },
                ],
                clarifyingQuestions: [
                    {
                        id: 'tuna_packing_liquid', question: 'Was the canned tuna packed in water or oil?', examples: ['Water', 'Oil'],
                        reason: 'Oil changes calories.', affectedFood: 'canned tuna', answerType: 'single-choice-or-voice', acceptsVoice: true,
                    },
                    {
                        id: 'cracker_count', question: 'How many crackers did you eat?', examples: ['6', '10'],
                        reason: 'The count changes calories.', affectedFood: 'crackers', answerType: 'number', acceptsVoice: true,
                    },
                ],
            }),
        });
    });
    await page.route('**/api/ai-food-parser', async (route) => {
        parserRequests.push(route.request().postDataJSON());
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                foods: [
                    { name: 'Canned Tuna in Water', calories: 120, protein: 26, carbs: 0, fiber: 0, netCarbs: 0, fat: 1, sugar: 0, quantity: 1, serving: '1 can', confidence: 'high', sourceType: 'database' },
                    { name: 'Crackers', calories: 150, protein: 3, carbs: 24, fiber: 1, netCarbs: 23, fat: 5, sugar: 2, quantity: 1, serving: '10 crackers', confidence: 'high', sourceType: 'database' },
                ],
                clarifyingQuestions: [],
            }),
        });
    });

    await page.goto('/calorie-tracker.html');
    await page.evaluate(() => { window.requireAIAccess = () => true; });
    await page.getByRole('button', { name: 'Photo', exact: true }).click();
    await page.locator('#photo-gallery-input').setInputFiles(path.join(fixtureDir, 'food-label.svg'));
    await page.getByRole('button', { name: 'Analyze Food' }).click();
    await expect(page.locator('#photo-clarification')).toContainText('Question 1 of 2');
    await expect(page.locator('.clarification-option').first()).not.toHaveAttribute('aria-pressed');
    await page.getByRole('button', { name: 'Answer question 1 with Water' }).click();
    await page.getByRole('button', { name: 'Use answer' }).click();
    await expect(page.locator('#clarification-answer-error')).toContainText('Enter an answer');
    await expect(page.locator('#clarification-answer-input')).toHaveAttribute('aria-invalid', 'true');
    expect(await page.evaluate(() => window.submitClarificationVoiceAnswer('ten'))).toBe(true);

    await expect(page.locator('#photo-total-calories')).toHaveText('270');
    await expect(page.locator('#photo-results-title')).toBeFocused();
    await expect(page.locator('#photo-analysis-context')).toContainText('210–390 calories');
    await expect(page.locator('#photo-analysis-context')).toContainText('Tuna packing liquid is not visible');
    await expect(page.locator('#photo-live-status')).toContainText('ready for review');
    expect(parserRequests).toHaveLength(1);
    expect(parserRequests[0].query).toMatch(/canned tuna in water/i);
    expect(parserRequests[0].query).toMatch(/10 crackers/i);
});

test('photo dialog Escape returns focus and labeled gallery controls pass an open-state axe scan', async ({ page }) => {
    await page.goto('/calorie-tracker.html');
    await page.evaluate(() => { window.requireAIAccess = () => true; });
    const trigger = page.getByRole('button', { name: 'Photo', exact: true });
    await trigger.click();

    const dialog = page.getByRole('dialog', { name: 'Photo Food Logging' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
    await expect(dialog.locator('#photo-live-status')).toHaveCount(1);
    await expect(dialog.locator('#photo-live-alert')).toHaveCount(1);
    await expect(dialog.getByLabel('Brand or restaurant (optional)')).toBeVisible();
    await expect(dialog.getByLabel('Barcode or UPC (optional)')).toBeVisible();
    await expect(dialog.getByLabel('What does the photo show?')).toBeVisible();
    await expect(dialog.getByLabel('How much was eaten?')).toBeVisible();
    await expect(dialog.getByLabel('Extra food details (optional)')).toBeVisible();
    const gallery = dialog.getByLabel('Gallery');
    await gallery.focus();
    await expect(gallery).toBeFocused();

    const results = await new AxeBuilder({ page }).include('#photo-modal').analyze();
    const criticalOrSerious = results.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact));
    expect(criticalOrSerious, criticalOrSerious.map((item) => `${item.id}: ${item.help}`).join('\n')).toEqual([]);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
});

test('voice and photo fallback dialogs inert the page, trap focus, close on Escape, and restore their opener', async ({ page }) => {
    await page.goto('/calorie-tracker.html');
    await page.evaluate(() => {
        window.requireAIAccess = () => true;
        for (const id of ['voice-modal', 'photo-modal']) {
            Object.defineProperty(document.getElementById(id), 'showModal', { configurable: true, value: undefined });
        }
    });

    for (const mode of ['voice', 'photo']) {
        const trigger = page.locator(`#${mode}-log-trigger`);
        await trigger.click();
        const dialog = page.locator(`#${mode}-modal`);
        const close = page.locator(`#${mode}-close-button`);
        await expect(dialog).toHaveAttribute('data-fallback-dialog', 'true');
        await expect(close).toBeFocused();
        await expect(page.locator('.phone-container')).toHaveAttribute('inert', '');
        await page.keyboard.press('Shift+Tab');
        await expect(dialog.locator('button:not([disabled])').last()).toBeFocused();
        await page.keyboard.press('Tab');
        await expect(close).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(dialog).not.toHaveAttribute('open', '');
        await expect(page.locator('.phone-container')).not.toHaveAttribute('inert', '');
        await expect(trigger).toBeFocused();
    }
});

test('photo validation reports inline without a blocking browser alert and focuses a useful control', async ({ page }) => {
    await page.goto('/calorie-tracker.html');
    await page.evaluate(() => {
        window.requireAIAccess = () => true;
        window.__photoAlertCalls = 0;
        window.alert = () => { window.__photoAlertCalls += 1; };
        window.startFoodPhotoCapture(document.getElementById('photo-log-trigger'));
        window.analyzePhotoFood();
    });
    await expect(page.locator('#photo-live-alert')).toContainText('Take a photo or choose one from Gallery');
    await expect(page.locator('#photo-camera-btn')).toBeFocused();
    expect(await page.evaluate(() => window.__photoAlertCalls)).toBe(0);
});

test('photo flow preserves a counted portion instead of applying a mismatched saved weight serving', async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('fuelfire_learned_foods', JSON.stringify([{
            key: 'cooked shrimp', name: 'Cooked Shrimp', serving: '100 grams',
            calories: 99, protein: 24, carbs: 0, fiber: 0, netCarbs: 0, fat: 1, sugar: 0,
            baseNutrition: { calories: 99, protein: 24, carbs: 0, fiber: 0, netCarbs: 0, fat: 1, sugar: 0 },
            count: 4, correctionCount: 1, memoryAction: 'corrected', evidenceTier: 95,
            aliases: ['shrimp', 'cooked shrimp'], source: 'user correction',
        }]));
    });
    await page.route('**/api/ai-food-vision', async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                overallConfidence: 'medium',
                foods: [{
                    name: 'Cooked Shrimp', serving: '1 cooked shrimp (estimated 18g)', quantity: 13,
                    visualCount: 13, calories: 18, protein: 4, carbs: 0, fiber: 0,
                    netCarbs: 0, fat: 0, sugar: 0, confidence: 'medium', needsVerification: true,
                    dataSource: 'standard cooked shrimp reference scaled to visible count',
                }],
            }),
        });
    });

    await page.goto('/calorie-tracker.html');
    await page.evaluate(() => {
        window.requireAIAccess = () => true;
        window.startFoodPhotoCapture();
    });
    await page.locator('#photo-modal input[type="file"]').setInputFiles(path.join(fixtureDir, 'food-label.svg'));
    await page.locator('#analyze-photo-btn').click();

    await expect(page.locator('#photo-results')).toBeVisible();
    await expect(page.locator('#photo-total-calories')).toHaveText('234');
    await expect(page.locator('.photo-food-qty')).toHaveValue('13');
    await expect(page.locator('#photo-food-items')).not.toContainText('Saved');
    await expect(page.locator('#photo-food-items')).toContainText('Needs review');
});

test('food memory keeps incompatible portion variants separate', async ({ page }) => {
    await page.goto('/calorie-tracker.html');
    const memory = await page.evaluate(() => {
        window.rememberLoggedFood({
            name: 'Pepperoni Pizza', serving: '1 whole pizza', quantity: 1,
            calories: 1200, protein: 48, carbs: 144, fiber: 8, netCarbs: 136, fat: 48, sugar: 10,
            sourceType: 'user-saved', source: 'user correction',
        }, [], { action: 'corrected' });
        window.rememberLoggedFood({
            name: 'Pepperoni Pizza', serving: '1 slice', quantity: 1,
            calories: 300, protein: 12, carbs: 36, fiber: 2, netCarbs: 34, fat: 12, sugar: 3,
            sourceType: 'estimate', source: 'photo estimate',
        }, [], { action: 'accepted' });
        return JSON.parse(localStorage.getItem('fuelfire_learned_foods') || '[]');
    });

    expect(memory).toHaveLength(2);
    expect(memory.find(item => item.serving === '1 whole pizza')).toMatchObject({
        calories: 1200, correctionCount: 1, evidenceTier: 95,
    });
    expect(memory.find(item => item.serving === '1 slice')).toMatchObject({
        calories: 300, correctionCount: 0,
    });
});

test('mobile food modals stay inside the visible viewport', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile'), 'Mobile viewport check');
    await page.goto('/calorie-tracker.html');
    await page.evaluate(() => {
        window.requireAIAccess = () => true;
        window.startFoodPhotoCapture();
    });

    await expectInsideViewport(page.locator('#photo-modal > div'), page);
    await page.locator('#photo-close-button').click();
    await page.locator('#voice-log-trigger').click();
    await expectInsideViewport(page.locator('#voice-modal > div'), page);
});

test('calorie tracker has no critical automated accessibility violations', async ({ page }) => {
    await page.goto('/calorie-tracker.html');
    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter((violation) => violation.impact === 'critical');
    expect(critical, critical.map((item) => `${item.id}: ${item.help}`).join('\n')).toEqual([]);
});
