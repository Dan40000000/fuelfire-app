import fs from 'fs';
import path from 'path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import clientDiagnosticsHandler from '../../api/client-diagnostics.js';
import { getTestAuthHeaders, invokeApi } from '../lib/api-test-utils.js';

describe('client diagnostics API', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('stores an authenticated, allow-listed voice report and returns a searchable ID', async () => {
        const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const response = await invokeApi(clientDiagnosticsHandler, {
            headers: getTestAuthHeaders(),
            body: {
                category: 'voice-food',
                event: 'parser-error',
                occurredAt: '2026-09-11T14:22:00.000Z',
                stage: 'nutrition-parser',
                transcript: 'seven strips of bacon and four eggs',
                alternatives: ['7 strips of bacon and 4 eggs'],
                error: { message: 'Official nutrition not verified', code: 'OFFICIAL_NUTRITION_NOT_VERIFIED', status: 502 },
                parser: { source: 'official-evidence-required', foodCount: 0 },
                client: {
                    platform: 'ios',
                    language: 'en-US',
                    route: '/calorie-tracker.html',
                    userAgent: 'FuelFire Test',
                    online: true,
                    native: true,
                    viewport: { width: 390, height: 844, dpr: 3 },
                },
                rawAudio: 'must never be logged',
                authorization: 'must never be logged',
                email: 'must-never@example.com',
                preciseLocation: { latitude: 1, longitude: 2 },
            },
        });

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({ success: true });
        expect(response.body.reportId).toMatch(/^VFD-\d{8}-[A-F0-9]{8}$/);
        expect(response.body.message).toContain('No microphone audio');
        expect(logSpy).toHaveBeenCalledOnce();

        const logLine = logSpy.mock.calls[0].join(' ');
        expect(logLine).toContain(response.body.reportId);
        expect(logLine).toContain('seven strips of bacon and four eggs');
        expect(logLine).not.toContain('must never be logged');
        expect(logLine).not.toContain('must-never@example.com');
        expect(logLine).not.toContain('latitude');
    });

    it('requires AI access and rejects empty diagnostics', async () => {
        const unauthenticated = await invokeApi(clientDiagnosticsHandler, {
            body: { category: 'voice-food', event: 'parser-error', transcript: 'eggs' },
        });
        expect(unauthenticated.status).toBe(402);

        const empty = await invokeApi(clientDiagnosticsHandler, {
            headers: getTestAuthHeaders(),
            body: { category: 'voice-food', event: 'parser-error' },
        });
        expect(empty.status).toBe(400);
        expect(empty.body.code).toBe('EMPTY_DIAGNOSTIC');
    });

    it('exposes an explicit, accessible opt-in control in the voice dialog', () => {
        const html = fs.readFileSync(path.resolve('public/calorie-tracker.html'), 'utf8');
        expect(html).toContain('id="voice-send-diagnostic"');
        expect(html).toContain('type="button" onclick="sendVoiceDiagnostic()"');
        expect(html).toContain('No microphone audio, photos, account details, or precise location are uploaded.');
        expect(html).toContain('id="voice-diagnostic-status" role="status" aria-live="polite"');
    });
});

