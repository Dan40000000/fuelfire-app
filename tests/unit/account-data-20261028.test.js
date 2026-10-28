import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const accountData = require('../../public/account-data.js');

class MemoryStorage {
    constructor(entries = {}) {
        this.values = new Map(Object.entries(entries));
        this.writes = [];
        this.removes = [];
    }

    getItem(key) {
        return this.values.has(String(key)) ? this.values.get(String(key)) : null;
    }

    setItem(key, value) {
        const normalizedKey = String(key);
        this.writes.push([normalizedKey, String(value)]);
        this.values.set(normalizedKey, String(value));
    }

    removeItem(key) {
        const normalizedKey = String(key);
        this.removes.push(normalizedKey);
        this.values.delete(normalizedKey);
    }

    snapshot() {
        return Object.fromEntries(this.values.entries());
    }
}

class ThrowOnceStorage extends MemoryStorage {
    constructor(entries, failKey) {
        super(entries);
        this.failKey = failKey;
        this.failed = false;
    }

    setItem(key, value) {
        if (String(key) === this.failKey && !this.failed) {
            this.failed = true;
            throw new Error(`simulated write failure for ${key}`);
        }
        super.setItem(key, value);
    }
}

function json(value) {
    return JSON.stringify(value);
}

function localRecord(overrides = {}) {
    return {
        fuelfire_user_profile: json({ name: 'Local user', weight: 180, weightLbs: 180 }),
        workoutHistory: json({ legacy: [{ workoutName: 'Legacy session', duration: 0 }] }),
        fuelfire_workout_draft: json({ version: 1, workoutName: 'Draft', exercises: [] }),
        fuelfire_workout_session_draft: json({ version: 1, startedAt: '2026-10-28T10:00:00.000Z', exercises: [] }),
        fuelfire_logged_meals: json({ '2026-10-28': [{ name: 'Oats', calories: 300 }] }),
        fuelfire_logged_meals_recovery_backup: json({ legacy: [{ name: 'Recovery meal' }] }),
        healthData: json({ steps: 1234, activeEnergy: 400 }),
        currentWorkout: json({ workoutName: 'Preview' }),
        activeWorkout: json({ workoutName: 'Active' }),
        dailyNutrition: json({ calories: 300 }),
        dailyFoodLog: json([{ name: 'Apple' }]),
        quickAddItems: json([{ name: 'Water' }]),
        personalRecords: json([{ exercise: 'Squat', weight: 200 }]),
        '75hardStartDate': '2026-10-01T00:00:00.000Z',
        unrelated_origin_key: 'leave me alone',
        fuelfire_token: 'credential-must-stay-out',
        fuelfire_session: 'session-must-stay-out',
        fuelfire_ai_access_token: 'access-must-stay-out',
        rc_app_user_id: 'rc-user-must-stay-out',
        rc_entitlements: json({ Premium_Access: { isActive: true } }),
        ...overrides,
    };
}

