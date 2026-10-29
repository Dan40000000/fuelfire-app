import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
    // This suite deliberately supplies no paid access, provider or network.
    await page.route('**/api/**', route => route.fulfill({
        status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Offline fixture' }),
    }));
    page.on('dialog', dialog => dialog.accept());
});

async function openManual(page) {
    await page.goto('/calorie-tracker.html');
    await page.getByRole('button', { name: /Log food manually.*free/i }).click();
    await expect(page.locator('#manual-entry-content')).toBeVisible();
}

async function savedMeals(page) {
    return page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('fuelfire_logged_meals') || '{}'))
        .flatMap(day => day.meals || []));
}

test('open manual food entry has no serious or critical automated accessibility violations', async ({ page }) => {
    await openManual(page);
    const result = await new AxeBuilder({ page }).include('#smart-entry-modal').analyze();
    const failures = result.violations.filter(item => ['critical', 'serious'].includes(item.impact));
    expect(failures, JSON.stringify(failures.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) })))).toEqual([]);
});

test('free offline food logging accepts zero and decimals, rejects negatives and survives reload', async ({ page }) => {
    await openManual(page);
    await page.locator('#manual-food-name').fill('Diet Soda');
    await page.locator('#manual-calories').fill('0');
    await page.getByRole('button', { name: 'Add Food (offline/free)', exact: true }).click();
    await expect(page.locator('#manual-entry-saved')).toContainText('Saved Diet Soda');
    await page.locator('#manual-food-name').fill('Decimal Shake');
    await page.locator('#manual-calories').fill('-100');
    await page.locator('#manual-protein').fill('12.7');
    await page.getByRole('button', { name: 'Add Food (offline/free)', exact: true }).click();
    await expect(page.locator('#manual-entry-error')).toContainText('greater than or equal to 0');
    expect(await savedMeals(page)).toHaveLength(1);
    await expect(page.locator('#manual-food-name')).toHaveValue('Decimal Shake');
    await page.locator('#manual-calories').fill('123.5');
    await page.getByRole('button', { name: 'Add Food (offline/free)', exact: true }).click();
    await page.reload();
    expect(await savedMeals(page)).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: 'Diet Soda', calories: 0 }),
        expect.objectContaining({ name: 'Decimal Shake', calories: 123.5, protein: 12.7 }),
    ]));
    await expect(page.locator('#today-meals')).toContainText('Decimal Shake');
    expect(await page.evaluate(() => localStorage.getItem('fuelfire_food_entry_mode'))).toBe('manual');
});

test('a quota failure keeps the existing food log and the entered form', async ({ page }) => {
    await openManual(page);
    const original = await page.evaluate(() => {
        const key = window.FuelFireFoodStore.getLocalDateKey();
        const raw = JSON.stringify({ [key]: { meals: [{ name: 'Existing oats', calories: 100 }] } });
        localStorage.setItem('fuelfire_logged_meals', raw);
        window.FuelFireFoodStore.readLogs(localStorage);
        const persisted = localStorage.getItem('fuelfire_logged_meals');
        const set = Storage.prototype.setItem;
        Storage.prototype.setItem = function (name, value) {
            if (name === 'fuelfire_logged_meals') throw new DOMException('Full', 'QuotaExceededError');
            return set.call(this, name, value);
        };
        return persisted;
    });
    await page.locator('#manual-food-name').fill('Unsaved yogurt');
    await page.locator('#manual-calories').fill('160');
    await page.getByRole('button', { name: 'Add Food (offline/free)', exact: true }).click();
    await expect(page.locator('#manual-entry-error')).toContainText('Could not save');
    await expect(page.locator('#manual-food-name')).toHaveValue('Unsaved yogurt');
    expect(await page.evaluate(() => localStorage.getItem('fuelfire_logged_meals'))).toBe(original);
    await expect(page.locator('#manual-entry-saved')).toBeEmpty();
});

test('malicious-looking saved text stays literal after reload and negative edits cannot overwrite a meal', async ({ page }) => {
    await page.goto('/calorie-tracker.html');
    const name = '<img src=x onerror="window.foodTextExecuted=1">';
    await page.evaluate((literalName) => {
        const key = window.FuelFireFoodStore.getLocalDateKey();
        window.FuelFireFoodStore.writeLogs({ [key]: { meals: [{
            name: literalName, type: 'breakfast', calories: 160, protein: 12.7,
            serving: '<img src=x onerror="window.foodTextExecuted=1">',
            time: new Date().toISOString(), quantity: 1,
        }] } }, localStorage);
    }, name);
    await page.reload();
    await expect(page.locator('#today-meals')).toContainText(name);
    expect(await page.evaluate(() => window.foodTextExecuted)).toBeUndefined();
    await page.locator('button[onclick="editMeal(0)"]').click();
    await page.locator('#edit-calories').fill('-50');
    await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
    await expect(page.locator('#edit-meal-modal')).toBeVisible();
    expect((await savedMeals(page))[0].calories).toBe(160);
    await expect(page.locator('#edit-calories')).toHaveValue('-50');
    expect(await page.evaluate(() => window.foodTextExecuted)).toBeUndefined();
});
