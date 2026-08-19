import crypto from 'crypto';

const PLANNING_ENTITLEMENTS = ['Core_Access', 'Core_access', 'core', 'Premium_Access', 'Premium_access', 'premium'];
const AI_FOOD_ENTITLEMENTS = ['Elite_Access', 'Elite_access', 'elite', 'ai_food'];
const AI_ENTITLEMENTS = [...PLANNING_ENTITLEMENTS, ...AI_FOOD_ENTITLEMENTS];
const CORE_PRODUCT_IDS = ['Wellfit.core.monthly', 'Wellfit.core.yearly'];
const AI_FOOD_PRODUCT_IDS = ['Wellfit.Elite.Monthly', 'Wellfit.Elite.Yearly'];
const MEAL_IMPORT_PRODUCT_IDS = ['Wellfit.MealPlan.Import'];
const TEST_PRODUCT_IDS = ['Wellfit.Test.Monthly'];
const LEGACY_PRODUCT_IDS = ['Wellfit.Premium.Monthly'];
const AI_PRODUCT_IDS = [...CORE_PRODUCT_IDS, ...AI_FOOD_PRODUCT_IDS, ...MEAL_IMPORT_PRODUCT_IDS, ...TEST_PRODUCT_IDS, ...LEGACY_PRODUCT_IDS];
const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

function getHeader(req, name) {
    const headers = req?.headers || {};
    const lowerName = name.toLowerCase();
    return headers[name]
        || headers[lowerName]
        || Object.entries(headers).find(([key]) => key.toLowerCase() === lowerName)?.[1]
        || '';
}

function normalizeHeaderValue(value) {
    if (Array.isArray(value)) return value[0] || '';
    return String(value || '').trim();
}

