import crypto from 'crypto';
import fs from 'fs';
import http from 'http';
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

function signWebhookRaw(raw, timestamp = Math.floor(Date.now() / 1000)) {
    const signature = crypto.createHmac('sha256', process.env.FUELFIRE_SUBSCRIPTION_EVENT_SECRET)
        .update(`${timestamp}.${raw}`)
        .digest('hex');
    return {
        raw,
        timestamp,
        headers: { 'x-revenuecat-webhook-signature': `t=${timestamp},v1=${signature}` },
    };
}

function signWebhook(body, timestamp = Math.floor(Date.now() / 1000)) {
    return signWebhookRaw(JSON.stringify(body), timestamp);
}

async function invokeRawHttp(handler, {
    method = 'POST',
    rawBody = '',
    headers = {},
    includeContentLength = true,
    pathName = '/api/subscriptions',
} = {}) {
    let server;
    try {
        server = http.createServer((nodeReq, nodeRes) => {
            let ended = false;
            const finish = (payload = '') => {
                if (ended) return;
                ended = true;
                nodeRes.statusCode = response.statusCode;
                Object.entries(response.headers).forEach(([key, value]) => nodeRes.setHeader(key, value));
                nodeRes.end(payload);
            };
            const response = {
                statusCode: 200,
                headers: {},
                setHeader(key, value) {
                    this.headers[key] = value;
                },
                status(code) {
                    this.statusCode = code;
                    return this;
                },
                json(payload) {
                    finish(JSON.stringify(payload));
                    return this;
                },
                end(payload = '') {
                    finish(payload);
                    return this;
                },
            };

            Promise.resolve(handler(nodeReq, response))
                .then(() => {
                    if (!ended) finish();
                })
                .catch((error) => {
                    if (!ended) {
                        response.statusCode = 500;
                        finish(JSON.stringify({ error: error.message }));
                    }
                });
        });

        await new Promise((resolve, reject) => {
            server.once('error', reject);
            server.listen(0, '127.0.0.1', resolve);
        });
        const address = server.address();
        return await new Promise((resolve, reject) => {
            const requestHeaders = {
                'content-type': 'application/json',
                ...headers,
            };
            if (includeContentLength) requestHeaders['content-length'] = Buffer.byteLength(rawBody);
            const request = http.request({
                hostname: '127.0.0.1',
                port: address.port,
                path: pathName,
                method,
                headers: requestHeaders,
            }, (response) => {
                const chunks = [];
                response.on('data', (chunk) => chunks.push(chunk));
                response.on('end', () => {
                    const text = Buffer.concat(chunks).toString('utf8');
                    let body = text;
                    try {
                        body = JSON.parse(text);
                    } catch {
                        // Preserve non-JSON diagnostics for a failed harness response.
                    }
                    resolve({ status: response.statusCode, headers: response.headers, body });
                });
                response.on('error', reject);
            });
            request.on('error', reject);
            request.end(rawBody);
        });
    } finally {
        if (server) await new Promise((resolve) => server.close(resolve));
    }
}

function loadPaywallBrowser({ fetchMock, storage = {}, location = {}, purchases = null } = {}) {
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
            ...location,
        },
        Capacitor: { Plugins: purchases ? { Purchases: purchases } : {} },
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

function loadFuelFireAuthBrowser({ fetchMock, storage = {}, sharedAccess = null } = {}) {
    const values = new Map(Object.entries(storage));
    const localStorage = {
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, String(value)); },
        removeItem(key) { values.delete(key); },
    };
    const browserWindow = {
        fetch: fetchMock,
        FUELFIRE_API_BASE_URL: 'https://fuelfire.test',
        ...(sharedAccess ? { __aiAccess: sharedAccess } : {}),
    };
    const context = {
        window: browserWindow,
        localStorage,
        fetch: fetchMock,
        console,
        setTimeout,
        clearTimeout,
    };
    const source = fs.readFileSync(path.resolve('public/fuelfire-auth.js'), 'utf8');
    vm.runInNewContext(source, context, { filename: 'public/fuelfire-auth.js' });
    return { window: browserWindow, localStorage, values };
}

