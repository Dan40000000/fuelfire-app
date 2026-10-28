import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import vm from 'vm';

import { afterEach, describe, expect, it, vi } from 'vitest';

import claudeMealPlanHandler from '../../api/claude-meal-plan.js';
import foodParserHandler from '../../api/ai-food-parser.js';
import foodVisionHandler from '../../api/ai-food-vision.js';
import generateMealPlanHandler from '../../api/generate-meal-plan.js';
import installationSessionHandler from '../../api/installation-session.js';
import subscriptionsHandler from '../../api/subscriptions.js';
import testApiKeyHandler from '../../api/test-api-key.js';
import treadmillVisionHandler from '../../api/treadmill-vision.js';
import usdaFoodSearchHandler from '../../api/usda-food-search.js';
import { callClaude } from '../../api/_lib/anthropic.js';
import {
    createInstallationSession,
    renewInstallationSession,
    verifyInstallationSession,
} from '../../api/_lib/installation-session.js';
import { resetQuotaStoreForTests } from '../../api/_lib/quota.js';
import { consumeQuota } from '../../api/_lib/quota.js';
import { createProviderBudget } from '../../api/_lib/provider-budget.js';
import { getClientIp } from '../../api/_lib/request-security.js';
import { requireAiAccess, resolveAiAccess } from '../../api/_lib/security.js';
import { invokeApi } from '../lib/api-test-utils.js';

const ORIGINAL_ENV = { ...process.env };

function restoreEnvironment() {
    process.env = { ...ORIGINAL_ENV };
    resetQuotaStoreForTests();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
}

