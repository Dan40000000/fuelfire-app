import fs from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { lookupOpenFoodFacts } from '../../api/_lib/nutrition-evidence.js';
import { sanitizeVisionFoods, calculateTotals } from '../../api/ai-food-vision.js';
import '../../public/food-store.js';

const calorieTrackerSource = fs.readFileSync(
    path.resolve('public/calorie-tracker.html'),
    'utf8',
);

function loadFoodStore() {
    // Import the shipped module directly so coverage observes the same code
    // instead of an uninstrumented VM copy. Storage remains explicit per test.
    const store = globalThis.FuelFireFoodStore;
    store.readLogs.lastError = null;
    store.writeLogs.lastError = null;
    return store;
}

function createStorage({ failOnSet } = {}) {
    const values = new Map();
    return {
        getItem(key) {
            return values.has(key) ? values.get(key) : null;
        },
        setItem(key, value) {
            const serialized = String(value);
            if (failOnSet?.(key, serialized)) throw new Error(`setItem failed for ${key}`);
            values.set(key, serialized);
        },
        removeItem(key) {
            values.delete(key);
        },
    };
}

function jsonResponse(body, ok = true) {
    return {
        ok,
        async json() {
            return body;
        },
    };
}

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});
describe('food reliability contracts', () => {
    it('normalizes trimmed names, valid zeroes, decimals, and negative values without integer truncation', () => {
        const store = loadFoodStore();
        const logs = store.normalizeLogs({
            '2026-10-28': {
                meals: [{
                    name: '  Diet soda  ',
                    calories: 0,
                    protein: '1.25',
                    carbs: '2.75',
                    fiber: '-1',
                    fat: '0.5',
                }],
            },
        });

        expect(logs['2026-10-28'].meals[0]).toMatchObject({
            name: 'Diet soda',
            calories: 0,
            protein: 1.25,
            carbs: 2.75,
            fiber: 0,
            fat: 0.5,
        });
    });

    it('migrates flat legacy meals by local day and retains the raw payload in recovery', () => {
        const store = loadFoodStore();
        const storage = createStorage();
        const legacy = [{
            name: ' Legacy meal ',
            calories: 12.7,
            protein: 1.25,
            carbs: 2.5,
            date: '2026-10-28T12:00:00Z',
        }];
        const raw = JSON.stringify(legacy);
        storage.setItem(store.storageKey, raw);

        const migrated = store.readLogs(storage);
        const localKey = store.getLocalDateKey(legacy[0].date);
        expect(migrated[localKey].meals[0]).toMatchObject({ name: 'Legacy meal', calories: 12.7 });
        expect(JSON.parse(storage.getItem(store.recoveryBackupKey))).toMatchObject({ original: raw });
        expect(JSON.parse(storage.getItem(store.storageKey))[localKey].meals[0].name).toBe('Legacy meal');
    });

    it('keeps malformed original data untouched when the recovery backup is quota/read-only', () => {
        const store = loadFoodStore();
        const raw = '{"malformed":';
        const storage = createStorage({
            failOnSet: (key) => key === store.recoveryBackupKey,
        });
        storage.setItem(store.storageKey, raw);

        expect(store.readLogs(storage)).toEqual({});
        expect(storage.getItem(store.storageKey)).toBe(raw);
        expect(store.readLogs.lastError?.message).toContain(`setItem failed for ${store.recoveryBackupKey}`);

        const failedWrite = store.writeLogs({}, storage);
        expect(failedWrite.ok).toBe(false);
        expect(storage.getItem(store.storageKey)).toBe(raw);
        expect(store.writeLogs.lastError?.message).toContain(`setItem failed for ${store.recoveryBackupKey}`);
    });

    it('permits normalization when the exact raw payload is already backed up', () => {
        const store = loadFoodStore();
        const storage = createStorage();
        const raw = '[{"name":"Already backed","calories":0,"date":"2026-10-28T12:00:00Z"}]';
        storage.setItem(store.storageKey, raw);
        storage.setItem(store.recoveryBackupKey, JSON.stringify({ original: raw, reason: 'previous-run' }));

        const logs = store.readLogs(storage);
        const localKey = store.getLocalDateKey('2026-10-28T12:00:00Z');
        expect(logs[localKey].meals[0].name).toBe('Already backed');
        expect(store.readLogs.lastError).toBeNull();
    });

    it('restores the raw payload when migration persistence fails after backup succeeds', () => {
        const store = loadFoodStore();
        const raw = '[{"name":"Migration draft","calories":0,"date":"2026-10-28T12:00:00Z"}]';
        const storage = createStorage({
            failOnSet: (key, value) => key === store.storageKey && value !== raw,
        });
        storage.setItem(store.storageKey, raw);

        const logs = store.readLogs(storage);
        expect(logs[store.getLocalDateKey('2026-10-28T12:00:00Z')].meals[0].name).toBe('Migration draft');
        expect(storage.getItem(store.storageKey)).toBe(raw);
        expect(store.readLogs.lastError?.message).toContain(`setItem failed for ${store.storageKey}`);
        expect(JSON.parse(storage.getItem(store.recoveryBackupKey))).toMatchObject({ original: raw });
    });

    it('returns an explicit failure and keeps old canonical data when a canonical save fails', () => {
        const store = loadFoodStore();
        const oldRaw = JSON.stringify({ '2026-10-28': { meals: [], totalCalories: 0 } });
        const storage = createStorage({
            failOnSet: (key, value) => key === store.storageKey && value !== oldRaw,
        });
        storage.setItem(store.storageKey, oldRaw);

        const result = store.writeLogs({ '2026-10-28': { meals: [{ name: 'Draft', calories: 0 }] } }, storage);
        expect(result).toMatchObject({ ok: false });
        expect(storage.getItem(store.storageKey)).toBe(oldRaw);
    });

    it('preserves fractional per-unit vision nutrition until quantity scaling', () => {
        const foods = sanitizeVisionFoods([{
            name: 'Fractional serving',
            calories: 1.25,
            protein: 0.75,
            carbs: 1.25,
            fiber: 0.25,
            fat: 0.5,
            sugar: 0,
            quantity: 4,
        }]);

        expect(foods[0]).toMatchObject({ calories: 1.25, protein: 0.75, carbs: 1.25 });
        expect(calculateTotals(foods)).toMatchObject({ calories: 5, protein: 3, carbs: 5, fiber: 1 });
    });

    it('does not convert mass nutrition into volume nutrition without matching evidence', async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(jsonResponse({ hits: [{ code: '123', product_name: 'Whole Milk', brands: 'Test Brand' }] }))
            .mockResolvedValueOnce(jsonResponse({ product: {
                product_name: 'Whole Milk',
                brands: 'Test Brand',
                serving_size: '250 ml',
                nutriments: { 'energy-kcal_100g': 61 },
            } }));
        vi.stubGlobal('fetch', fetchMock);

        await expect(lookupOpenFoodFacts('Test Brand Whole Milk')).resolves.toBeNull();
    });

    it('uses matching ml evidence and retains decimal nutrition values', async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(jsonResponse({ hits: [{ code: '456', product_name: 'Whole Milk', brands: 'Test Brand' }] }))
            .mockResolvedValueOnce(jsonResponse({ product: {
                product_name: 'Whole Milk',
                brands: 'Test Brand',
                serving_size: '250 ml',
                nutriments: {
                    'energy-kcal_100ml': 40.5,
                    proteins_100ml: 1.25,
                    carbohydrates_100ml: 2.75,
                    fat_100ml: 1.5,
                    sugars_100ml: 2.25,
                },
            } }));
        vi.stubGlobal('fetch', fetchMock);

        await expect(lookupOpenFoodFacts('Test Brand Whole Milk')).resolves.toMatchObject({
            calories: 101.25,
            protein: 3.125,
            carbs: 6.875,
            fat: 3.75,
            sugar: 5.625,
            serving: '250 ml',
        });
    });

    it('keeps typed failure/manual recovery and core dialog accessibility contracts in the static page', () => {
        expect(calorieTrackerSource).not.toMatch(/maximum-scale\s*=|user-scalable\s*=\s*no/i);
        expect(calorieTrackerSource).toContain('<dialog id="smart-entry-modal"');
        expect(calorieTrackerSource).toContain('aria-labelledby="smart-entry-title"');
        expect(calorieTrackerSource).toMatch(/id="manual-entry-error"[^>]*role="alert"/);
        expect(calorieTrackerSource).toContain('id="manual-entry-saved" role="status"');
        expect(calorieTrackerSource).toContain('min="0" step="any"');
        expect(calorieTrackerSource).toMatch(/function showFoodSearchFailure[\s\S]*?textContent = 'Retry'/);
        expect(calorieTrackerSource).toContain("textContent = 'Manual Entry (free/offline)'");
        expect(calorieTrackerSource).toContain('const safeFoodName = escapeHtml(food.name || \'Food item\')');
        expect(calorieTrackerSource).toContain('button.textContent = `${name} (${calories}cal)`');
        expect(calorieTrackerSource).toContain('if (!writeLoggedMeals(loggedMeals)) return;');
    });

    it('keeps every inline script syntactically valid after the surgical page changes', () => {
        const inlineScripts = [...calorieTrackerSource.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
            .map((match) => match[1])
            .filter((script) => script.trim());
        expect(inlineScripts.length).toBeGreaterThan(0);
        inlineScripts.forEach((script, index) => {
            expect(() => new Function(script), `inline script ${index + 1}`).not.toThrow();
        });
    });
});
