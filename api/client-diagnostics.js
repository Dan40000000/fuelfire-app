import crypto from 'crypto';

import { applyCors, ensureMethod, handleCorsPreflight } from './_lib/http.js';
import { requireAiAccess } from './_lib/security.js';

const corsOptions = {
    methods: ['POST', 'OPTIONS'],
    headers: ['Content-Type'],
};

const ALLOWED_CATEGORIES = new Set(['voice-food']);
const ALLOWED_EVENTS = new Set(['parser-error', 'empty-result', 'speech-error']);

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

function cleanOccurredAt(value) {
    const parsed = Date.parse(String(value || ''));
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function createReportId() {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `VFD-${date}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
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

export default async function handler(req, res) {
    if (handleCorsPreflight(req, res, corsOptions)) return;
    applyCors(res, corsOptions);

    if (!ensureMethod(req, res, ['POST'])) return;

    const access = await requireAiAccess(req, res, { capability: 'ai_food' });
    if (!access) return;

    const report = sanitizeReport(req.body || {});
    if (!report.category || !report.event) {
        return res.status(400).json({
            success: false,
            error: 'A valid diagnostic category and event are required.',
            code: 'INVALID_DIAGNOSTIC',
        });
    }
    if (!report.transcript && !report.error.message) {
        return res.status(400).json({
            success: false,
            error: 'A transcript or error detail is required.',
            code: 'EMPTY_DIAGNOSTIC',
        });
    }

    const reportId = createReportId();
    const storedReport = {
        reportId,
        receivedAt: new Date().toISOString(),
        accessSource: cleanText(access.source, 40),
        ...report,
    };

    // One structured log entry makes the report searchable in Vercel runtime
    // logs by report ID. The allow-listed payload intentionally excludes audio,
    // authorization headers, account identifiers, photos, and precise location.
    console.error('[fuelfire-client-diagnostic]', JSON.stringify(storedReport));

    return res.status(201).json({
        success: true,
        reportId,
        message: 'Diagnostic report received. No microphone audio was uploaded.',
    });
}
