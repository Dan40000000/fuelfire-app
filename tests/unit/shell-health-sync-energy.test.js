import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let HealthSync;

beforeAll(() => {
    globalThis.window = {
        addEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
        location: { search: '' }
    };
    globalThis.document = {
        hidden: false,
        addEventListener: vi.fn()
    };
    globalThis.localStorage = {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn()
    };
    HealthSync = require('../../public/health-sync.js');
});

beforeEach(() => {
    localStorage.getItem.mockReset().mockReturnValue(null);
    localStorage.setItem.mockClear();
});

describe('HealthSync energy availability', () => {
    it('returns missing energy when native totals are unavailable', async () => {
        const sync = new HealthSync();
        sync.isAvailable = true;
        sync.getAggregatedTotals = vi.fn().mockResolvedValue(null);

        await expect(sync.getTodayCaloriesBurned()).resolves.toBeNull();
    });

    it('preserves an explicit native zero as verified data', async () => {
        const sync = new HealthSync();
        sync.isAvailable = true;
        sync.getAggregatedTotals = vi.fn().mockResolvedValue({ activeEnergy: 0 });

        await expect(sync.getTodayCaloriesBurned()).resolves.toBe(0);
    });
});
