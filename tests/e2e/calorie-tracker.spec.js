import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { expectInsideViewport, localDateKey, seedPaidAiAccess } from './helpers.js';

const fixtureDir = path.resolve(process.cwd(), 'tests/fixtures');

test.beforeEach(async ({ page }) => {
    await seedPaidAiAccess(page);
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
    expect(memory[0]).toMatchObject({ name: 'Test Protein Shake', correctionCount: 1, memoryAction: 'corrected' });
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
        document.getElementById('voice-modal').style.display = 'block';
        return window.searchFoodByVoice('2 eggs and 4 standard blueberry muffins');
    });

    await expect(page.locator('.food-checkbox')).toHaveCount(2);
    await expect(page.locator('.food-name-edit')).toHaveCount(2);
    await page.locator('.food-name-edit').first().fill('Free-range Eggs');
    await expect(page.locator('#voice-button')).toHaveText('Log Selected Foods');
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
        document.getElementById('voice-modal').style.display = 'block';
        window.searchFoodByVoice('log my usual breakfast');
    });

    await expect(page.locator('.food-checkbox')).toHaveCount(2);
    await expect(page.locator('.food-name-edit').first()).toHaveValue('Eggs');
    await expect(page.locator('.food-quantity').first()).toHaveValue('2');
    expect(apiCalls).toBe(0);
});

test('voice asks one inline size question and retries once', async ({ page }) => {
    const requests = [];
    await page.route('**/api/ai-food-parser', async (route) => {
        const body = route.request().postDataJSON();
        requests.push(body);
        const refined = String(body.query).includes('muffin size');
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                foods: [{
                    name: 'Blueberry Muffin', calories: refined ? 135 : 385, protein: 2, carbs: 31,
                    fiber: 1, netCarbs: 30, fat: 1, sugar: 15, quantity: 4,
                    serving: refined ? '1 standard muffin' : '1 muffin', confidence: refined ? 'high' : 'medium', sourceType: 'database',
                }],
                clarifyingQuestions: refined ? [] : [{
                    id: 'muffin_size', question: 'What size/type were the muffins?',
                    reason: 'Size materially changes calories.', examples: ['standard / box mix', 'large bakery'],
                }],
            }),
        });
    });

    await page.goto('/calorie-tracker.html');
    await page.evaluate(() => {
        document.getElementById('voice-modal').style.display = 'block';
        window.searchFoodByVoice('4 blueberry muffins');
    });
    await expect(page.locator('#food-clarification')).toBeVisible();
    await page.getByRole('button', { name: 'standard / box mix' }).click();
    await expect(page.locator('.food-checkbox')).toHaveCount(1);
    expect(requests).toHaveLength(2);
    expect(requests[1].query).toContain('muffin size: standard / box mix');
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
    await expect(page.locator('#analyze-photo-btn')).toBeVisible();
    await page.locator('#analyze-photo-btn').click();

    await expect(page.locator('#photo-results')).toBeVisible();
    await expect(page.locator('#photo-total-calories')).toHaveText('160');
    expect(requestBody.photoContextDetails).toMatchObject({
        brand: 'Daisy', labelVisibility: 'nutrition-label-visible', portionMode: 'whole-item', portionDetail: '1 container 170g',
    });
    await page.evaluate(() => window.closePhotoModal());
});

test('mobile food modals stay inside the visible viewport', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile'), 'Mobile viewport check');
    await page.goto('/calorie-tracker.html');
    await page.evaluate(() => {
        window.requireAIAccess = () => true;
        window.startFoodPhotoCapture();
    });

    await expectInsideViewport(page.locator('#photo-modal > div'), page);
    await expect(page.locator('#photo-modal > div')).toHaveScreenshot('photo-capture-modal.png');
});

test('calorie tracker has no critical automated accessibility violations', async ({ page }) => {
    await page.goto('/calorie-tracker.html');
    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter((violation) => violation.impact === 'critical');
    expect(critical, critical.map((item) => `${item.id}: ${item.help}`).join('\n')).toEqual([]);
});