function timingSafeEqualString(actual, expected) {
    const a = Buffer.from(String(actual || ''));
    const b = Buffer.from(String(expected || ''));
    if (!a.length || !b.length || a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}

function getBearerToken(req) {
    const auth = normalizeHeaderValue(getHeader(req, 'authorization'));
    const match = auth.match(/^Bearer\s+(.+)$/i);
    return match ? match[1].trim() : '';
}

function getTokenSecret() {
    return process.env.AI_ACCESS_TOKEN_SECRET
        || process.env.FUELFIRE_ACCESS_TOKEN_SECRET
        || process.env.FUELFIRE_ADMIN_TOKEN
        || '';
}

function base64url(input) {
    return Buffer.from(input)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

function fromBase64url(input) {
    const padded = String(input || '').replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(padded, 'base64').toString('utf8');
}

function signTokenPart(data, secret) {
    return crypto
        .createHmac('sha256', secret)
        .update(data)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

function isActiveExpiry(expiresAt) {
    if (!expiresAt) return true;
    const time = typeof expiresAt === 'number' ? expiresAt : new Date(expiresAt).getTime();
    return Number.isFinite(time) && time > Date.now();
}

function envFlagEnabled(value, fallback = true) {
    if (value === undefined || value === null || value === '') return fallback;
    const normalized = String(value).trim().toLowerCase();
    return !['0', 'false', 'off', 'no', 'disabled'].includes(normalized);
}

export function promoAccessIsEnabled() {
    return envFlagEnabled(process.env.FUELFIRE_PROMO_ENABLED, true);
}

function promoRevokedAtMs() {
    const raw = process.env.FUELFIRE_PROMO_REVOKED_AT || '';
    if (!raw) return 0;
    const time = /^\d+$/.test(String(raw).trim()) ? Number(raw) : new Date(raw).getTime();
    if (!Number.isFinite(time) || time <= 0) return 0;
    return time < 10_000_000_000 ? time * 1000 : time;
}

function isPromoTokenPayload(payload = {}) {
    const normalizedPlan = normalizePlan(payload.plan);
    return payload.source === 'promo' || ['promo', 'promo_ai_log', 'trial'].includes(normalizedPlan);
}

function promoTokenIsAllowed(payload = {}) {
    if (!isPromoTokenPayload(payload)) return true;
    if (!promoAccessIsEnabled()) return false;
    const revokedAt = promoRevokedAtMs();
    if (!revokedAt) return true;
    const issuedAt = Number(payload.iat || 0) * 1000;
    return issuedAt > revokedAt;
}

function normalizePlan(plan) {
    const normalized = String(plan || '').trim().toLowerCase();
    if (!normalized) return '';
    if (normalized.includes('owner_unlock')) return 'owner_unlock';
    if (normalized.includes('test')) return 'test_access';
    if (normalized.includes('meal') && normalized.includes('import')) return 'meal_import';
    if (normalized.includes('promo_ai_log')) return 'promo_ai_log';
    if (normalized === 'promo' || normalized.includes('promo')) return 'promo';
    if (normalized === 'trial' || normalized.includes('trial')) return 'trial';
    if (normalized.includes('elite') || normalized.includes('ai_food') || normalized.includes('ai-food') || normalized.includes('ai_monthly') || normalized.includes('ai_yearly')) return 'ai_food';
    if (normalized.includes('core')) return 'core';
    if (normalized.includes('premium')) return 'legacy_premium';
    return normalized;
}

function isAiPlan(plan) {
    const normalized = normalizePlan(plan);
    return ['core', 'ai_food', 'test_access', 'legacy_premium', 'owner_unlock', 'promo', 'trial', 'promo_ai_log'].includes(normalized)
        || AI_ENTITLEMENTS.map((value) => normalizePlan(value)).includes(normalized)
        || AI_PRODUCT_IDS.map((value) => normalizePlan(value)).includes(normalized);
}

function normalizeCapability(capability) {
    const normalized = String(capability || 'planning').trim().toLowerCase();
    if (normalized.includes('food') || normalized.includes('calorie') || normalized.includes('macro')) return 'ai_food';
    if (normalized.includes('import') || normalized.includes('upload') || normalized.includes('file')) return 'meal_import';
    return 'planning';
}

export function planAllowsCapability(plan, capability = 'planning') {
    const normalizedPlan = normalizePlan(plan);
    const normalizedCapability = normalizeCapability(capability);

    if (['owner_unlock', 'test_access', 'promo', 'trial'].includes(normalizedPlan)) return true;
    if (normalizedCapability === 'meal_import') {
        return ['core', 'ai_food', 'legacy_premium', 'meal_import', 'promo_ai_log'].includes(normalizedPlan);
    }
    if (normalizedCapability === 'ai_food') {
        return ['ai_food', 'promo_ai_log'].includes(normalizedPlan);
    }
    return ['core', 'ai_food', 'legacy_premium'].includes(normalizedPlan);
}

export function createAccessToken(payload = {}, options = {}) {
    const secret = getTokenSecret();
    if (!secret) {
        throw new Error('AI_ACCESS_TOKEN_SECRET or FUELFIRE_ADMIN_TOKEN must be configured to issue access tokens.');
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const ttlSeconds = Number(options.ttlSeconds || process.env.AI_ACCESS_TOKEN_TTL_SECONDS || DEFAULT_TOKEN_TTL_SECONDS);
    const body = {
        iss: 'fuelfire',
        aud: 'fuelfire-ai',
        iat: nowSeconds,
        exp: nowSeconds + Math.max(300, ttlSeconds),
        scope: 'ai',
        ...payload,
        plan: normalizePlan(payload.plan || 'premium'),
    };

    const encoded = base64url(JSON.stringify(body));
    const signature = signTokenPart(encoded, secret);
    return `${encoded}.${signature}`;
}

export function verifyAccessToken(token) {
    const secret = getTokenSecret();
    if (!secret || !token || typeof token !== 'string') return null;

    const [encoded, signature] = token.split('.');
    if (!encoded || !signature) return null;

    const expected = signTokenPart(encoded, secret);
    if (!timingSafeEqualString(signature, expected)) return null;

    try {
        const payload = JSON.parse(fromBase64url(encoded));
        const nowSeconds = Math.floor(Date.now() / 1000);
        if (payload.aud !== 'fuelfire-ai' || payload.exp <= nowSeconds) return null;
        if (payload.scope !== 'ai') return null;
        if (!isAiPlan(payload.plan)) return null;
        if (!promoTokenIsAllowed(payload)) return null;
        return payload;
    } catch {
        return null;
    }
}

export function isAdminAuthorized(req) {
    const expected = process.env.FUELFIRE_ADMIN_TOKEN || process.env.ADMIN_API_TOKEN || '';
    if (!expected) return false;

    const supplied = normalizeHeaderValue(getHeader(req, 'x-fuelfire-admin-token'))
        || normalizeHeaderValue(getHeader(req, 'x-admin-token'))
        || getBearerToken(req);
    return timingSafeEqualString(supplied, expected);
}

export function requireAdmin(req, res) {
    if (isAdminAuthorized(req)) return true;
    res.status(401).json({
        success: false,
        error: 'Admin authorization required',
        code: 'ADMIN_AUTH_REQUIRED',
    });
    return false;
}

export function isInternalAuthorized(req) {
    const expected = process.env.FUELFIRE_INTERNAL_API_TOKEN || '';
    if (!expected) return false;
    const supplied = normalizeHeaderValue(getHeader(req, 'x-fuelfire-internal-token'));
    return timingSafeEqualString(supplied, expected);
}

export function isTestAuthorized(req) {
    const expected = process.env.FUELFIRE_AI_TEST_TOKEN || '';
    if (!expected) return false;
    const supplied = normalizeHeaderValue(getHeader(req, 'x-fuelfire-ai-test-token'));
    return timingSafeEqualString(supplied, expected);
}

function getAccessTokenFromRequest(req) {
    return normalizeHeaderValue(getHeader(req, 'x-fuelfire-access-token'))
        || getBearerToken(req)
        || String(req?.body?.accessToken || '').trim();
}

function getRevenueCatApiKey() {
    return process.env.REVENUECAT_SECRET_API_KEY
        || process.env.REVENUECAT_API_KEY
        || '';
}

function getRevenueCatAppUserId(req) {
    return normalizeHeaderValue(getHeader(req, 'x-revenuecat-app-user-id'))
        || normalizeHeaderValue(getHeader(req, 'x-fuelfire-rc-app-user-id'))
        || String(req?.body?.rcAppUserId || req?.body?.appUserID || '').trim();
}

function entitlementIsActive(entitlement = {}) {
    if (entitlement.expires_date === null) return true;
    return isActiveExpiry(entitlement.expires_date || entitlement.expiresDate);
}

function subscriptionIsActive(subscription = {}) {
    const billingIssueAt = subscription.billing_issues_detected_at || subscription.billingIssuesDetectedAt;
    if (billingIssueAt && !isActiveExpiry(subscription.expires_date || subscription.expiresDate)) return false;
    return isActiveExpiry(subscription.expires_date || subscription.expiresDate);
}

function nonSubscriptionPurchaseExists(purchases = []) {
    return Array.isArray(purchases) && purchases.length > 0;
}

function planFromProductId(productId = '') {
    return normalizePlan(productId);
}

export async function verifyRevenueCatAccess(appUserId) {
    const apiKey = getRevenueCatApiKey();
    if (!apiKey || !appUserId) {
        return { active: false, reason: 'missing_revenuecat_config' };
    }

    const url = `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`;
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
        },
    });

    if (!response.ok) {
        const detail = await response.text();
        throw new Error(`RevenueCat lookup failed (${response.status}): ${detail.slice(0, 200)}`);
    }

    const data = await response.json();
    const entitlements = data?.subscriber?.entitlements || {};
    const activeEntitlement = Object.entries(entitlements).find(([key, value]) => (
        AI_ENTITLEMENTS.map((item) => item.toLowerCase()).includes(String(key).toLowerCase())
        && entitlementIsActive(value)
    ));

    if (!activeEntitlement) {
        const subscriptions = data?.subscriber?.subscriptions || {};
        const activeSubscription = Object.entries(subscriptions).find(([productId, value]) => (
            AI_PRODUCT_IDS.map((item) => item.toLowerCase()).includes(String(productId).toLowerCase())
            && subscriptionIsActive(value)
        ));

        if (!activeSubscription) {
            const nonSubscriptions = data?.subscriber?.non_subscriptions || {};
            const mealImportPurchase = Object.entries(nonSubscriptions).find(([productId, purchases]) => (
                MEAL_IMPORT_PRODUCT_IDS.map((item) => item.toLowerCase()).includes(String(productId).toLowerCase())
                && nonSubscriptionPurchaseExists(purchases)
            ));

            if (!mealImportPurchase) {
                return { active: false, reason: 'no_active_subscription', appUserId };
            }

            const [productId, purchases] = mealImportPurchase;
            const latestPurchase = Array.isArray(purchases) ? purchases[purchases.length - 1] : {};
            return {
                active: true,
                source: 'revenuecat',
                plan: 'meal_import',
                appUserId,
                expiresAt: null,
                productId,
                transactionId: latestPurchase?.id || latestPurchase?.store_transaction_id || null,
            };
        }

        const [productId, details] = activeSubscription;
        return {
            active: true,
            source: 'revenuecat',
            plan: planFromProductId(productId),
            appUserId,
            expiresAt: details?.expires_date || null,
            productId,
        };
    }

    const [entitlement, details] = activeEntitlement;
    return {
        active: true,
        source: 'revenuecat',
        plan: entitlement,
        appUserId,
        expiresAt: details?.expires_date || null,
        productId: details?.product_identifier || null,
    };
}

export async function resolveAiAccess(req, options = {}) {
    const capability = normalizeCapability(typeof options === 'string' ? options : options.capability);

    const productionRuntime = process.env.NODE_ENV === 'production'
        || process.env.VERCEL_ENV === 'production';
    if (!productionRuntime && process.env.FUELFIRE_REQUIRE_AI_ACCESS === '0') {
        return { allowed: true, source: 'disabled' };
    }

    if (isAdminAuthorized(req)) return { allowed: true, source: 'admin', plan: 'owner_unlock' };
    if (isInternalAuthorized(req)) return { allowed: true, source: 'internal', plan: 'service' };
    if (isTestAuthorized(req)) return { allowed: true, source: 'test', plan: 'test' };

    const tokenPayload = verifyAccessToken(getAccessTokenFromRequest(req));
    if (tokenPayload && isActiveExpiry(tokenPayload.expiresAt)) {
        if (planAllowsCapability(tokenPayload.plan, capability)) {
            return { allowed: true, source: 'access_token', plan: normalizePlan(tokenPayload.plan), payload: tokenPayload };
        }
        return { allowed: false, source: 'access_token', plan: normalizePlan(tokenPayload.plan), reason: 'plan_missing_capability', capability };
    }

    const appUserId = getRevenueCatAppUserId(req);
    if (appUserId) {
        const rc = await verifyRevenueCatAccess(appUserId);
        if (rc.active && planAllowsCapability(rc.plan, capability)) {
            return { allowed: true, ...rc, plan: normalizePlan(rc.plan) };
        }
        if (rc.active) {
            return { allowed: false, ...rc, plan: normalizePlan(rc.plan), reason: 'plan_missing_capability', capability };
        }
    }

    return { allowed: false, source: 'none' };
}

export async function requireAiAccess(req, res, options = {}) {
    try {
        const access = await resolveAiAccess(req, options);
        if (access.allowed) return access;
    } catch (error) {
        console.warn('AI access verification failed:', error.message);
    }

    res.status(402).json({
        success: false,
        error: 'AI subscription required',
        code: 'AI_ACCESS_REQUIRED',
    });
    return null;
}

export function isSubscriptionEventAuthorized(req) {
    if (isAdminAuthorized(req)) return true;

    const expected = process.env.FUELFIRE_SUBSCRIPTION_EVENT_TOKEN
        || process.env.SUBSCRIPTION_EVENT_TOKEN
        || process.env.REVENUECAT_WEBHOOK_SECRET
        || '';
    if (!expected) return false;

    const supplied = normalizeHeaderValue(getHeader(req, 'x-fuelfire-event-token'))
        || normalizeHeaderValue(getHeader(req, 'x-subscription-event-token'))
        || getBearerToken(req)
        || normalizeHeaderValue(getHeader(req, 'authorization'));

    const normalized = supplied.replace(/^Bearer\s+/i, '').trim();
    return timingSafeEqualString(normalized, expected);
}

export function getSafeUserContext(req) {
    const body = req?.body || {};
    const user = body.user || {};
    return {
        name: String(user.name || body.name || 'Unknown').replace(/\s+/g, ' ').trim().slice(0, 120),
        email: String(user.email || body.email || '').toLowerCase().trim().slice(0, 160),
    };
}
