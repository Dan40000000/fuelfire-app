import { expect } from '@playwright/test';

export function localDateKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
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