function loadCombinedAuthBrowser({ fetchMock, storage = {}, location = {}, purchases = null } = {}) {
    const values = new Map(Object.entries(storage));
    const localStorage = {
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, String(value)); },
        removeItem(key) { values.delete(key); },
    };
    const browserWindow = {
        fetch: fetchMock,
        FUELFIRE_API_BASE_URL: 'https://fuelfire-app.vercel.app',
        location: {
            search: '',
            pathname: '/',
            protocol: 'https:',
            origin: 'https://fuelfire.test',
            href: 'https://fuelfire.test/',
            ...location,
        },
        Capacitor: { Plugins: purchases ? { Purchases: purchases } : {} },
    };
    const context = {
        window: browserWindow,
        localStorage,
        fetch: fetchMock,
        console,
        URL,
        URLSearchParams,
        Headers,
        Request,
        setTimeout,
        clearTimeout,
    };
    const paywallSource = fs.readFileSync(path.resolve('public/ai-paywall.js'), 'utf8');
    const authSource = fs.readFileSync(path.resolve('public/fuelfire-auth.js'), 'utf8');
    vm.runInNewContext(paywallSource, context, { filename: 'public/ai-paywall.js' });
    // In a browser, bare fetch resolves to the current window.fetch. Keep the
    // same relationship after the paywall installs its credential wrapper.
    context.fetch = browserWindow.fetch;
    vm.runInNewContext(authSource, context, { filename: 'public/fuelfire-auth.js' });
    return { window: browserWindow, localStorage, values };
}

