import crypto from 'crypto';

import { applyCors, ensureMethod, handleCorsPreflight } from './_lib/http.js';
import { requireAiAccess } from './_lib/security.js';

const corsOptions = {
    methods: ['POST', 'OPTIONS'],
    headers: ['Content-Type'],
};

const ALLOWED_CATEGORIES = new Set(['voice-food']);
const ALLOWED_EVENTS = new Set(['parser-error', 'empty-result', 'speech-error']);

// Automatic diagnostics are deliberately a different schema from the
// opt-in report. They are sent without a user review step, so every value
// that can reach the log must come from a small, closed set (or be a bounded
// primitive with no user text in it).
const AUTOMATIC_CATEGORY = 'ai-food';
const AUTOMATIC_MODE = 'automatic';
const AUTOMATIC_EVENTS = new Set(['parser-error', 'empty-result', 'vision-error', 'speech-error']);
const AUTOMATIC_STAGES = new Set([
    'nutrition-parser',
    'voice-processing',
    'speech-recognition',
    'photo-analysis',
    'photo-clarification',
]);
const AUTOMATIC_SOURCES = new Set(['voice', 'photo', 'typed']);
const AUTOMATIC_PLATFORMS = new Set(['ios', 'android', 'web', 'unknown']);
const AUTOMATIC_ERROR_CODES = new Set([
    'AI_ACCESS_REQUIRED',
    'AI_NOT_CONFIGURED',
    'AI_PROVIDER_ERROR',
    'AI_RESULT_EMPTY',
    'AI_RESULT_INVALID',
    'FOOD_AI_NOT_CONFIGURED',
    'FOOD_AI_HTTP_ERROR',
    'FOOD_VISION_FAILED',
    'LIVE_NUTRITION_REQUIRED',
    'OFFICIAL_NUTRITION_NOT_FOUND',
    'OFFICIAL_NUTRITION_NOT_VERIFIED',
    'NETWORK_ERROR',
    'TIMEOUT',
    'SPEECH_RECOGNITION_ERROR',
    'UNKNOWN',
]);
const AUTOMATIC_ACCESS_SOURCES = new Set([
    'admin',
    'internal',
    'test',
    'access_token',
    'revenuecat',
    'disabled',
]);

function cleanText(value, maxLength) {
    return String(value || '')
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
}

function cleanInteger(value, min, max) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    return Math.max(min, Math.min(max, Math.round(parsed)));
}

function cleanNumber(value, min, max) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    return Math.max(min, Math.min(max, Math.round(parsed * 100) / 100));
}

function cleanEnum(value, allowedValues) {
    return typeof value === 'string' && allowedValues.has(value) ? value : null;
}

function cleanAppVersion(value) {
    if (typeof value !== 'string') return null;
    const version = value.trim();
    // App versions are release metadata, not arbitrary client text. Keep the
    // shape intentionally narrow so a malicious value cannot smuggle a food
    // description or another user supplied string into the log.
    return /^\d{1,3}(?:\.\d{1,3}){0,3}$/.test(version) ? version : null;
}

function cleanAutomaticStatus(value) {
    if (typeof value !== 'number' || !Number.isInteger(value)) return null;
    return value >= 0 && value <= 599 ? value : null;
}

