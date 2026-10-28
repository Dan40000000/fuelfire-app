import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../public/food-store.js';

const require = createRequire(import.meta.url);
const accountData = require('../../public/account-data.js');
const mealPlanSource = fs.readFileSync(path.resolve('public/meal-plan.html'), 'utf8');

function loadFoodStore() {
    const store = globalThis.FuelFireFoodStore;
    store.readLogs.lastError = null;
    store.writeLogs.lastError = null;
    return store;
}

function createStorage({ initial = {}, failOnSet } = {}) {
    const values = new Map(Object.entries(initial));
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

afterEach(() => {
    vi.restoreAllMocks();
});

describe('food legacy bridges', () => {
    it('merges both legacy keys once, keeps local dates/zero decimals, and preserves raw keys', () => {
        const store = loadFoodStore();
        const calorieRaw = JSON.stringify([{
            name: 'Meal plan zero',
            calories: 0,
            protein: 0.25,
            carbs: 1.5,
            fat: 0,
            date: '2026-10-28',
            logged_at: '2026-10-28T12:00:00.000Z',
        }]);
        const dailyRaw = JSON.stringify([{
            name: 'Daily decimal',
            calories: 0,
            protein: 0.5,
            carbs: 0,
            fat: 1.25,
            mealType: 'breakfast',
            timestamp: '2026-10-29T12:00:00.000Z',
        }]);
        const storage = createStorage({
            initial: {
                fuelfire_calorie_log: calorieRaw,
                dailyFoodLog: dailyRaw,
            },
        });

        const firstRead = store.readLogs(storage);
        const firstMeals = Object.values(firstRead).flatMap(day => day.meals);
        const firstCanonicalRaw = storage.getItem(store.storageKey);
        const firstIds = firstMeals.map(meal => meal.id).sort();
        const firstImportedIdsRaw = storage.getItem(store.legacyImportedIdsKey);

        expect(firstMeals).toHaveLength(2);
        expect(firstMeals).toEqual(expect.arrayContaining([
            expect.objectContaining({ name: 'Meal plan zero', calories: 0, protein: 0.25, carbs: 1.5, fat: 0 }),
            expect.objectContaining({ name: 'Daily decimal', calories: 0, protein: 0.5, carbs: 0, fat: 1.25 }),
        ]));
        expect(firstMeals.map(meal => meal.provenance.source).sort()).toEqual([
            'dailyFoodLog',
            'fuelfire_calorie_log',
        ]);
        expect(firstRead[store.getLocalDateKey('2026-10-28')].totalCalories).toBe(0);
        expect(firstRead[store.getLocalDateKey('2026-10-29')].totalCalories).toBe(0);
        expect(storage.getItem('fuelfire_calorie_log')).toBe(calorieRaw);
        expect(storage.getItem('dailyFoodLog')).toBe(dailyRaw);

        const secondRead = store.readLogs(storage);
        const secondMeals = Object.values(secondRead).flatMap(day => day.meals);
        expect(secondMeals).toHaveLength(2);
        expect(secondMeals.map(meal => meal.id).sort()).toEqual(firstIds);
        expect(storage.getItem(store.storageKey)).toBe(firstCanonicalRaw);
        expect(storage.getItem(store.legacyImportedIdsKey)).toBe(firstImportedIdsRaw);
        expect(JSON.parse(firstImportedIdsRaw)).toEqual(expect.arrayContaining(firstIds));
        expect(storage.getItem(store.recoveryBackupKey)).toBeNull();
    });

    it('tombstones imported IDs so deleting a canonical meal does not resurrect it', () => {
        const store = loadFoodStore();
        const calorieRaw = JSON.stringify([{ name: 'Delete me', calories: 100, date: '2026-10-28' }]);
        const dailyRaw = JSON.stringify([{ name: 'Keep me', calories: 200, date: '2026-10-28' }]);
        const storage = createStorage({
            initial: {
                fuelfire_calorie_log: calorieRaw,
                dailyFoodLog: dailyRaw,
            },
        });

        const first = store.readLogs(storage);
        const firstMeals = Object.values(first).flatMap(day => day.meals);
        expect(firstMeals).toHaveLength(2);
        const canonical = JSON.parse(storage.getItem(store.storageKey));
        const day = canonical['2026-10-28'];
        day.meals = day.meals.filter(meal => meal.name !== 'Delete me');
        day.totalCalories = day.meals.reduce((total, meal) => total + meal.calories, 0);
        expect(store.writeLogs(canonical, storage)).toMatchObject({ ok: true });

        const afterDelete = store.readLogs(storage);
        expect(Object.values(afterDelete).flatMap(entry => entry.meals).map(meal => meal.name)).toEqual(['Keep me']);
        expect(store.readLogs.lastError).toBeNull();
        expect(Object.values(store.readLogs(storage)).flatMap(entry => entry.meals).map(meal => meal.name)).toEqual(['Keep me']);
        expect(JSON.parse(storage.getItem(store.legacyImportedIdsKey))).toHaveLength(2);
        expect(storage.getItem('fuelfire_calorie_log')).toBe(calorieRaw);
        expect(storage.getItem('dailyFoodLog')).toBe(dailyRaw);
    });

    it('rolls back canonical migration when the imported-ID ledger hits quota and clears the error after retry', () => {
        const store = loadFoodStore();
        const calorieRaw = JSON.stringify([{ name: 'Quota plan', calories: 100, date: '2026-10-28' }]);
        const dailyRaw = JSON.stringify([{ name: 'Quota daily', calories: 200, date: '2026-10-28' }]);
        let failLedger = true;
        const beforeImportedIds = '[ "food-legacy-existing" ]';
        const storage = createStorage({
            initial: {
                [store.storageKey]: '{}',
                fuelfire_calorie_log: calorieRaw,
                dailyFoodLog: dailyRaw,
                [store.legacyImportedIdsKey]: beforeImportedIds,
            },
            failOnSet: (key, value) => failLedger && key === store.legacyImportedIdsKey && value !== beforeImportedIds,
        });
        const beforeCanonical = storage.getItem(store.storageKey);

        const failedRead = store.readLogs(storage);
        expect(Object.values(failedRead).flatMap(entry => entry.meals)).toHaveLength(2);
        expect(storage.getItem(store.storageKey)).toBe(beforeCanonical);
        expect(storage.getItem(store.legacyImportedIdsKey)).toBe(beforeImportedIds);
        expect(storage.getItem('fuelfire_calorie_log')).toBe(calorieRaw);
        expect(storage.getItem('dailyFoodLog')).toBe(dailyRaw);
        expect(store.readLogs.lastError).toMatchObject({
            code: 'FOOD_LEGACY_MIGRATION_FAILED',
            readOnly: true,
        });

        failLedger = false;
        const retriedRead = store.readLogs(storage);
        expect(Object.values(retriedRead).flatMap(entry => entry.meals)).toHaveLength(2);
        expect(store.readLogs.lastError).toBeNull();
        expect(JSON.parse(storage.getItem(store.legacyImportedIdsKey))).toHaveLength(3);
    });

    it('keeps malformed legacy raw data untouched and reports a read-only migration error', () => {
        const store = loadFoodStore();
        const malformedRaw = '{not-json';
        const storage = createStorage({ initial: { dailyFoodLog: malformedRaw } });

        expect(store.readLogs(storage)).toEqual({});
        expect(storage.getItem('dailyFoodLog')).toBe(malformedRaw);
        expect(storage.getItem(store.storageKey)).toBeNull();
        expect(storage.getItem(store.legacyImportedIdsKey)).toBeNull();
        expect(store.readLogs.lastError).toMatchObject({
            code: 'FOOD_LEGACY_MIGRATION_FAILED',
            readOnly: true,
        });
    });

    it('round-trips the imported-ID ledger through account backup and owned deletion', () => {
        const store = loadFoodStore();
        const markerRaw = JSON.stringify(['food-legacy-plan-1', 'food-legacy-daily-2']);
        const source = createStorage({ initial: { [store.legacyImportedIdsKey]: markerRaw } });
        const backup = accountData.createBackup(source, { now: '2026-10-28T12:00:00.000Z' });

        expect(backup.payload.data[store.legacyImportedIdsKey]).toEqual(JSON.parse(markerRaw));
        const restored = createStorage({ initial: { unrelated_origin_key: 'keep me' } });
        accountData.restoreBackup(backup.json, restored, { mode: 'merge', confirmed: true });
        expect(restored.getItem(store.legacyImportedIdsKey)).toBe(markerRaw);

        accountData.deleteOwnedData(restored, { confirmed: true });
        expect(restored.getItem(store.legacyImportedIdsKey)).toBeNull();
        expect(restored.getItem('unrelated_origin_key')).toBe('keep me');

        const invalidMarker = JSON.stringify({
            schemaVersion: accountData.SCHEMA_VERSION,
            app: 'fuelfire',
            exportedAt: '2026-10-28T12:00:00.000Z',
            data: { [store.legacyImportedIdsKey]: ['ok', 42] },
        });
        expect(() => accountData.parseBackup(invalidMarker)).toThrow(/unique array|strings/i);
    });

    it('uses timestamp, logged_at, and date values as local-day evidence', () => {
        const store = loadFoodStore();
        const storage = createStorage({
            initial: {
                fuelfire_calorie_log: JSON.stringify([
                    { name: 'Timestamp meal', calories: 1, timestamp: '2026-10-30T12:00:00.000Z' },
                    { name: 'Logged at meal', calories: 2, logged_at: '2026-10-31T12:00:00.000Z' },
                    { name: 'Date meal', calories: 3, date: '2026-11-01' },
                ]),
            },
        });

        const logs = store.readLogs(storage);
        expect(logs[store.getLocalDateKey('2026-10-30T12:00:00.000Z')].meals[0].name).toBe('Timestamp meal');
        expect(logs[store.getLocalDateKey('2026-10-31T12:00:00.000Z')].meals[0].name).toBe('Logged at meal');
        expect(logs['2026-11-01'].meals[0].name).toBe('Date meal');
    });

    it('keeps legacy raw keys and reports failure without claiming a canonical migration', () => {
        const store = loadFoodStore();
        const legacyRaw = JSON.stringify([{ name: 'Keep this raw', calories: 0, date: '2026-10-28' }]);
        const storage = createStorage({
            initial: { dailyFoodLog: legacyRaw },
            failOnSet: key => key === store.storageKey,
        });

        const logs = store.readLogs(storage);
        expect(logs[store.getLocalDateKey('2026-10-28')].meals).toHaveLength(1);
        expect(store.readLogs.lastError).toBeTruthy();
        expect(storage.getItem(store.storageKey)).toBeNull();
        expect(storage.getItem('dailyFoodLog')).toBe(legacyRaw);
        expect(storage.getItem(store.recoveryBackupKey)).toBeNull();
    });

    it('keeps meal-plan external text out of executable interpolation', () => {
        expect(mealPlanSource).toContain('<script src="food-store.js"></script>');
        expect(mealPlanSource).toContain('textContent = record.name');
        expect(mealPlanSource).toContain('addEventListener(\'click\', () => logMealToTracker');
        expect(mealPlanSource).not.toContain('onclick=\'logMealToTracker(');
        expect(mealPlanSource).not.toContain('JSON.stringify(mealData)})');
        expect(mealPlanSource).toContain('function extractMealDataFromPlan()');
    });
});
