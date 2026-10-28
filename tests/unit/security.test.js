import { describe, expect, it, vi } from 'vitest';
import { createInstallationSession } from '../../api/_lib/installation-session.js';
import { planAllowsCapability, requireAiAccess, resolveAiAccess } from '../../api/_lib/security.js';

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
        const originalSessionSecret = process.env.FUELFIRE_INSTALLATION_SESSION_SECRET;
        const originalFetch = global.fetch;
        process.env.REVENUECAT_SECRET_API_KEY = 'unit-test-secret';
        process.env.FUELFIRE_INSTALLATION_SESSION_SECRET = 'unit-test-session-secret';
        const session = createInstallationSession();
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
                headers: { authorization: `Bearer ${session.token}` },
                body: {},
            }, { capability: 'ai_food' });
            expect(access).toMatchObject({ allowed: true, source: 'revenuecat', plan: 'legacy_premium' });
        } finally {
            global.fetch = originalFetch;
            if (originalApiKey === undefined) delete process.env.REVENUECAT_SECRET_API_KEY;
            else process.env.REVENUECAT_SECRET_API_KEY = originalApiKey;
            if (originalSessionSecret === undefined) delete process.env.FUELFIRE_INSTALLATION_SESSION_SECRET;
            else process.env.FUELFIRE_INSTALLATION_SESSION_SECRET = originalSessionSecret;
        }
    });

    it('does not authorize a caller-supplied RevenueCat ID without a signed installation session', async () => {
        const originalApiKey = process.env.REVENUECAT_SECRET_API_KEY;
        const originalFetch = global.fetch;
        const fetchSpy = vi.fn();
        process.env.REVENUECAT_SECRET_API_KEY = 'unit-test-secret';
        global.fetch = fetchSpy;
        try {
            const access = await resolveAiAccess({
                headers: { 'x-fuelfire-rc-app-user-id': 'testflight-photo-user' },
                body: {},
            }, { capability: 'ai_food' });
            expect(access).toMatchObject({ allowed: false, reason: 'installation_identity_mismatch' });
            expect(fetchSpy).not.toHaveBeenCalled();
        } finally {
            global.fetch = originalFetch;
            if (originalApiKey === undefined) delete process.env.REVENUECAT_SECRET_API_KEY;
            else process.env.REVENUECAT_SECRET_API_KEY = originalApiKey;
        }
    });

    it('logs a searchable, food-free reference when AI food access is denied', async () => {
        const logSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const response = {
            statusCode: 200,
            body: null,
            status(code) { this.statusCode = code; return this; },
            json(body) { this.body = body; return this; },
        };
        try {
            const access = await requireAiAccess({
                url: '/api/ai-food-parser?query=secret%20breakfast',
                headers: {},
                body: { source: 'voice', query: 'secret breakfast', transcript: 'private meal' },
            }, response, { capability: 'ai_food' });
            expect(access).toBeNull();
            expect(response.statusCode).toBe(402);
            expect(response.body.reportId).toMatch(/^AIA-\d{8}-[A-F0-9]{8}$/);
            const logLine = logSpy.mock.calls.map(call => call.join(' ')).join(' ');
            expect(logLine).toContain(response.body.reportId);
            expect(logLine).toContain('"route":"parser"');
            expect(logLine).not.toContain('secret');
            expect(logLine).not.toContain('private meal');
        } finally {
            logSpy.mockRestore();
        }
    });
});
