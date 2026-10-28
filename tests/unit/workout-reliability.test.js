import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const FuelFireWorkouts = require('../../public/workout-store.js');

function createStorage(seed = {}) {
    const values = new Map(Object.entries(seed));
    return {
        getItem: key => values.has(key) ? values.get(key) : null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: key => values.delete(key),
        dump: () => Object.fromEntries(values)
    };
}

function createFailingStorage(seed = {}, failingKeys = []) {
    const values = new Map(Object.entries(seed));
    const failures = new Set(failingKeys);
    return {
        getItem: key => values.has(key) ? values.get(key) : null,
        setItem: (key, value) => {
            if (failures.has(key)) throw new Error(`quota failure for ${key}`);
            values.set(key, String(value));
        },
        removeItem: key => values.delete(key)
    };
}

function createNoopStorage(seed = {}) {
    const values = new Map(Object.entries(seed));
    return {
        getItem: key => values.has(key) ? values.get(key) : null,
        setItem: () => {},
        removeItem: key => values.delete(key)
    };
}

describe('FuelFireWorkouts canonical storage', () => {
    it('migrates legacy stores, keeps unknown fields, and deduplicates one session', () => {
        const session = {
            id: 'legacy-session',
            workoutName: 'Strength A',
            date: '2026-10-28T18:00:00.000Z',
            duration: 0,
            exercises: [{ name: 'Bench Press', sets: [{ index: 2, weight: 72.5, reps: 8, unit: 'lbs', completed: true }] }],
            customLegacyField: 'keep me'
        };
        const storage = createStorage({
            workoutHistory: JSON.stringify([session]),
            recentWorkouts: JSON.stringify([{ ...session, id: 'recent-copy' }]),
            fuelfire_tracked_workouts: JSON.stringify([{ id: 'unrelated', workoutName: 'Run', date: '2026-10-27T18:00:00.000Z', duration: 20 }])
        });

        const history = FuelFireWorkouts.readHistory(storage);

        expect(history).toHaveLength(2);
        expect(history[0]).toMatchObject({
            id: 'legacy-session',
            workoutName: 'Strength A',
            duration: 0,
            source: 'fuelfire',
            customLegacyField: 'keep me'
        });
        expect(history[0].exercises[0].sets[0]).toMatchObject({
            index: 2,
            weight: 72.5,
            reps: 8,
            durationSeconds: null,
            unit: 'lb',
            completed: true
        });
        expect(storage.getItem('recentWorkouts')).toContain('recent-copy');
        expect(JSON.parse(storage.getItem('workoutHistory'))).toHaveLength(2);
    });

    it('preserves bodyweight and timed sets including blank planned rows', () => {
        const storage = createStorage();
        const completed = FuelFireWorkouts.completeSession({
            id: 'session-sets',
            workoutName: 'Mixed Session',
            startedAt: '2026-10-28T18:00:00.000Z',
            endedAt: '2026-10-28T18:00:30.000Z',
            duration: 0,
            exercises: [{
                name: 'Push Ups',
                notes: 'Felt good',
                sets: [
                    { index: 1, weight: 0, reps: 12, unit: 'bodyweight', completed: true },
                    { index: 3, weight: null, reps: null, durationSeconds: 45, unit: 'seconds', completed: true },
                    { index: 5, weight: null, reps: null, unit: 'bodyweight', completed: false }
                ]
            }]
        }, storage);

        expect(completed.duration).toBe(0);
        expect(completed.exercises[0]).toMatchObject({ name: 'Push Ups', notes: 'Felt good' });
        expect(completed.exercises[0].sets).toEqual([
            expect.objectContaining({ index: 1, weight: 0, reps: 12, unit: 'bodyweight', completed: true }),
            expect.objectContaining({ index: 3, weight: null, reps: null, durationSeconds: 45, unit: 'seconds', completed: true }),
            expect.objectContaining({ index: 5, weight: null, reps: null, unit: 'bodyweight', completed: false })
        ]);
    });

    it('is idempotent across retries and only marks Health export after success', () => {
        const storage = createStorage();
        const record = {
            id: 'retry-session',
            workoutName: 'Retry Safe',
            startedAt: '2026-10-28T18:00:00.000Z',
            endedAt: '2026-10-28T18:05:00.000Z',
            duration: 5,
            calories: 12.3,
            exercises: []
        };

        FuelFireWorkouts.completeSession(record, storage);
        FuelFireWorkouts.completeSession(record, storage);

        expect(FuelFireWorkouts.readHistory(storage)).toHaveLength(1);
        expect(FuelFireWorkouts.readHistory(storage)[0].healthExported).toBe(false);
        expect(FuelFireWorkouts.markHealthExported('retry-session', {
            healthWorkoutId: 'health-1',
            healthExportedAt: '2026-10-28T18:06:00.000Z'
        }, storage)).toMatchObject({
            healthExported: true,
            healthWorkoutId: 'health-1',
            healthExportedAt: '2026-10-28T18:06:00.000Z'
        });
        expect(FuelFireWorkouts.readHistory(storage)[0].healthExported).toBe(true);
    });

    it('round-trips a draft without resetting its original start time', () => {
        const storage = createStorage();
        const draft = FuelFireWorkouts.saveDraft({
            sessionId: 'draft-1',
            startedAt: '2026-10-28T18:00:00.000Z',
            exercises: [{ sets: [{ index: 2, weight: 72.5, reps: 8 }] }]
        }, storage);

        expect(FuelFireWorkouts.readDraft(storage)).toMatchObject({
            sessionId: 'draft-1',
            startedAt: '2026-10-28T18:00:00.000Z',
            version: 1,
            exercises: [{ sets: [{ index: 2, weight: 72.5, reps: 8 }] }]
        });

        FuelFireWorkouts.clearDraft(storage);
        expect(FuelFireWorkouts.readDraft(storage)).toBeNull();
    });

    it('reports history persistence failures instead of claiming completion', () => {
        const storage = createFailingStorage({}, ['workoutHistory']);

        expect(() => FuelFireWorkouts.completeSession({
            id: 'quota-session',
            workoutName: 'Quota Safe',
            startedAt: '2026-10-28T18:00:00.000Z',
            exercises: []
        }, storage)).toThrow(/persist|migrate|verif/i);
        expect(storage.getItem('workoutHistory')).toBeNull();
    });

    it('reports draft persistence failures to callers', () => {
        const storage = createFailingStorage({}, ['fuelfire_workout_draft']);

        expect(() => FuelFireWorkouts.saveDraft({ sessionId: 'quota-draft' }, storage)).toThrow(/draft/i);
        expect(storage.getItem('fuelfire_workout_draft')).toBeNull();
    });

    it('does not replace corrupt history when its recovery backup cannot be written', () => {
        const corrupt = '{not-json';
        const storage = createFailingStorage({ workoutHistory: corrupt }, ['workoutHistory.legacy']);

        expect(FuelFireWorkouts.readHistory(storage)).toEqual([]);
        expect(storage.getItem('workoutHistory')).toBe(corrupt);
        expect(storage.getItem('workoutHistory.legacy')).toBeNull();
    });

    it('does not complete over corrupt history when recovery backup fails', () => {
        const corrupt = '{not-json';
        const storage = createFailingStorage({ workoutHistory: corrupt }, ['workoutHistory.legacy']);

        expect(() => FuelFireWorkouts.completeSession({
            id: 'blocked-migration-session',
            workoutName: 'Blocked Migration',
            exercises: []
        }, storage)).toThrow(/migrate|read/i);
        expect(storage.getItem('workoutHistory')).toBe(corrupt);
    });

    it('reports Health status persistence failures', () => {
        const seed = createStorage();
        FuelFireWorkouts.completeSession({ id: 'health-failure', workoutName: 'Health Failure', exercises: [] }, seed);
        const storage = createFailingStorage(seed.dump(), ['workoutHistory']);

        expect(() => FuelFireWorkouts.markHealthExported('health-failure', { healthWorkoutId: 'health-1' }, storage))
            .toThrow(/Health|persist/i);
    });

    it('rejects storage implementations that silently discard writes', () => {
        const storage = createNoopStorage();

        expect(() => FuelFireWorkouts.completeSession({
            id: 'noop-session',
            workoutName: 'No Op',
            exercises: []
        }, storage)).toThrow(/persist|migrate|verif/i);
    });
});
