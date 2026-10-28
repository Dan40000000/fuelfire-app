import fs from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import '../../public/food-store.js';

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
        expect(storage.getItem(store.recoveryBackupKey)).toBeNull();
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
