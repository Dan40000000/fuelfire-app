import { describe, expect, it } from 'vitest';
import { planAllowsCapability, resolveAiAccess } from '../../api/_lib/security.js';

describe('AI access plan compatibility', () => {
    it('keeps legacy Premium subscribers authorized for AI food logging', () => {
        expect(planAllowsCapability('Premium_Access', 'ai_food')).toBe(true);
        expect(planAllowsCapability('legacy_premium', 'ai_food')).toBe(true);
    });

    it('does not grant AI food logging to the Core-only plan', () => {
        expect(planAllowsCapability('Core_Access', 'ai_food')).toBe(false);
    });

    it('verifies a legacy Premium TestFlight user through RevenueCat', async () => {
        const originalApiKey = process.env.REVENUECAT_SECRET_API_KEY;
        const originalFetch = global.fetch;
        process.env.REVENUECAT_SECRET_API_KEY = 'unit-test-secret';
        global.fetch = async () => new Response(JSON.stringify({
            subscriber: {
                entitlements: {
                    Premium_Access: { expires_date: new Date(Date.now() + 60_000).toISOString() },
                },
                subscriptions: {},
                non_subscriptions: {},
            },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });

        try {
            const access = await resolveAiAccess({
                headers: { 'x-fuelfire-rc-app-user-id': 'testflight-photo-user' },
                body: {},
            }, { capability: 'ai_food' });
            expect(access).toMatchObject({ allowed: true, source: 'revenuecat', plan: 'legacy_premium' });
        } finally {
            global.fetch = originalFetch;
            if (originalApiKey === undefined) delete process.env.REVENUECAT_SECRET_API_KEY;
            else process.env.REVENUECAT_SECRET_API_KEY = originalApiKey;
        }
    });
});
