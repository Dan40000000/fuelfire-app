import { expect, test } from '@playwright/test';

// Run with the shared browser projects as well as the isolated local config.

test('bridges both legacy keys once without rewriting their raw payloads', async ({ page }) => {
    await page.goto('/calorie-tracker.html');
    const result = await page.evaluate(() => {
        localStorage.clear();
        const calorieRaw = JSON.stringify([{ name: 'Plan legacy', calories: 0, date: '2026-10-28' }]);
        const dailyRaw = JSON.stringify([{ name: 'Daily legacy', calories: 1.5, timestamp: '2026-10-28T12:00:00.000Z' }]);
        localStorage.setItem('fuelfire_calorie_log', calorieRaw);
        localStorage.setItem('dailyFoodLog', dailyRaw);

        const first = FuelFireFoodStore.readLogs(localStorage);
        const second = FuelFireFoodStore.readLogs(localStorage);
        const meals = Object.values(second).flatMap(day => day.meals);
        return {
            firstCount: Object.values(first).flatMap(day => day.meals).length,
            secondCount: meals.length,
            zeroCalories: meals.find(meal => meal.name === 'Plan legacy')?.calories,
            dateKeys: Object.keys(second),
            rawPlan: localStorage.getItem('fuelfire_calorie_log'),
            rawDaily: localStorage.getItem('dailyFoodLog'),
            recovery: localStorage.getItem(FuelFireFoodStore.recoveryBackupKey),
        };
    });

    expect(result.firstCount).toBe(2);
    expect(result.secondCount).toBe(2);
    expect(result.zeroCalories).toBe(0);
    expect(result.dateKeys).toContain('2026-10-28');
    expect(result.rawPlan).toContain('Plan legacy');
    expect(result.rawDaily).toContain('Daily legacy');
    expect(result.recovery).toBeNull();
});

test('does not resurrect a deleted legacy meal after reload', async ({ page }) => {
    await page.goto('/calorie-tracker.html');
    const first = await page.evaluate(() => {
        localStorage.clear();
        localStorage.setItem('fuelfire_calorie_log', JSON.stringify([{ name: 'Delete after import', calories: 100, date: '2026-10-28' }]));
        localStorage.setItem('dailyFoodLog', JSON.stringify([{ name: 'Keep after import', calories: 200, date: '2026-10-28' }]));
        const logs = FuelFireFoodStore.readLogs(localStorage);
        return {
            names: Object.values(logs).flatMap(day => day.meals).map(meal => meal.name),
            marker: JSON.parse(localStorage.getItem(FuelFireFoodStore.legacyImportedIdsKey)),
        };
    });
    expect(first.names).toHaveLength(2);
    expect(first.marker).toHaveLength(2);

    await page.evaluate(() => {
        const canonical = JSON.parse(localStorage.getItem(FuelFireFoodStore.storageKey));
        const day = canonical['2026-10-28'];
        day.meals = day.meals.filter(meal => meal.name !== 'Delete after import');
        day.totalCalories = day.meals.reduce((total, meal) => total + meal.calories, 0);
        if (!FuelFireFoodStore.writeLogs(canonical, localStorage).ok) throw new Error('canonical delete did not persist');
    });

    const afterDelete = await page.evaluate(() => Object.values(FuelFireFoodStore.readLogs(localStorage)).flatMap(day => day.meals).map(meal => meal.name));
    expect(afterDelete).toEqual(['Keep after import']);

    await page.reload();
    const afterReload = await page.evaluate(() => ({
        names: Object.values(FuelFireFoodStore.readLogs(localStorage)).flatMap(day => day.meals).map(meal => meal.name),
        marker: JSON.parse(localStorage.getItem(FuelFireFoodStore.legacyImportedIdsKey)),
    }));
    expect(afterReload.names).toEqual(['Keep after import']);
    expect(afterReload.marker).toHaveLength(2);
});

test('renders literal meal text inertly and writes the clicked meal to canonical storage', async ({ page }) => {
    await page.addInitScript(() => {
        window.__alerts = [];
        window.alert = message => window.__alerts.push(String(message));
        window.confirm = () => false;
    });
    await page.goto('/meal-plan.html');
    await page.evaluate(() => {
        displayMealPlan("### Day 1:\n**🍳 Breakfast:** O'Reilly <img src=x onerror=alert(1)> - Cal: 0 P: 0.25g C: 1.5g F: 0", {
            generatedAt: '2026-10-28T12:00:00.000Z',
        });
    });

    await expect(page.locator('#meal-plan-content img')).toHaveCount(0);
    await expect(page.locator('#meal-plan-content button[onclick*="logMealToTracker"]')).toHaveCount(0);
    await expect(page.locator('#meal-plan-content ul[data-meal-record-id] strong')).toHaveText("O'Reilly <img src=x onerror=alert(1)>");

    await page.getByRole('button', { name: 'Log to Tracker' }).click();
    const meals = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('fuelfire_logged_meals'))).flatMap(day => day.meals));
    expect(meals).toEqual([expect.objectContaining({
        name: "O'Reilly <img src=x onerror=alert(1)>",
        calories: 0,
        protein: 0.25,
        carbs: 1.5,
    })]);
});
