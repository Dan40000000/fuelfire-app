import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let HealthSync;
let visibilityHandler;

beforeAll(() => {
    globalThis.window = {
        dispatchEvent: vi.fn(),
        location: { search: '' }
    };
    globalThis.document = {
        hidden: false,
        addEventListener: vi.fn((eventName, handler) => {
            if (eventName === 'visibilitychange') visibilityHandler = handler;
        })
    };
    globalThis.CustomEvent = class CustomEvent {
        constructor(type, options = {}) {
            this.type = type;
            this.detail = options.detail;
        }
    };
    globalThis.localStorage = {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn()
    };
    HealthSync = require('../../public/health-sync.js');
});

beforeEach(() => {
    visibilityHandler = null;
    document.hidden = false;
    document.addEventListener.mockClear();
    window.dispatchEvent.mockClear();
    localStorage.getItem.mockClear();
    localStorage.setItem.mockClear();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('Apple Health sync', () => {
    it('uses the phone-local calendar day for its cache key', () => {
        const sync = new HealthSync();
        const date = new Date(2026, 7, 12, 23, 45, 0);

        expect(sync.getLocalDateKey(date)).toBe('2026-08-12');
    });

    it('sends a complete ISO timestamp to the native totals bridge', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 7, 12, 23, 45, 0));
        const getDailyTotals = vi.fn().mockResolvedValue({
            steps: 4321,
            distanceMeters: 2100,
            activeEnergy: 350,
            partial: false
        });
        const sync = new HealthSync();
        sync.isAvailable = true;
        sync.HealthTotals = { getDailyTotals };

        const result = await sync.getAggregatedTotals();

        expect(result.steps).toBe(4321);
        expect(getDailyTotals).toHaveBeenCalledTimes(1);
        const nativeDate = getDailyTotals.mock.calls[0][0].date;
        expect(nativeDate).toContain('T');
        expect(Number.isNaN(Date.parse(nativeDate))).toBe(false);
        expect(sync.dailyTotalsCacheDate).toBe('2026-08-12');
    });

    it('keeps partial Watch totals when one HealthKit metric is unavailable', async () => {
        const response = {
            steps: 9876,
            distanceMeters: 0,
            activeEnergy: 420,
            partial: true,
            errors: ['heartRate: authorization denied']
        };
        const getDailyTotals = vi.fn().mockResolvedValue(response);
        const sync = new HealthSync();
        sync.isAvailable = true;
        sync.HealthTotals = { getDailyTotals };

        await expect(sync.getAggregatedTotals()).resolves.toEqual(response);
    });

    it('reuses same-day totals until a forced Watch refresh is requested', async () => {
        const getDailyTotals = vi.fn()
            .mockResolvedValueOnce({ steps: 100 })
            .mockResolvedValueOnce({ steps: 200 });
        const sync = new HealthSync();
        sync.isAvailable = true;
        sync.HealthTotals = { getDailyTotals };

        expect((await sync.getAggregatedTotals()).steps).toBe(100);
        expect((await sync.getAggregatedTotals()).steps).toBe(100);
        expect((await sync.getAggregatedTotals(true)).steps).toBe(200);
        expect(getDailyTotals).toHaveBeenCalledTimes(2);
    });

    it('forces a fresh sync when the app returns from the background', async () => {
        const sync = new HealthSync();
        sync.isAvailable = true;
        sync.dailyTotalsCache = { steps: 10 };
        sync.dailyTotalsCacheDate = '2026-08-12';
        sync.syncAllData = vi.fn().mockResolvedValue({ steps: 20 });

        sync.installForegroundRefresh();
        expect(visibilityHandler).toBeTypeOf('function');

        visibilityHandler();
        await sync.foregroundRefreshPromise;

        expect(sync.dailyTotalsCache).toBeNull();
        expect(sync.syncAllData).toHaveBeenCalledTimes(1);
    });

    it('publishes refreshed Health data so the visible page updates immediately', () => {
        const sync = new HealthSync();
        const data = { steps: 1234, syncTime: '2026-08-12T18:00:00.000Z' };

        sync.publishHealthData(data);

        expect(window.dispatchEvent).toHaveBeenCalledTimes(1);
        const event = window.dispatchEvent.mock.calls[0][0];
        expect(event.type).toBe('fuelfire:healthDataUpdated');
        expect(event.detail).toEqual(data);
    });

    it('detects a paired Apple Watch through the native bridge', async () => {
        const getWatchStatus = vi.fn().mockResolvedValue({
            supported: true,
            paired: true,
            watchAppInstalled: false,
            activationState: 'activated'
        });
        const sync = new HealthSync();
        sync.isAvailable = true;
        sync.HealthTotals = { getWatchStatus };

        const status = await sync.getAppleWatchStatus(true);

        expect(status).toMatchObject({
            supported: true,
            paired: true,
            connected: false,
            healthAvailable: true
        });
        expect(getWatchStatus).toHaveBeenCalledTimes(1);
    });

    it('prompts a detected Watch once, then waits seven days after dismissal', () => {
        const sync = new HealthSync();
        const now = new Date('2026-08-12T18:00:00.000Z').getTime();
        const status = { paired: true, connected: false };

        localStorage.getItem.mockReturnValue(null);
        expect(sync.shouldPromptForAppleWatch(status, now)).toBe(true);

        localStorage.getItem.mockImplementation(key => (
            key === 'fuelfire_watch_prompt_dismissed_at' ? String(now - 2 * 24 * 60 * 60 * 1000) : null
        ));
        expect(sync.shouldPromptForAppleWatch(status, now)).toBe(false);

        localStorage.getItem.mockImplementation(key => (
            key === 'fuelfire_watch_prompt_dismissed_at' ? String(now - 8 * 24 * 60 * 60 * 1000) : null
        ));
        expect(sync.shouldPromptForAppleWatch(status, now)).toBe(true);
        expect(sync.shouldPromptForAppleWatch({ paired: true, connected: true }, now)).toBe(false);
    });

    it('syncs immediately when an already connected Watch status is tapped', async () => {
        const sync = new HealthSync();
        sync.getAppleWatchStatus = vi.fn().mockResolvedValue({ paired: true, connected: true });
        sync.publishConnectionStatus = vi.fn();
        sync.invalidateDailyTotals = vi.fn();
        sync.syncAllData = vi.fn().mockResolvedValue({ steps: 3000 });
        sync.refreshConnectionStatus = vi.fn().mockResolvedValue({ paired: true, connected: true });
        sync.showAppleWatchConnectionPrompt = vi.fn();

        await expect(sync.handleAppleHealthConnectionAction()).resolves.toBe(true);

        expect(sync.publishConnectionStatus).toHaveBeenCalledWith({ paired: true, connected: true, syncing: true });
        expect(sync.syncAllData).toHaveBeenCalledTimes(1);
        expect(sync.showAppleWatchConnectionPrompt).not.toHaveBeenCalled();
    });
});
