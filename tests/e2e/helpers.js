import { expect } from '@playwright/test';

// Opaque client fixtures only. Signature verification is exercised by the
// server security tests; browser tests never mint or contact a real account.
export const TEST_INSTALLATION_CUSTOMER_ID = `fuelfire_${'a'.repeat(48)}`;
export const TEST_INSTALLATION_TOKEN = 'browser-fixture-installation-session';

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
    await page.route('**/api/installation-session', route => route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
            success: true,
            rcAppUserId: TEST_INSTALLATION_CUSTOMER_ID,
            installationSessionToken: TEST_INSTALLATION_TOKEN,
            expiresAt: Date.now() + 86400000,
        }),
    }));
    await page.addInitScript(() => {
        localStorage.setItem('fuelfire_subscription_status', JSON.stringify({
            active: true,
            plan: 'ai_food',
            entitlement: 'Elite_Access',
        }));
        localStorage.setItem('fuelfire_premium', 'true');
        localStorage.setItem('fuelfire_ai_access', JSON.stringify({ plan: 'premium', source: 'test-fixture' }));
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