function cleanOccurredAt(value) {
    const parsed = Date.parse(String(value || ''));
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function createReportId() {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `VFD-${date}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function createAutomaticReportId() {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `AIF-${date}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function sanitizeReport(body = {}) {
    const category = ALLOWED_CATEGORIES.has(body.category) ? body.category : '';
    const event = ALLOWED_EVENTS.has(body.event) ? body.event : '';
    const alternatives = Array.isArray(body.alternatives)
        ? body.alternatives.map((value) => cleanText(value, 180)).filter(Boolean).slice(0, 5)
        : [];
    const error = body.error && typeof body.error === 'object' ? body.error : {};
    const parser = body.parser && typeof body.parser === 'object' ? body.parser : {};
    const client = body.client && typeof body.client === 'object' ? body.client : {};
    const viewport = client.viewport && typeof client.viewport === 'object' ? client.viewport : {};

    return {
        category,
        event,
        occurredAt: cleanOccurredAt(body.occurredAt),
        stage: cleanText(body.stage, 80),
        transcript: cleanText(body.transcript, 700),
        alternatives,
        context: cleanText(body.context, 240),
        error: {
            message: cleanText(error.message, 320),
            code: cleanText(error.code, 80),
            status: cleanInteger(error.status, 0, 599),
        },
        parser: {
            source: cleanText(parser.source, 100),
            foodCount: cleanInteger(parser.foodCount, 0, 100),
        },
        client: {
            platform: cleanText(client.platform, 40),
            appVersion: cleanText(client.appVersion, 40),
            language: cleanText(client.language, 24),
            route: cleanText(client.route, 180),
            userAgent: cleanText(client.userAgent, 320),
            online: typeof client.online === 'boolean' ? client.online : null,
            native: typeof client.native === 'boolean' ? client.native : null,
            viewport: {
                width: cleanInteger(viewport.width, 0, 10000),
                height: cleanInteger(viewport.height, 0, 10000),
                dpr: cleanNumber(viewport.dpr, 0, 10),
            },
        },
    };
}

function sanitizeAutomaticReport(body = {}) {
    const error = body.error && typeof body.error === 'object' && !Array.isArray(body.error)
        ? body.error
        : {};
    const parser = body.parser && typeof body.parser === 'object' && !Array.isArray(body.parser)
        ? body.parser
        : {};
    const client = body.client && typeof body.client === 'object' && !Array.isArray(body.client)
        ? body.client
        : {};

    return {
        mode: AUTOMATIC_MODE,
        category: body.category === AUTOMATIC_CATEGORY ? AUTOMATIC_CATEGORY : '',
        event: cleanEnum(body.event, AUTOMATIC_EVENTS) || '',
        stage: cleanEnum(body.stage, AUTOMATIC_STAGES),
        source: cleanEnum(body.source, AUTOMATIC_SOURCES),
        error: {
            code: cleanEnum(error.code, AUTOMATIC_ERROR_CODES),
            status: cleanAutomaticStatus(error.status),
        },
        parser: {
            foodCount: cleanInteger(parser.foodCount, 0, 100),
        },
        client: {
            platform: cleanEnum(client.platform, AUTOMATIC_PLATFORMS),
            appVersion: cleanAppVersion(client.appVersion),
            online: typeof client.online === 'boolean' ? client.online : null,
            native: typeof client.native === 'boolean' ? client.native : null,
        },
    };
}

export default async function handler(req, res) {
    if (handleCorsPreflight(req, res, corsOptions)) return;
    applyCors(res, corsOptions);

    if (!ensureMethod(req, res, ['POST'])) return;

    const access = await requireAiAccess(req, res, { capability: 'ai_food' });
    if (!access) return;

    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
        ? req.body
        : {};
    const isAutomatic = body.mode === AUTOMATIC_MODE;
    const report = isAutomatic ? sanitizeAutomaticReport(body) : sanitizeReport(body);
    if (!report.category || !report.event) {
        return res.status(400).json({
            success: false,
            error: 'A valid diagnostic category and event are required.',
            code: 'INVALID_DIAGNOSTIC',
        });
    }
    if (!isAutomatic && !report.transcript && !report.error.message) {
        return res.status(400).json({
            success: false,
            error: 'A transcript or error detail is required.',
            code: 'EMPTY_DIAGNOSTIC',
        });
    }

    const reportId = isAutomatic ? createAutomaticReportId() : createReportId();
    const storedReport = {
        reportId,
        receivedAt: new Date().toISOString(),
        accessSource: isAutomatic
            ? cleanEnum(access.source, AUTOMATIC_ACCESS_SOURCES)
            : cleanText(access.source, 40),
        ...report,
    };

    // One structured log entry makes the report searchable in Vercel runtime
    // logs by report ID. The allow-listed payload intentionally excludes audio,
    // authorization headers, account identifiers, photos, and precise location.
    console.error('[fuelfire-client-diagnostic]', JSON.stringify(storedReport));

    return res.status(201).json({
        success: true,
        reportId,
        message: isAutomatic
            ? 'Automatic diagnostic received. No food details or media were uploaded.'
            : 'Diagnostic report received. No microphone audio was uploaded.',
    });
}
