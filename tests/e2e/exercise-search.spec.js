import { expect, test } from '@playwright/test';

const searchInput = '#exercise-search';
const searchStatus = '#exercise-search-status';

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('fuelfire_onboarding_v1', 'done');
    });
});

async function openWorkoutPage(page, fileName) {
    await page.goto(`/${fileName}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator(searchInput)).toBeVisible();
    await expect(page.locator('.supplement-title').first()).toBeVisible();
}

test('workout search accepts aliases, spacing, and a common typo', async ({ page }) => {
    const cases = [
        { fileName: 'workout-chest.html', query: ' db bench ', expectedName: 'Dumbbell Bench Press' },
        { fileName: 'workout-back.html', query: 'lat pull down', expectedName: 'Lat Pulldowns' },
        { fileName: 'workout-legs.html', query: 'rdl', expectedName: 'Romanian Deadlift' },
        { fileName: 'workout-shoulders.html', query: 'side raise', expectedName: 'Lateral Raises' },
        { fileName: 'workout-chest.html', query: 'dumbel bench', expectedName: 'Dumbbell Bench Press' },
    ];

    for (const { fileName, query, expectedName } of cases) {
        await test.step(`${fileName}: ${query.trim()}`, async () => {
            await openWorkoutPage(page, fileName);
            const input = page.locator(searchInput);
            await expect(input).toHaveAttribute('type', 'search');
            await expect(page.locator('label[for="exercise-search"]')).toHaveText('Search exercises');

            await input.fill(query);

            await expect(page.locator('.supplement-title').getByText(expectedName, { exact: true })).toBeVisible();
            await expect(page.locator(searchStatus)).toHaveText(/found\./i);
        });
    }
});

test('filtered image controls keep the source exercise index', async ({ page }) => {
    await openWorkoutPage(page, 'workout-back.html');

    await page.locator(searchInput).fill('lat pull down');
    const card = page.locator('.supplement-card').filter({ hasText: 'Lat Pulldowns' });
    await expect(card).toHaveCount(1);
    await card.locator('.supplement-header').click();

    const image = card.locator('img[id^="exercise-img-"]');
    const indicator = card.locator('[id^="step-indicator-"]');
    await expect(image).toHaveAttribute('src', /Wide-Grip_Lat_Pulldown\/0\.jpg$/);
    await expect(indicator).toHaveText('Step 1 of 2');

    await card.locator('button').filter({ hasText: 'Next' }).click();
    await expect(image).toHaveAttribute('src', /Wide-Grip_Lat_Pulldown\/1\.jpg$/);
    await expect(indicator).toHaveText('Step 2 of 2');
});

test('search reports no results and restores the full list when cleared', async ({ page }) => {
    await openWorkoutPage(page, 'workout-core.html');
    const input = page.locator(searchInput);
    const titles = page.locator('.supplement-title');

    await input.fill('zzzzzzq');
    await expect(titles).toHaveCount(0);
    await expect(page.locator(searchStatus)).toHaveText(/no exercises found/i);

    await input.fill('');
    await expect(titles.first()).toBeVisible();
    await expect(page.locator(searchStatus)).toHaveText(/exercises available/i);
});