describe('FuelFire account data contract', () => {
    it('exports long-lived local history and the current draft/recovery keys without credentials', () => {
        const storage = new MemoryStorage(localRecord());

        expect(accountData.MAX_BACKUP_BYTES).toBeGreaterThanOrEqual(5 * 1024 * 1024);
        expect(accountData.OWNED_KEYS).toContain('fuelfire_workout_draft');
        expect(accountData.OWNED_KEYS).toContain('fuelfire_logged_meals_recovery_backup');
        expect(accountData.OWNED_KEYS).toContain('healthData');
        expect(accountData.OWNED_KEYS).toContain('currentWorkout');
        expect(accountData.OWNED_KEYS).toContain('activeWorkout');
        expect(accountData.OWNED_KEYS).toContain('dailyNutrition');
        expect(accountData.OWNED_KEYS).toContain('dailyFoodLog');
        expect(accountData.OWNED_KEYS).toContain('quickAddItems');
        expect(accountData.OWNED_KEYS).toContain('personalRecords');
        expect(accountData.OWNED_KEYS).toContain('75hardStartDate');

        const backup = accountData.createBackup(storage, { now: '2026-10-28T12:00:00.000Z' });
        const parsed = accountData.parseBackup(backup.json);

        expect(parsed.payload.data.fuelfire_workout_draft).toEqual({ version: 1, workoutName: 'Draft', exercises: [] });
        expect(parsed.payload.data.fuelfire_logged_meals_recovery_backup).toEqual({ legacy: [{ name: 'Recovery meal' }] });
        expect(parsed.payload.data.workoutHistory).toEqual({ legacy: [{ workoutName: 'Legacy session', duration: 0 }] });
        expect(parsed.payload.data.healthData).toEqual({ steps: 1234, activeEnergy: 400 });
        expect(backup.json).not.toContain('credential-must-stay-out');
        expect(backup.json).not.toContain('session-must-stay-out');
        expect(backup.json).not.toContain('access-must-stay-out');
        expect(backup.json).not.toContain('rc-user-must-stay-out');
        expect(backup.json).not.toContain('leave me alone');
    });

    it('accepts an owned session draft key while rejecting nested credentials and prototype pollution', () => {
        const valid = {
            schemaVersion: accountData.SCHEMA_VERSION,
            app: 'fuelfire',
            exportedAt: '2026-10-28T12:00:00.000Z',
            data: {
                fuelfire_workout_session_draft: { version: 1, startedAt: '2026-10-28T10:00:00.000Z' },
            },
        };

        expect(accountData.parseBackup(JSON.stringify(valid)).keys).toEqual(['fuelfire_workout_session_draft']);

        const withCredential = {
            ...valid,
            data: { fuelfire_workout_draft: { accessToken: 'do-not-import' } },
        };
        expect(() => accountData.parseBackup(JSON.stringify(withCredential))).toThrow(/credential|access/i);

        const withPrototype = JSON.parse(JSON.stringify(valid));
        Object.defineProperty(withPrototype.data, '__proto__', {
            value: { polluted: true },
            enumerable: true,
            configurable: true,
        });
        expect(() => accountData.parseBackup(JSON.stringify(withPrototype))).toThrow();
        expect(Object.prototype.polluted).toBeUndefined();
    });

    it('does not mutate storage when parsing, validation, or confirmation fails', () => {
        const storage = new MemoryStorage(localRecord({ existing: 'not-owned' }));
        const before = storage.snapshot();

        expect(() => accountData.restoreBackup('{not-json', storage, { mode: 'replace', confirmed: true })).toThrow();
        expect(storage.snapshot()).toEqual(before);
        expect(storage.writes).toHaveLength(0);
        expect(storage.removes).toHaveLength(0);

        const unsupported = JSON.stringify({
            schemaVersion: accountData.SCHEMA_VERSION,
            app: 'fuelfire',
            exportedAt: '2026-10-28T12:00:00.000Z',
            data: { arbitrary_origin_key: { value: 1 } },
        });
        expect(() => accountData.restoreBackup(unsupported, storage, { mode: 'replace', confirmed: true })).toThrow();
        expect(storage.snapshot()).toEqual(before);
        expect(storage.writes).toHaveLength(0);
        expect(storage.removes).toHaveLength(0);

        const source = new MemoryStorage({ fuelfire_workout_draft: json({ version: 1, workoutName: 'New' }) });
        const backup = accountData.createBackup(source, { now: '2026-10-28T12:00:00.000Z' });
        expect(() => accountData.restoreBackup(backup.json, storage, { mode: 'merge' })).toThrow(/Confirm/i);
        expect(storage.snapshot()).toEqual(before);
        expect(storage.writes).toHaveLength(0);
        expect(storage.removes).toHaveLength(0);

        // A user cancel is represented by not invoking restoreBackup at all;
        // this is the same no-write path used by the dialog Cancel/Escape UI.
        expect(storage.snapshot()).toEqual(before);
    });

    it('requires explicit duplicate/replace confirmation and preserves unrelated origin storage', () => {
        const source = new MemoryStorage({
            fuelfire_workout_draft: json({ version: 1, workoutName: 'Imported' }),
            fuelfire_logged_meals_recovery_backup: json({ legacy: [{ name: 'Recovered' }] }),
        });
        const backup = accountData.createBackup(source, { now: '2026-10-28T12:00:00.000Z' });
        const target = new MemoryStorage(localRecord({
            fuelfire_workout_draft: json({ version: 1, workoutName: 'Existing' }),
            savedWorkouts: json([{ workoutName: 'Old saved workout' }]),
        }));

        expect(() => accountData.restoreBackup(backup.json, target, { mode: 'merge' })).toThrow(/Confirm/i);
        expect(JSON.parse(target.getItem('fuelfire_workout_draft')).workoutName).toBe('Existing');

        accountData.restoreBackup(backup.json, target, { mode: 'merge', confirmed: true });
        expect(JSON.parse(target.getItem('fuelfire_workout_draft')).workoutName).toBe('Imported');
        expect(target.getItem('unrelated_origin_key')).toBe('leave me alone');

        accountData.restoreBackup(backup.json, target, { mode: 'replace', confirmed: true });
        expect(target.getItem('savedWorkouts')).toBeNull();
        expect(target.getItem('unrelated_origin_key')).toBe('leave me alone');
        expect(target.getItem('rc_app_user_id')).toBe('rc-user-must-stay-out');
    });

    it('rolls back a replace restore when setItem throws partway through', () => {
        const source = new MemoryStorage({
            fuelfire_user_profile: json({ name: 'Imported user', weight: 150 }),
            workoutHistory: json({ legacy: [{ workoutName: 'Imported history' }] }),
            fuelfire_workout_draft: json({ version: 1, workoutName: 'Imported draft' }),
        });
        const backup = accountData.createBackup(source, { now: '2026-10-28T12:00:00.000Z' });
        const target = new ThrowOnceStorage(localRecord({
            fuelfire_user_profile: json({ name: 'Existing user', weight: 200 }),
            workoutHistory: json([{ workoutName: 'Existing history' }]),
            fuelfire_workout_draft: json({ version: 1, workoutName: 'Existing draft' }),
        }), 'fuelfire_workout_draft');
        const before = target.snapshot();

        expect(() => accountData.restoreBackup(backup.json, target, { mode: 'replace', confirmed: true })).toThrow(/restored|failed/i);
        expect(target.snapshot()).toEqual(before);
        expect(target.getItem('unrelated_origin_key')).toBe('leave me alone');
        expect(target.getItem('rc_app_user_id')).toBe('rc-user-must-stay-out');
        expect(target.failed).toBe(true);
    });

    it('deletes only confirmed owned data, including sensitive health and legacy keys', () => {
        const storage = new MemoryStorage(localRecord({ fuelfire_ai_access: json({ plan: 'premium' }) }));
        const before = storage.snapshot();

        expect(() => accountData.deleteOwnedData(storage)).toThrow(/Confirm/i);
        expect(storage.snapshot()).toEqual(before);

        const result = accountData.deleteOwnedData(storage, { confirmed: true });
        for (const key of [
            'fuelfire_user_profile',
            'workoutHistory',
            'fuelfire_workout_draft',
            'fuelfire_logged_meals',
            'fuelfire_logged_meals_recovery_backup',
            'healthData',
            'currentWorkout',
            'activeWorkout',
            'dailyNutrition',
            'dailyFoodLog',
            'quickAddItems',
            'personalRecords',
            '75hardStartDate',
        ]) {
            expect(storage.getItem(key), key).toBeNull();
        }
        expect(result.deletedKeys).toEqual(expect.arrayContaining(['fuelfire_workout_draft', 'healthData', '75hardStartDate']));
        expect(storage.getItem('unrelated_origin_key')).toBe('leave me alone');
        expect(storage.getItem('fuelfire_token')).toBe('credential-must-stay-out');
        expect(storage.getItem('fuelfire_session')).toBe('session-must-stay-out');
        expect(storage.getItem('fuelfire_ai_access_token')).toBe('access-must-stay-out');
        expect(storage.getItem('fuelfire_ai_access')).toBe(json({ plan: 'premium' }));
        expect(storage.getItem('rc_app_user_id')).toBe('rc-user-must-stay-out');
        expect(storage.getItem('rc_entitlements')).toBe(json({ Premium_Access: { isActive: true } }));
    });

    it('writes canonical and legacy profile fields and persists the implemented setting', () => {
        const storage = new MemoryStorage();

        accountData.writeProfile({ name: 'A Local User', gender: 'prefer-not', age: '34', weightLbs: '182.5' }, storage, { now: '2026-10-28T12:00:00.000Z' });
        const profile = accountData.readProfile(storage);
        expect(profile).toMatchObject({ name: 'A Local User', gender: 'prefer-not', age: 34, weightLbs: 182.5 });
        expect(JSON.parse(storage.getItem('fuelfire_user_profile'))).toMatchObject({ weight: 182.5, weightLbs: 182.5 });
        expect(storage.getItem('userName')).toBe('A Local User');
        expect(storage.getItem('userWeight')).toBe('182.5');

        accountData.writeSettings({ reducedMotion: true }, storage);
        expect(accountData.readSettings(storage)).toEqual({ reducedMotion: true });
    });
});
