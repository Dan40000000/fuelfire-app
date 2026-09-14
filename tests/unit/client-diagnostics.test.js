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

    it('stores automatic AI-food metadata without logging user supplied food or device text', async () => {
        const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const sensitiveValues = [
            'SECRET_FOOD_TRANSCRIPT_7f1b',
            'SECRET_ALTERNATIVE_7f1b',
            'SECRET_CONTEXT_7f1b',
            'SECRET_ERROR_MESSAGE_7f1b',
            'SECRET_USER_AGENT_7f1b',
            'SECRET_ROUTE_7f1b',
            'SECRET_PHOTO_BYTES_7f1b',
            'SECRET_ACCOUNT_7f1b@example.com',
        ];
        const body = {
            mode: 'automatic',
            category: 'ai-food',
            event: 'parser-error',
            stage: 'nutrition-parser',
            source: 'voice',
            error: {
                code: 'AI_PROVIDER_ERROR',
                status: 502,
                message: sensitiveValues[3],
            },
            parser: { foodCount: 0, source: sensitiveValues[1] },
            client: {
                platform: 'ios',
                appVersion: '1.8.0',
                online: true,
                native: true,
                userAgent: sensitiveValues[4],
                route: sensitiveValues[5],
            },
            transcript: sensitiveValues[0],
            alternatives: [sensitiveValues[1]],
            context: sensitiveValues[2],
            photo: sensitiveValues[6],
            email: sensitiveValues[7],
            accountId: sensitiveValues[7],
        };

        const firstResponse = await invokeApi(clientDiagnosticsHandler, {
            headers: getTestAuthHeaders(),
            body,
        });
        const secondResponse = await invokeApi(clientDiagnosticsHandler, {
            headers: getTestAuthHeaders(),
            body: { ...body, event: 'empty-result' },
        });

        expect(firstResponse.status).toBe(201);
        expect(secondResponse.status).toBe(201);
        expect(firstResponse.body.reportId).toMatch(/^AIF-\d{8}-[A-F0-9]{8}$/);
        expect(secondResponse.body.reportId).toMatch(/^AIF-\d{8}-[A-F0-9]{8}$/);
        expect(secondResponse.body.reportId).not.toBe(firstResponse.body.reportId);
        expect(logSpy).toHaveBeenCalledTimes(2);

        for (const call of logSpy.mock.calls) {
            const logLine = call.join(' ');
            const loggedReport = JSON.parse(logLine.slice(logLine.indexOf('{')));
            expect(loggedReport).toMatchObject({
                mode: 'automatic',
                category: 'ai-food',
                stage: 'nutrition-parser',
                source: 'voice',
                error: { code: 'AI_PROVIDER_ERROR', status: 502 },
                parser: { foodCount: 0 },
                client: { platform: 'ios', appVersion: '1.8.0', online: true, native: true },
            });
            expect(loggedReport).not.toHaveProperty('transcript');
            expect(loggedReport).not.toHaveProperty('alternatives');
            expect(loggedReport).not.toHaveProperty('context');
            expect(loggedReport).not.toHaveProperty('photo');
            expect(loggedReport).not.toHaveProperty('email');
            expect(loggedReport).not.toHaveProperty('accountId');
            expect(loggedReport.client).not.toHaveProperty('userAgent');
            expect(loggedReport.client).not.toHaveProperty('route');
            expect(loggedReport.parser).not.toHaveProperty('source');
            expect(loggedReport.error).not.toHaveProperty('message');
            for (const sensitiveValue of sensitiveValues) {
                expect(logLine).not.toContain(sensitiveValue);
            }
        }
    });

    it('drops automatic values outside the fixed metadata allowlist', async () => {
        const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const response = await invokeApi(clientDiagnosticsHandler, {
            headers: getTestAuthHeaders(),
            body: {
                mode: 'automatic',
                category: 'ai-food',
                event: 'vision-error',
                stage: 'chicken-and-rice-secret',
                source: 'restaurant secret',
                error: { code: 'contains-food-name', status: '502' },
                parser: { foodCount: 'not-a-count' },
                client: {
                    platform: 'iPhone secret',
                    appVersion: '1.8 beta food',
                    online: 'yes',
                    native: { secret: true },
                },
            },
        });

        expect(response.status).toBe(201);
        const logLine = logSpy.mock.calls[0].join(' ');
        const loggedReport = JSON.parse(logLine.slice(logLine.indexOf('{')));
        expect(loggedReport).toMatchObject({
            mode: 'automatic',
            category: 'ai-food',
            event: 'vision-error',
            stage: null,
            source: null,
            error: { code: null, status: null },
            parser: { foodCount: null },
            client: { platform: null, appVersion: null, online: null, native: null },
        });
        expect(logLine).not.toContain('chicken-and-rice-secret');
        expect(logLine).not.toContain('contains-food-name');
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
