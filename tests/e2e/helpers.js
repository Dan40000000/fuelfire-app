import { expect } from '@playwright/test';

export function localDateKey(now = new Date()) {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Denver',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).formatToParts(now).map(({ type, value }) => [type, value]),
    );
    const { year, month, day } = parts;
    return `${year}-${month}-${day}`;
}

export async function seedPaidAiAccess(page) {
    await page.addInitScript(() => {
        localStorage.setItem('fuelfire_subscription_status', JSON.stringify({
            active: true,
            plan: 'ai_food',
            entitlement: 'Elite_Access',
        }));
        localStorage.setItem('fuelfire_premium', 'true');
    });
}

export async function expectInsideViewport(locator, page) {
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    const viewport = page.viewportSize();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(box.y).toBeLessThan(viewport.height);
}