function createRedisLedgerMock() {
    const serializedEvents = [];
    const eventIds = new Set();
    const fetchMock = vi.fn(async (_url, request) => {
        const command = JSON.parse(request.body);
        if (command[0] === 'EVAL') {
            const eventIdKey = command[4];
            if (eventIds.has(eventIdKey)) {
                return new Response(JSON.stringify({ result: 0 }), { status: 200 });
            }
            eventIds.add(eventIdKey);
            serializedEvents.unshift(command[5]);
            serializedEvents.splice(500);
            return new Response(JSON.stringify({ result: 1 }), { status: 200 });
        }
        if (command[0] === 'LRANGE') {
            return new Response(JSON.stringify({ result: serializedEvents.slice(0, 500) }), { status: 200 });
        }
        return new Response(JSON.stringify({ result: null }), { status: 400 });
    });
    return { fetchMock, serializedEvents };
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

    it('keeps the same budget across all eight internal food hint alternatives', async () => {
        process.env.NODE_ENV = 'test';
        process.env.FOOD_AI_PROVIDER = 'claude';
        process.env.CLAUDE_API_KEY = 'test-claude-key';
        process.env.FUELFIRE_PROVIDER_BUDGET = '1';
        process.env.FUELFIRE_PROVIDER_MAX_RETRIES = '1';
        process.env.FUELFIRE_INTERNAL_API_TOKEN = 'internal-only-token';
        const fetchMock = vi.fn().mockResolvedValue(new Response('temporary outage', { status: 503 }));
        vi.stubGlobal('fetch', fetchMock);

        const response = await invokeApi(foodVisionHandler, {
            headers: {
                ...testHeaders(),
                host: 'attacker.example',
                'x-forwarded-host': 'attacker.example',
            },
            body: {
                image: 'YWJj',
                mimeType: 'image/jpeg',
                imageContext: 'unlisted plated food',
                imageContextAlternatives: Array.from({ length: 8 }, (_, index) => `unlisted food alternative ${index + 1}`),
            },
        });

        expect(response.status).toBe(200);
        expect(fetchMock).toHaveBeenCalledOnce();
        expect(fetchMock.mock.calls[0][0]).toBe('https://api.anthropic.com/v1/messages');
        expect(fetchMock.mock.calls.flat().join(' ')).not.toContain('attacker.example');

        const visionSource = fs.readFileSync(path.resolve('api/ai-food-vision.js'), 'utf8');
        expect(visionSource).not.toContain('/api/ai-food-parser');
        expect(visionSource.match(/lookupFirstParserMatch\(req,/g)).toHaveLength(4);
    });

    it('accepts an HMAC RevenueCat event once and treats retries as idempotent', async () => {
        process.env.NODE_ENV = 'test';
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
            method: 'POST', body, rawBody: signed.raw, headers: signed.headers,
        });
        const duplicate = await invokeApi(subscriptionsHandler, {
            method: 'POST', body, rawBody: signed.raw, headers: signed.headers,
        });
        const browser = await invokeApi(subscriptionsHandler, {
            method: 'POST',
            body: { action: 'purchase', plan: 'premium', user: { email: 'should-not-store@example.com' } },
            rawBody: JSON.stringify({ action: 'purchase', plan: 'premium', user: { email: 'should-not-store@example.com' } }),
        });
        const stored = JSON.parse(fs.readFileSync(process.env.FUELFIRE_SUBSCRIPTION_LEDGER_PATH, 'utf8'));

        expect(first.status).toBe(200);
        expect(duplicate.body).toMatchObject({ success: true, duplicate: true });
        expect(browser.status).toBe(401);
        expect(stored).toHaveLength(1);
        expect(stored[0]).toMatchObject({ eventId: 'rc-event-1', appUserId: body.event.app_user_id });
        expect(JSON.stringify(stored)).not.toContain('should-not-store@example.com');
    });

    it('verifies a pretty-printed RevenueCat signature over the real Node HTTP request bytes', async () => {
        process.env.NODE_ENV = 'test';
        process.env.FUELFIRE_SUBSCRIPTION_EVENT_SECRET = 'security-release-event-secret';
        const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'fuelfire-raw-webhook-'));
        process.env.FUELFIRE_SUBSCRIPTION_LEDGER_PATH = path.join(tempDirectory, 'subscriptions.json');
        const body = {
            api_version: '1.0',
            event: {
                id: 'rc-pretty-json-1',
                type: 'INITIAL_PURCHASE',
                app_user_id: 'fuelfire_cccccccccccccccccccccccccccccccccccccccccccccccc',
                product_id: 'Wellfit.Elite.Monthly',
                transaction_id: 'transaction-pretty-1',
                event_timestamp_ms: 1700000000000,
                store: 'APP_STORE',
                environment: 'SANDBOX',
            },
        };
        const rawBody = JSON.stringify(body, null, 2)
            .replace(`"event_timestamp_ms": ${body.event.event_timestamp_ms}`, `"event_timestamp_ms": ${body.event.event_timestamp_ms}.00`);
        const signed = signWebhookRaw(rawBody);
        const response = await invokeRawHttp(subscriptionsHandler, {
            rawBody,
            headers: signed.headers,
        });
        const stored = JSON.parse(fs.readFileSync(process.env.FUELFIRE_SUBSCRIPTION_LEDGER_PATH, 'utf8'));

        expect(rawBody).not.toBe(JSON.stringify(body));
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({ success: true, duplicate: false });
        expect(stored).toHaveLength(1);
        expect(stored[0]).toMatchObject({ eventId: body.event.id, appUserId: body.event.app_user_id });
    });

    it('fails closed when a signed webhook has no exact raw body available', async () => {
        process.env.NODE_ENV = 'test';
        process.env.FUELFIRE_SUBSCRIPTION_EVENT_SECRET = 'security-release-event-secret';
        const body = {
            api_version: '1.0',
            event: {
                id: 'rc-no-raw-body-1',
                type: 'INITIAL_PURCHASE',
                app_user_id: 'fuelfire_dddddddddddddddddddddddddddddddddddddddddddddddd',
                product_id: 'Wellfit.Elite.Monthly',
            },
        };
        const signed = signWebhook(body);
        const response = await invokeApi(subscriptionsHandler, {
            method: 'POST', body, headers: signed.headers,
        });

        expect(response.status).toBe(503);
        expect(response.body.code).toBe('SUBSCRIPTION_RAW_BODY_UNAVAILABLE');
    });

    it('enforces the raw stream body limit when chunked length is unavailable', async () => {
        process.env.NODE_ENV = 'test';
        process.env.FUELFIRE_SUBSCRIPTION_EVENT_SECRET = 'security-release-event-secret';
        const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'fuelfire-raw-limit-'));
        process.env.FUELFIRE_SUBSCRIPTION_LEDGER_PATH = path.join(tempDirectory, 'subscriptions.json');
        const body = {
            api_version: '1.0',
            event: {
                id: 'rc-raw-limit-1',
                type: 'INITIAL_PURCHASE',
                app_user_id: 'fuelfire_eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
                product_id: 'Wellfit.Elite.Monthly',
            },
        };
        const rawBody = `${JSON.stringify(body)}${' '.repeat(128 * 1024)}`;
        const signed = signWebhookRaw(rawBody);
        const response = await invokeRawHttp(subscriptionsHandler, {
            rawBody,
            headers: signed.headers,
            includeContentLength: false,
        });

        expect(response.status).toBe(413);
        expect(response.body.code).toBe('REQUEST_BODY_TOO_LARGE');
        expect(fs.existsSync(process.env.FUELFIRE_SUBSCRIPTION_LEDGER_PATH)).toBe(false);
    });

    it('fails closed for production subscription writes when durable Redis is missing or unavailable', async () => {
        process.env.NODE_ENV = 'production';
        delete process.env.FUELFIRE_REDIS_URL;
        delete process.env.FUELFIRE_REDIS_TOKEN;
        delete process.env.UPSTASH_REDIS_REST_URL;
        delete process.env.UPSTASH_REDIS_REST_TOKEN;
        process.env.FUELFIRE_SUBSCRIPTION_EVENT_SECRET = 'security-release-event-secret';
        const body = {
            api_version: '1.0',
            event: {
                id: 'production-ledger-missing',
                type: 'INITIAL_PURCHASE',
                app_user_id: 'fuelfire_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                product_id: 'Wellfit.Elite.Monthly',
                transaction_id: 'transaction-production-1',
                event_timestamp_ms: Date.now(),
                store: 'APP_STORE',
                environment: 'SANDBOX',
            },
        };
        const signed = signWebhook(body);
        const missing = await invokeApi(subscriptionsHandler, {
            method: 'POST', body, rawBody: signed.raw, headers: signed.headers,
        });
        expect(missing.status).toBe(503);
        expect(missing.body.code).toBe('SUBSCRIPTION_LEDGER_UNAVAILABLE');

        process.env.FUELFIRE_REDIS_URL = 'https://redis.test';
        process.env.FUELFIRE_REDIS_TOKEN = 'redis-test-token';
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('store down', { status: 503 })));
        const unavailable = await invokeApi(subscriptionsHandler, {
            method: 'POST', body, rawBody: signed.raw, headers: signed.headers,
        });
        expect(unavailable.status).toBe(503);
        expect(unavailable.body.code).toBe('SUBSCRIPTION_LEDGER_UNAVAILABLE');
    });

    it('uses Redis atomics for durable subscription deduplication and a bounded event read', async () => {
        process.env.NODE_ENV = 'production';
        process.env.FUELFIRE_REDIS_URL = 'https://redis.test';
        process.env.FUELFIRE_REDIS_TOKEN = 'redis-test-token';
        process.env.FUELFIRE_SUBSCRIPTION_EVENT_SECRET = 'security-release-event-secret';
        process.env.FUELFIRE_ADMIN_TOKEN = 'security-release-admin-token';
        const { fetchMock } = createRedisLedgerMock();
        vi.stubGlobal('fetch', fetchMock);
        const body = {
            api_version: '1.0',
            event: {
                id: 'redis-ledger-event-1',
                type: 'INITIAL_PURCHASE',
                app_user_id: 'fuelfire_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
                product_id: 'Wellfit.Elite.Monthly',
                transaction_id: 'transaction-redis-1',
                event_timestamp_ms: Date.now(),
                store: 'APP_STORE',
                environment: 'SANDBOX',
            },
        };
        const signed = signWebhook(body);
        const first = await invokeApi(subscriptionsHandler, {
            method: 'POST', body, rawBody: signed.raw, headers: signed.headers,
        });
        const duplicate = await invokeApi(subscriptionsHandler, {
            method: 'POST', body, rawBody: signed.raw, headers: signed.headers,
        });
        const read = await invokeApi(subscriptionsHandler, {
            method: 'GET',
            headers: { 'x-fuelfire-admin-token': process.env.FUELFIRE_ADMIN_TOKEN },
        });

        expect(first.body).toMatchObject({ success: true, duplicate: false });
        expect(duplicate.body).toMatchObject({ success: true, duplicate: true });
        expect(read.status).toBe(200);
        expect(read.body.events).toHaveLength(1);
        const commands = fetchMock.mock.calls.map((call) => JSON.parse(call[1].body));
        expect(commands[0][0]).toBe('EVAL');
        expect(commands[0][1]).toContain('LTRIM');
        expect(commands.at(-1)).toEqual([
            'LRANGE',
            expect.stringContaining(':events'),
            '0',
            '499',
        ]);
    });

    it('protects ledger reads and never returns browser PII telemetry', async () => {
        process.env.NODE_ENV = 'test';
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

    it('waits for the installation session before photo and typed AI fetches on a Capacitor origin', async () => {
        process.env.FUELFIRE_INSTALLATION_SESSION_SECRET = 'security-release-session-secret';
        const session = createInstallationSession({ now: Date.now() });
        let releaseBootstrap;
        const fetchMock = vi.fn((url) => {
            if (String(url) === 'https://fuelfire-app.vercel.app/api/installation-session') {
                return new Promise((resolve) => {
                    releaseBootstrap = () => resolve({
                        ok: true,
                        json: async () => ({
                            success: true,
                            installationSessionToken: session.token,
                            rcAppUserId: session.payload.rcAppUserId,
                            expiresAt: session.expiresAt,
                        }),
                    });
                });
            }
            return Promise.resolve({ ok: true, json: async () => ({ success: true }) });
        });
        const browser = loadPaywallBrowser({
            fetchMock,
            location: {
                protocol: 'capacitor:',
                origin: 'capacitor://localhost',
                href: 'capacitor://localhost/index.html',
            },
        });

        const photoRequest = browser.window.fetch('/api/ai-food-vision', {
            method: 'POST',
            body: JSON.stringify({ image: 'YWJj' }),
        });
        const typedRequest = browser.window.fetch('/api/ai-food-parser', {
            method: 'POST',
            body: JSON.stringify({ query: 'apple' }),
        });

        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(releaseBootstrap).toEqual(expect.any(Function));
        expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('/api/ai-food-')).length).toBe(0);

        releaseBootstrap();
        await Promise.all([photoRequest, typedRequest]);

        const aiCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('/api/ai-food-'));
        expect(aiCalls).toHaveLength(2);
        aiCalls.forEach(([url, request]) => {
            expect(String(url)).toMatch(/^https:\/\/fuelfire-app\.vercel\.app\/api\/ai-food-/);
            expect(request.headers.get('X-FuelFire-Installation-Session')).toBe(session.token);
            expect(request.headers.get('Authorization')).toBe(`Bearer ${session.token}`);
        });
        expect(fetchMock.mock.calls[0][0]).toBe('https://fuelfire-app.vercel.app/api/installation-session');
    });

    it('coalesces combined paywall and FuelFire auth bootstrap into one stable RevenueCat session', async () => {
        process.env.FUELFIRE_INSTALLATION_SESSION_SECRET = 'security-release-session-secret';
        const session = createInstallationSession();
        let releaseBootstrap;
        const purchases = {
            configure: vi.fn().mockResolvedValue(undefined),
            getCustomerInfo: vi.fn().mockResolvedValue({ customerInfo: { entitlements: { active: {} } } }),
            addCustomerInfoUpdateListener: vi.fn(),
        };
        const fetchMock = vi.fn((url) => {
            if (String(url) === 'https://fuelfire-app.vercel.app/api/installation-session') {
                return new Promise((resolve) => {
                    releaseBootstrap = () => resolve({
                        ok: true,
                        json: async () => ({
                            success: true,
                            installationSessionToken: session.token,
                            rcAppUserId: session.rcAppUserId,
                            expiresAt: session.expiresAt,
                        }),
                    });
                });
            }
            if (String(url).endsWith('/api/claude-meal-plan')) {
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ success: true, content: 'meal plan' }),
                });
            }
            return Promise.resolve({ ok: true, json: async () => ({ success: true }) });
        });
        const browser = loadCombinedAuthBrowser({
            fetchMock,
            purchases,
            location: {
                protocol: 'capacitor:',
                origin: 'capacitor://localhost',
                href: 'capacitor://localhost/index.html',
            },
        });
        const pending = browser.window.fuelFireAuth.generateMealPlan(validQuizBody());

        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(releaseBootstrap).toEqual(expect.any(Function));
        expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/api/claude-meal-plan'))).toHaveLength(0);

        releaseBootstrap();
        await pending;
        await new Promise((resolve) => setTimeout(resolve, 0));

        const sessionCalls = fetchMock.mock.calls.filter(([url]) => String(url) === 'https://fuelfire-app.vercel.app/api/installation-session');
        expect(sessionCalls).toHaveLength(1);
        expect(JSON.parse(sessionCalls[0][1].body)).toEqual({});
        expect(browser.window.__aiAccess.getServerRcAppUserId()).toBe(session.rcAppUserId);
        expect(purchases.configure).toHaveBeenCalledWith(expect.objectContaining({ appUserID: session.rcAppUserId }));

        const mealPlanCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/api/claude-meal-plan'));
        expect(mealPlanCall).toBeTruthy();
        expect(mealPlanCall[1].headers.get('X-FuelFire-Installation-Session')).toBe(session.token);
        expect(mealPlanCall[1].headers.get('Authorization')).toBe(`Bearer ${session.token}`);
    });

    it('does not continue a combined-script AI request with an expired installation token', async () => {
        process.env.FUELFIRE_INSTALLATION_SESSION_SECRET = 'security-release-session-secret';
        const expired = createInstallationSession({ now: Date.now() - (8 * 24 * 60 * 60 * 1000) });
        let releaseBootstrap;
        const purchases = {
            configure: vi.fn().mockResolvedValue(undefined),
            getCustomerInfo: vi.fn(),
            addCustomerInfoUpdateListener: vi.fn(),
        };
        const fetchMock = vi.fn((url) => {
            if (String(url) === 'https://fuelfire-app.vercel.app/api/installation-session') {
                return new Promise((resolve) => {
                    releaseBootstrap = () => resolve({
                        ok: false,
                        status: 409,
                        json: async () => ({ code: 'INSTALLATION_SESSION_RENEWAL_REQUIRED' }),
                    });
                });
            }
            return Promise.resolve({ ok: true, json: async () => ({ success: true }) });
        });
        const browser = loadCombinedAuthBrowser({
            fetchMock,
            purchases,
            storage: {
                fuelfire_installation_session: JSON.stringify({
                    token: expired.token,
                    rcAppUserId: expired.rcAppUserId,
                    expiresAt: expired.expiresAt,
                }),
                fuelfire_server_rc_app_user_id: expired.rcAppUserId,
                rc_app_user_id: expired.rcAppUserId,
            },
            location: {
                protocol: 'capacitor:',
                origin: 'capacitor://localhost',
                href: 'capacitor://localhost/index.html',
            },
        });
        const pending = browser.window.fuelFireAuth.generateMealPlan(validQuizBody());

        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(releaseBootstrap).toEqual(expect.any(Function));
        releaseBootstrap();

        await expect(pending).rejects.toMatchObject({ code: 'INSTALLATION_SESSION_RENEWAL_REQUIRED' });
        expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/api/claude-meal-plan'))).toHaveLength(0);
        expect(fetchMock.mock.calls.filter(([url]) => String(url) === 'https://fuelfire-app.vercel.app/api/installation-session')).toHaveLength(1);
        expect(browser.localStorage.getItem('fuelfire_server_rc_app_user_id')).toBe(expired.rcAppUserId);
        expect(purchases.configure).not.toHaveBeenCalled();
    });

    it('clears cached RevenueCat entitlements after an authoritative empty success but preserves them on error', async () => {
        const active = { Premium_Access: { expires_date: null } };
        const purchases = {
            getCustomerInfo: vi.fn()
                .mockResolvedValueOnce({ customerInfo: { entitlements: { active } } })
                .mockRejectedValueOnce(new Error('RevenueCat unavailable'))
                .mockResolvedValueOnce({ customerInfo: { entitlements: { active: {} } } }),
        };
        const browser = loadPaywallBrowser({
            fetchMock: vi.fn().mockResolvedValue({ ok: false, status: 503 }),
            purchases,
        });

        await browser.window.__aiAccess.refreshEntitlements();
        expect(browser.window.__aiAccess.hasAccess()).toBe(true);
        expect(browser.localStorage.getItem('rc_entitlements')).toContain('Premium_Access');

        await browser.window.__aiAccess.refreshEntitlements();
        expect(browser.window.__aiAccess.hasAccess()).toBe(true);
        expect(browser.localStorage.getItem('rc_entitlements')).toContain('Premium_Access');

        await browser.window.__aiAccess.refreshEntitlements();
        expect(browser.window.__aiAccess.hasAccess()).toBe(false);
        expect(browser.localStorage.getItem('rc_entitlements')).toBeNull();
    });

    it('awaits the installation session before the first FuelFire meal-plan request', async () => {
        process.env.FUELFIRE_INSTALLATION_SESSION_SECRET = 'security-release-session-secret';
        const session = createInstallationSession();
        let releaseBootstrap;
        const fetchMock = vi.fn((url) => {
            if (String(url).endsWith('/api/installation-session')) {
                return new Promise((resolve) => {
                    releaseBootstrap = () => resolve({
                        ok: true,
                        json: async () => ({
                            success: true,
                            installationSessionToken: session.token,
                            rcAppUserId: session.rcAppUserId,
                            expiresAt: session.expiresAt,
                        }),
                    });
                });
            }
            return Promise.resolve({
                ok: true,
                json: async () => ({ success: true, content: 'meal plan' }),
            });
        });
        const browser = loadFuelFireAuthBrowser({ fetchMock });
        const pending = browser.window.fuelFireAuth.generateMealPlan(validQuizBody());

        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(releaseBootstrap).toEqual(expect.any(Function));
        expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/api/claude-meal-plan'))).toHaveLength(0);

        releaseBootstrap();
        await pending;
        const mealPlanCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/api/claude-meal-plan'));
        expect(mealPlanCall).toBeTruthy();
        expect(mealPlanCall[1].headers['X-FuelFire-Installation-Session']).toBe(session.token);
        expect(mealPlanCall[1].headers.Authorization).toBe(`Bearer ${session.token}`);
    });

    it('does not silently replace an expired FuelFire binding during an AI request', async () => {
        process.env.FUELFIRE_INSTALLATION_SESSION_SECRET = 'security-release-session-secret';
        const expired = createInstallationSession({ now: Date.now() - (8 * 24 * 60 * 60 * 1000) });
        const fetchMock = vi.fn((url) => {
            if (String(url).endsWith('/api/installation-session')) {
                return Promise.resolve({
                    ok: false,
                    status: 409,
                    json: async () => ({ code: 'INSTALLATION_SESSION_RENEWAL_REQUIRED' }),
                });
            }
            return Promise.resolve({ ok: true, json: async () => ({ success: true }) });
        });
        const browser = loadFuelFireAuthBrowser({
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

        await expect(browser.window.fuelFireAuth.generateMealPlan(validQuizBody()))
            .rejects.toMatchObject({ code: 'INSTALLATION_SESSION_RENEWAL_REQUIRED' });
        expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/api/claude-meal-plan'))).toHaveLength(0);
        expect(browser.localStorage.getItem('fuelfire_installation_session')).toContain(expired.token);
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
