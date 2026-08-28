import { expect, test } from '@playwright/test';

const pages = [
    { name: 'home dashboard', url: '/index.html', groupCount: 2 },
    { name: 'health dashboard', url: '/health-dashboard.html', groupCount: 1 },
];

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('fuelfire_onboarding_v1', 'done');
    });
});

for (const pageCase of pages) {
    test(`${pageCase.name} hydration can add and remove water without going negative`, async ({ page }) => {
        await page.goto(pageCase.url);

        const status = page.locator('[data-hydration-status]');
        const decrements = page.locator('[data-hydration-decrement]');
        const visibleDecrement = decrements.first();
        const visibleIncrement = page.locator('[data-hydration-increment]').first();

        await expect(status).toHaveCount(1);
        await expect(status).toHaveAttribute('role', 'status');
        await expect(status).toHaveAttribute('aria-live', 'polite');
        await expect(status).toHaveAttribute('aria-atomic', 'true');
        expect(await status.evaluate((element) => element.closest('.screen-content') === null)).toBe(true);
        await expect(decrements).toHaveCount(pageCase.groupCount);
        expect(await decrements.evaluateAll((buttons) => buttons.every((button) => (
            button.type === 'button'
            && button.disabled
            && button.textContent.trim() === '−8 oz'
            && button.getAttribute('aria-label') === 'Remove 8 ounces of water'
            && button.nextElementSibling?.matches('[data-hydration-increment]')
        )))).toBe(true);
        expect(await decrements.evaluateAll((buttons) => buttons.every((button) => (
            Array.from(button.parentElement.querySelectorAll('button')).every((groupButton) => (
                Number.parseFloat(getComputedStyle(groupButton).minHeight) >= 44
            ))
        )))).toBe(true);
        expect(await page.locator('#hydration-total, [data-hydration-total]').evaluateAll((totals) => totals.every((total) => (
            !total.hasAttribute('aria-live') && total.getAttribute('role') !== 'status'
        )))).toBe(true);

        await visibleIncrement.click();
        await expect(status).toHaveText('Water total: 8 ounces.');
        await expect.poll(() => decrements.evaluateAll((buttons) => buttons.every((button) => !button.disabled))).toBe(true);
        await expect.poll(() => page.locator('#hydration-total, [data-hydration-total]').evaluateAll((totals) => (
            totals.every((total) => total.textContent.trim() === '8 oz')
        ))).toBe(true);
        expect(await page.evaluate(() => JSON.parse(localStorage.getItem('fuelfire_hydration_today')).totalOz)).toBe(8);

        await page.reload();
        await expect.poll(() => page.locator('[data-hydration-decrement]').evaluateAll((buttons) => (
            buttons.every((button) => !button.disabled)
        ))).toBe(true);
        await expect.poll(() => page.locator('#hydration-total, [data-hydration-total]').evaluateAll((totals) => (
            totals.every((total) => total.textContent.trim() === '8 oz')
        ))).toBe(true);

        const reloadedDecrement = page.locator('[data-hydration-decrement]').first();
        const reloadedIncrement = page.locator('[data-hydration-increment]').first();
        await reloadedDecrement.click();
        await expect(status).toHaveText('Water total: 0 ounces.');
        await expect(reloadedIncrement).toBeFocused();
        await expect.poll(() => page.locator('[data-hydration-decrement]').evaluateAll((buttons) => (
            buttons.every((button) => button.disabled)
        ))).toBe(true);
        expect(await page.evaluate(() => JSON.parse(localStorage.getItem('fuelfire_hydration_today')).totalOz)).toBe(0);

        await page.evaluate(() => {
            window.__hydrationStatusMutations = 0;
            const observer = new MutationObserver(() => { window.__hydrationStatusMutations += 1; });
            observer.observe(document.querySelector('[data-hydration-status]'), {
                childList: true,
                characterData: true,
                subtree: true,
            });
            window.addWater(-8);
        });
        await expect(status).toHaveText('Water total: 0 ounces.');
        expect(await page.evaluate(() => window.__hydrationStatusMutations)).toBe(0);
        expect(await page.evaluate(() => JSON.parse(localStorage.getItem('fuelfire_hydration_today')).totalOz)).toBe(0);

        await page.reload();
        await expect.poll(() => page.locator('#hydration-total, [data-hydration-total]').evaluateAll((totals) => (
            totals.every((total) => total.textContent.trim() === '0 oz')
        ))).toBe(true);
        await expect.poll(() => page.locator('[data-hydration-decrement]').evaluateAll((buttons) => (
            buttons.every((button) => button.disabled)
        ))).toBe(true);
    });
}