function claudeResponse(text = 'generated') {
    return new Response(JSON.stringify({
        model: 'test-model',
        content: [{ type: 'text', text }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

function validQuizBody() {
    return { quizData: { age: 30, gender: 'unspecified', weight: 180, goal: 'maintain', meats: ['chicken'] } };
}

function testHeaders() {
    process.env.FUELFIRE_AI_TEST_TOKEN = 'security-release-test-token';
    return { 'x-fuelfire-ai-test-token': process.env.FUELFIRE_AI_TEST_TOKEN };
}

function signWebhook(body, timestamp = Math.floor(Date.now() / 1000)) {
    const raw = JSON.stringify(body);
    const signature = crypto.createHmac('sha256', process.env.FUELFIRE_SUBSCRIPTION_EVENT_SECRET)
        .update(`${timestamp}.${raw}`)
        .digest('hex');
    return {
        raw,
        timestamp,
        headers: { 'x-revenuecat-webhook-signature': `t=${timestamp},v1=${signature}` },
    };
}

function loadPaywallBrowser({ fetchMock, storage = {} } = {}) {
    const values = new Map(Object.entries(storage));
    const localStorage = {
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, String(value)); },
        removeItem(key) { values.delete(key); },
    };
    const browserWindow = {
        fetch: fetchMock,
        location: {
            search: '',
            pathname: '/',
            protocol: 'https:',
            origin: 'https://fuelfire.test',
            href: 'https://fuelfire.test/',
        },
        Capacitor: { Plugins: {} },
    };
    const context = {
        window: browserWindow,
        localStorage,
        console,
        URL,
        URLSearchParams,
        Headers,
        Request,
        setTimeout,
        clearTimeout,
    };
    const source = fs.readFileSync(path.resolve('public/ai-paywall.js'), 'utf8');
    vm.runInNewContext(source, context, { filename: 'public/ai-paywall.js' });
    return { window: browserWindow, localStorage, values };
}

afterEach(restoreEnvironment);

describe('security release boundaries', () => {
    it('denies forged or unauthenticated provider requests before any upstream call', async () => {
        process.env.CLAUDE_API_KEY = 'test-claude-key';
        process.env.USDA_API_KEY = 'test-usda-key';
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        const responses = await Promise.all([
            invokeApi(claudeMealPlanHandler, { body: validQuizBody() }),
            invokeApi(generateMealPlanHandler, { body: { prompt: 'create a plan' } }),
            invokeApi(treadmillVisionHandler, { body: { imageBase64: 'YWJj', mimeType: 'image/jpeg' } }),
            invokeApi(usdaFoodSearchHandler, { method: 'GET', query: { query: 'apple' } }),
            invokeApi(testApiKeyHandler, { method: 'GET' }),
        ]);

        expect(responses.map((response) => response.status)).toEqual([402, 402, 402, 402, 401]);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('keeps the USDA fallback behind the food capability gate', async () => {
        delete process.env.USDA_API_KEY;
        const response = await invokeApi(usdaFoodSearchHandler, {
            method: 'GET',
            query: { query: 'apple' },
        });

        expect(response.status).toBe(402);
        expect(response.body.code).toBe('AI_ACCESS_REQUIRED');
    });

    it('allows the signed installation session header during food parser and vision preflight', async () => {
        const responses = await Promise.all([
            invokeApi(foodParserHandler, { method: 'OPTIONS' }),
            invokeApi(foodVisionHandler, { method: 'OPTIONS' }),
        ]);
        expect(responses.map((response) => response.status)).toEqual([200, 200]);
        responses.forEach((response) => {
            expect(response.headers['Access-Control-Allow-Headers'])
                .toContain('X-FuelFire-Installation-Session');
        });
    });

    it('rejects a caller-selected or cross-ID RevenueCat identity without querying RevenueCat', async () => {
        process.env.FUELFIRE_INSTALLATION_SESSION_SECRET = 'security-release-session-secret';
        process.env.REVENUECAT_SECRET_API_KEY = 'test-revenuecat-secret';
        const session = createInstallationSession();
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        const unbound = await resolveAiAccess({
            headers: { 'x-fuelfire-rc-app-user-id': session.payload.rcAppUserId },
            body: {},
        }, { capability: 'ai_food' });
        const crossId = await resolveAiAccess({
            headers: {
                authorization: `Bearer ${session.token}`,
                'x-fuelfire-rc-app-user-id': 'fuelfire_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            },
            body: {},
        }, { capability: 'ai_food' });

        expect(unbound).toMatchObject({ allowed: false, reason: 'installation_identity_mismatch' });
        expect(crossId).toMatchObject({ allowed: false, reason: 'installation_identity_mismatch' });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('issues only server-selected signed installation IDs and resumes the same binding', async () => {
        process.env.FUELFIRE_INSTALLATION_SESSION_SECRET = 'security-release-session-secret';
        const first = await invokeApi(installationSessionHandler, {
            method: 'POST',
            body: { rcAppUserId: 'attacker-selected-id' },
        });
        expect(first.status).toBe(200);
        expect(first.body.rcAppUserId).toMatch(/^fuelfire_[a-f0-9]{48}$/);
        expect(first.body.rcAppUserId).not.toBe('attacker-selected-id');
        expect(verifyInstallationSession(first.body.installationSessionToken)?.rcAppUserId)
            .toBe(first.body.rcAppUserId);

        const resumed = await invokeApi(installationSessionHandler, {
            method: 'POST',
            body: { installationSessionToken: first.body.installationSessionToken },
        });
        expect(resumed.status).toBe(200);
        expect(resumed.body).toMatchObject({
            rcAppUserId: first.body.rcAppUserId,
            resumed: true,
            renewed: true,
        });
        expect(resumed.body.installationSessionToken).not.toBe(first.body.installationSessionToken);

        const tampered = first.body.installationSessionToken.slice(0, -1)
            + (first.body.installationSessionToken.endsWith('a') ? 'b' : 'a');
        expect(verifyInstallationSession(tampered)).toBeNull();
    });

    it('does not rotate an expired session unless restore/migration is explicit', async () => {
        process.env.FUELFIRE_INSTALLATION_SESSION_SECRET = 'security-release-session-secret';
        const expired = createInstallationSession({ now: Date.now() - (8 * 24 * 60 * 60 * 1000) });
        const renewal = await invokeApi(installationSessionHandler, {
            method: 'POST',
            body: { installationSessionToken: expired.token },
        });
        expect(renewal.status).toBe(409);
        expect(renewal.body.code).toBe('INSTALLATION_SESSION_RENEWAL_REQUIRED');

        const migration = await invokeApi(installationSessionHandler, {
            method: 'POST',
            body: { installationSessionToken: expired.token, explicitMigration: true },
        });
        expect(migration.status).toBe(200);
        expect(migration.body).toMatchObject({ migrated: true, resumed: false });
        expect(migration.body.rcAppUserId).not.toBe(expired.rcAppUserId);
    });

    it('fails closed when the installation session secret is missing', async () => {
        delete process.env.FUELFIRE_INSTALLATION_SESSION_SECRET;
        delete process.env.AI_ACCESS_TOKEN_SECRET;
        const response = await invokeApi(installationSessionHandler, { method: 'POST', body: {} });
        expect(response.status).toBe(503);
        expect(response.body.code).toBe('INSTALLATION_SESSION_CONFIG_REQUIRED');
    });

    it('rejects oversized bodies before provider work', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        const tooLargePrompt = 'x'.repeat(100 * 1024);
        const tooLargeImage = Buffer.alloc(6 * 1024 * 1024, 1).toString('base64');

        const promptResponse = await invokeApi(generateMealPlanHandler, {
            body: { prompt: tooLargePrompt },
        });
        const imageResponse = await invokeApi(treadmillVisionHandler, {
            body: { imageBase64: tooLargeImage, mimeType: 'image/jpeg' },
        });

        expect(promptResponse.status).toBe(413);
        expect(imageResponse.status).toBe(413);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects oversized food parser and vision bodies before authorization or provider work', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        const parserResponse = await invokeApi(foodParserHandler, {
            body: { query: 'x'.repeat(300 * 1024) },
        });
        const visionResponse = await invokeApi(foodVisionHandler, {
            headers: { 'content-length': String(13 * 1024 * 1024) },
            body: { image: 'YWJj', mimeType: 'image/jpeg' },
        });

        expect(parserResponse.status).toBe(413);
        expect(visionResponse.status).toBe(413);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('escapes malicious provider meal-plan text before controlled HTML formatting', async () => {
        process.env.NODE_ENV = 'test';
        process.env.CLAUDE_API_KEY = 'test-claude-key';
        const maliciousText = '# Plan <img src=x onerror=alert(1)>\n\n**Dinner:** <svg onload=alert(2)>';
        const fetchMock = vi.fn().mockResolvedValue(claudeResponse(maliciousText));
        vi.stubGlobal('fetch', fetchMock);

        const response = await invokeApi(generateMealPlanHandler, {
            headers: testHeaders(),
            body: { prompt: 'create a plan' },
        });

        expect(response.status).toBe(200);
        expect(response.body.mealPlan).toContain('&lt;img src=x onerror=alert(1)&gt;');
        expect(response.body.mealPlan).toContain('&lt;svg onload=alert(2)&gt;');
        expect(response.body.mealPlan).not.toContain('<img src=x');
        expect(response.body.mealPlan).not.toContain('<svg onload');
    });

    it('uses the socket IP unless Vercel or an explicitly trusted proxy is configured', () => {
        const request = {
            headers: {
                'x-forwarded-for': '198.51.100.7, 10.0.0.1',
                'x-real-ip': '198.51.100.8',
            },
            socket: { remoteAddress: '10.0.0.2' },
        };

        delete process.env.VERCEL;
        delete process.env.FUELFIRE_TRUST_PROXY;
        expect(getClientIp(request)).toBe('10.0.0.2');

        process.env.FUELFIRE_TRUST_PROXY = 'true';
        expect(getClientIp(request)).toBe('198.51.100.7');

        delete process.env.FUELFIRE_TRUST_PROXY;
        process.env.VERCEL = '1';
        expect(getClientIp(request)).toBe('198.51.100.7');
    });

    it('enforces the configured subject/IP quota before the second provider request', async () => {
        process.env.NODE_ENV = 'test';
        process.env.CLAUDE_API_KEY = 'test-claude-key';
        process.env.CLAUDE_MODEL = 'test-model';
        process.env.FUELFIRE_QUOTA_SUBJECT_LIMIT = '1';
        process.env.FUELFIRE_QUOTA_IP_LIMIT = '5';
        const fetchMock = vi.fn().mockResolvedValue(claudeResponse());
        vi.stubGlobal('fetch', fetchMock);
        const headers = testHeaders();

        const first = await invokeApi(generateMealPlanHandler, {
            headers,
            body: { prompt: 'create a plan' },
        });
        const second = await invokeApi(generateMealPlanHandler, {
            headers,
            body: { prompt: 'create another plan' },
        });

        expect(first.status).toBe(200);
        expect(second.status).toBe(429);
        expect(second.body.code).toBe('REQUEST_QUOTA_EXCEEDED');
        expect(fetchMock).toHaveBeenCalledOnce();
    });

    it('rejects a first request whose cost exceeds either configured quota limit', async () => {
        process.env.FUELFIRE_QUOTA_SUBJECT_LIMIT = '1';
        process.env.FUELFIRE_QUOTA_IP_LIMIT = '1';
        const response = {
            statusCode: 200,
            body: null,
            status(code) { this.statusCode = code; return this; },
            json(body) { this.body = body; return this; },
        };
        const access = await requireAiAccess({
            headers: testHeaders(),
            body: {},
        }, response, { capability: 'planning', quotaCost: 2 });

        expect(access).toBeNull();
        expect(response.statusCode).toBe(429);
        expect(response.body.code).toBe('REQUEST_QUOTA_EXCEEDED');

        const quotaSource = fs.readFileSync(path.resolve('api/_lib/quota.js'), 'utf8');
        expect(quotaSource).toMatch(/if cost > limit then return -1 end\s+if not raw then return 0 end/);
    });

    it('does not enable memory quota from NODE_ENV without the configured test token', async () => {
        process.env.NODE_ENV = 'test';
        delete process.env.FUELFIRE_AI_TEST_TOKEN;
        const quota = await consumeQuota({
            subject: 'test-subject',
            ip: '127.0.0.1',
            allowMemory: true,
        });

        expect(quota).toMatchObject({ allowed: false, reason: 'quota_store_unconfigured' });
    });

    it('bounds Claude retries with a shared provider budget', async () => {
        process.env.CLAUDE_API_KEY = 'test-claude-key';
        process.env.CLAUDE_MODEL = 'test-model';
        process.env.FUELFIRE_PROVIDER_MAX_RETRIES = '3';
        vi.useFakeTimers();
        const fetchMock = vi.fn().mockResolvedValue(new Response('temporary outage', { status: 503 }));
        vi.stubGlobal('fetch', fetchMock);
        const pending = callClaude({
            prompt: 'bounded request',
            providerBudget: createProviderBudget({ limit: 1 }),
        });
        const assertion = expect(pending).rejects.toThrow(/budget exhausted/i);
        await vi.runAllTimersAsync();
        await assertion;
        expect(fetchMock).toHaveBeenCalledOnce();
    });

    it('shares one provider budget across parser stages in a single HTTP request', async () => {
        process.env.NODE_ENV = 'test';
        process.env.FOOD_AI_PROVIDER = 'claude';
        process.env.CLAUDE_API_KEY = 'test-claude-key';
        process.env.FUELFIRE_PROVIDER_BUDGET = '1';
        const lowConfidenceResult = JSON.stringify({
            foods: [{
                name: 'Roasted Fennel',
                calories: 55,
                protein: 2,
                carbs: 12,
                fiber: 4,
                netCarbs: 8,
                fat: 1,
                sugar: 5,
                serving: '1 cup',
                quantity: 1,
                confidence: 'low',
                source: 'standard nutrition reference',
                sourceType: 'estimate',
                sourceUrl: null,
            }],
            overallConfidence: 'low',
        });
        const fetchMock = vi.fn().mockResolvedValue(claudeResponse(lowConfidenceResult));
        vi.stubGlobal('fetch', fetchMock);

        const response = await invokeApi(foodParserHandler, {
            headers: testHeaders(),
            body: { query: 'one cup of roasted fennel', source: 'voice', forceWebSearch: false },
        });

        expect(response.status).toBe(200);
        expect(response.body.source).toBe('voice-ai-claude');
        expect(response.body.aiReviewModel).toBeNull();
        expect(fetchMock).toHaveBeenCalledOnce();
        expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe('claude-sonnet-5');
    });

    it('does not give a food vision fallback a fresh request budget', async () => {
        process.env.NODE_ENV = 'test';
        process.env.FOOD_AI_PROVIDER = 'claude';
        process.env.CLAUDE_API_KEY = 'test-claude-key';
        process.env.FOOD_AI_API_KEY = 'test-qwen-key';
        process.env.FOOD_AI_BASE_URL = 'https://food-ai.test/v1';
        process.env.FUELFIRE_PROVIDER_BUDGET = '1';
        process.env.FUELFIRE_PROVIDER_MAX_RETRIES = '1';
        const fetchMock = vi.fn().mockResolvedValue(new Response('temporary outage', { status: 503 }));
        vi.stubGlobal('fetch', fetchMock);

        const response = await invokeApi(foodVisionHandler, {
            headers: testHeaders(),
            body: { image: 'YWJj', mimeType: 'image/jpeg', forceWebSearch: false },
        });

        expect(response.status).toBe(500);
        expect(fetchMock).toHaveBeenCalledOnce();
        expect(fetchMock.mock.calls[0][0]).toBe('https://api.anthropic.com/v1/messages');
    });

    it('accepts an HMAC RevenueCat event once and treats retries as idempotent', async () => {
        process.env.FUELFIRE_SUBSCRIPTION_EVENT_SECRET = 'security-release-event-secret';
        const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'fuelfire-ledger-'));
        process.env.FUELFIRE_SUBSCRIPTION_LEDGER_PATH = path.join(tempDirectory, 'subscriptions.json');
        const body = {
            api_version: '1.0',
            event: {
                id: 'rc-event-1',
                type: 'INITIAL_PURCHASE',
                app_user_id: 'fuelfire_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                product_id: 'Wellfit.Elite.Monthly',
                transaction_id: 'transaction-1',
                event_timestamp_ms: Date.now(),
                store: 'APP_STORE',
                environment: 'SANDBOX',
            },
        };
        const signed = signWebhook(body);
        const first = await invokeApi(subscriptionsHandler, {
            method: 'POST', body, headers: signed.headers,
        });
        const duplicate = await invokeApi(subscriptionsHandler, {
            method: 'POST', body, headers: signed.headers,
        });
        const browser = await invokeApi(subscriptionsHandler, {
            method: 'POST',
            body: { action: 'purchase', plan: 'premium', user: { email: 'should-not-store@example.com' } },
        });
        const stored = JSON.parse(fs.readFileSync(process.env.FUELFIRE_SUBSCRIPTION_LEDGER_PATH, 'utf8'));

        expect(first.status).toBe(200);
        expect(duplicate.body).toMatchObject({ success: true, duplicate: true });
        expect(browser.status).toBe(401);
        expect(stored).toHaveLength(1);
        expect(stored[0]).toMatchObject({ eventId: 'rc-event-1', appUserId: body.event.app_user_id });
        expect(JSON.stringify(stored)).not.toContain('should-not-store@example.com');
    });

    it('protects ledger reads and never returns browser PII telemetry', async () => {
        process.env.FUELFIRE_SUBSCRIPTION_LEDGER_PATH = path.join(os.tmpdir(), `fuelfire-empty-ledger-${process.pid}.json`);
        const denied = await invokeApi(subscriptionsHandler, { method: 'GET' });
        process.env.FUELFIRE_ADMIN_TOKEN = 'security-release-admin-token';
        const allowed = await invokeApi(subscriptionsHandler, {
            method: 'GET',
            headers: { 'x-fuelfire-admin-token': process.env.FUELFIRE_ADMIN_TOKEN },
        });
        expect(denied.status).toBe(401);
        expect(allowed.status).toBe(200);
        expect(allowed.body).toMatchObject({ events: [], users: [] });
    });

    it('does not expose API-key metadata or send browser subscription telemetry', () => {
        const keyRoute = fs.readFileSync(path.resolve('api/test-api-key.js'), 'utf8');
        const anthropic = fs.readFileSync(path.resolve('api/_lib/anthropic.js'), 'utf8');
        const paywall = fs.readFileSync(path.resolve('public/ai-paywall.js'), 'utf8');
        const bridge = fs.readFileSync(path.resolve('public/revenuecat-bridge.js'), 'utf8');
        const mealPlanPage = fs.readFileSync(path.resolve('public/meal-plan.html'), 'utf8');
        const mealPlanSimplePage = fs.readFileSync(path.resolve('public/meal-plan-simple.html'), 'utf8');
        expect(keyRoute).not.toContain('apiKeyPrefix');
        expect(keyRoute).not.toContain('apiKeyLength');
        expect(keyRoute).not.toContain('CLAUDE_API_KEY');
        expect(anthropic).not.toContain('redactKey');
        expect(paywall).not.toContain("'/api/subscriptions'");
        expect(bridge).not.toContain("'/api/subscriptions'");
        expect(mealPlanPage).toContain("const sourceText = String(rawContent ?? '')");
        expect(mealPlanPage).toContain('let formatted = escapeHtml(sourceText)');
        expect(mealPlanSimplePage).toContain('parseMealPlanContent(escapeHtml(String(mealPlan)))');
    });

    it('renews a browser session without changing its server-selected RevenueCat ID', async () => {
        process.env.FUELFIRE_INSTALLATION_SESSION_SECRET = 'security-release-session-secret';
        const original = createInstallationSession();
        const renewed = renewInstallationSession(original.token);
        const renewalResponse = {
            success: true,
            rcAppUserId: original.rcAppUserId,
            installationSessionToken: renewed.token,
            expiresAt: renewed.expiresAt,
        };
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => renewalResponse });
        const browser = loadPaywallBrowser({
            fetchMock,
            storage: {
                fuelfire_installation_session: JSON.stringify({
                    token: original.token,
                    rcAppUserId: original.rcAppUserId,
                    expiresAt: original.expiresAt,
                }),
                fuelfire_server_rc_app_user_id: original.rcAppUserId,
                rc_app_user_id: original.rcAppUserId,
            },
        });

        const session = await browser.window.__aiAccess.ensureSession();
        expect(session.rcAppUserId).toBe(original.rcAppUserId);
        expect(browser.localStorage.getItem('fuelfire_server_rc_app_user_id')).toBe(original.rcAppUserId);
        expect(browser.window.__aiAccess.getRequestHeaders()['X-FuelFire-Installation-Session'])
            .toBe(renewed.token);
        expect(browser.window.__aiAccess.getRequestHeaders().Authorization)
            .toBe(`Bearer ${renewed.token}`);
        expect(fetchMock).toHaveBeenCalled();
    });

    it('keeps an expired browser binding and only changes identity after explicit migration', async () => {
        process.env.FUELFIRE_INSTALLATION_SESSION_SECRET = 'security-release-session-secret';
        const expired = createInstallationSession({ now: Date.now() - (8 * 24 * 60 * 60 * 1000) });
        const migrated = createInstallationSession();
        const fetchMock = vi.fn(async (_url, request) => {
            const body = JSON.parse(request.body);
            if (body.explicitMigration === true) {
                return {
                    ok: true,
                    json: async () => ({
                        success: true,
                        rcAppUserId: migrated.rcAppUserId,
                        installationSessionToken: migrated.token,
                        expiresAt: migrated.expiresAt,
                        migrated: true,
                    }),
                };
            }
            return {
                ok: false,
                status: 409,
                json: async () => ({ code: 'INSTALLATION_SESSION_RENEWAL_REQUIRED' }),
            };
        });
        const browser = loadPaywallBrowser({
            fetchMock,
            storage: {
                fuelfire_installation_session: JSON.stringify({
                    token: expired.token,
                    rcAppUserId: expired.rcAppUserId,
                    expiresAt: expired.expiresAt,
                }),
                fuelfire_server_rc_app_user_id: expired.rcAppUserId,
                rc_app_user_id: expired.rcAppUserId,
            },
        });

        const unavailable = await browser.window.__aiAccess.ensureSession();
        expect(unavailable).toBeNull();
        expect(browser.localStorage.getItem('fuelfire_server_rc_app_user_id')).toBe(expired.rcAppUserId);
        expect(browser.localStorage.getItem('fuelfire_installation_session')).toContain(expired.token);
        expect(browser.window.__aiAccess.migrationRequired()).toBe(false);

        const restored = await browser.window.__aiAccess.ensureSession({ explicitMigration: true });
        expect(restored.rcAppUserId).toBe(migrated.rcAppUserId);
        expect(browser.localStorage.getItem('fuelfire_legacy_rc_app_user_id')).toBe(expired.rcAppUserId);
        expect(browser.window.__aiAccess.migrationRequired()).toBe(true);
        expect(JSON.parse(fetchMock.mock.calls.at(-1)[1].body).explicitMigration).toBe(true);
    });
});
