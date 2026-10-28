(function attachFuelFireAccountData(root, factory) {
    const api = factory(root || globalThis);
    if (root) root.FuelFireAccountData = api;
    if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function createAccountDataApi(root) {
    'use strict';

    const SCHEMA_VERSION = 1;
    // Local history can legitimately contain months of workouts and meals.
    // Keep a bounded file size without making ordinary long-lived accounts
    // impossible to back up.
    const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
    const JSON_KEYS = new Set([
        'fuelfire_user_profile',
        'userProfile',
        'workoutHistory',
        'workoutHistory.legacy',
        'fuelfire_logged_meals',
        'fuelfire_logged_meals_recovery_backup',
        'fuelfire_workout_recovery_backups',
        'fuelfire_meal_plans',
        'fuelfire_saved_meal_plans',
        'fuelfire_saved_meals',
        'fuelfire_saved_meal_bundles_v1',
        'fuelfire_learned_foods',
        'fuelfire_meal_patterns_v1',
        'fuelfire_nutrition_goals',
        'fuelfire_recent_diet_goals',
        'fuelfire_diet_quiz_answers',
        'fuelfire_last_meal_plan_quiz_answers',
        'fuelfire_weekly_meal_plan_source',
        'fuelfire_body_stats',
        'fuelfire_bodyfat_entries',
        'fuelfire_weight_entries',
        'fuelfire_personal_records',
        'fuelfire_tracked_workouts',
        'recentWorkouts',
        'fitnessProgress',
        'savedWorkouts',
        'weeklySchedule',
        'fuelfire_calorie_log',
        'fuelfire_active_calories',
        'fuelfire_hydration_goal_oz',
        'fuelfire_hydration_today',
        'fuelfire_onboarding_v1',
        'fuelfire_recent_meal_plan',
        'fuelfire_settings',
        'fuelfire_account_settings',
        'healthData',
        'currentWorkout',
        'activeWorkout',
        'currentQuickWorkout',
        'dailyNutrition',
        'dailyFoodLog',
        'quickAddItems',
        'personalRecords',
        'workoutTemplates',
        'currentDietPlan',
        // Shared stores may add one of these draft keys while older builds
        // still have the singular form. They are data, not credentials.
        'fuelfire_workout_draft',
        'fuelfire_workout_drafts',
        'fuelfire_workout_session_draft',
        'fuelfire_workout_session',
        'fuelfire_food_draft',
        'fuelfire_food_entry_draft',
        'fuelfire_food_drafts',
        'stepGoal',
    ]);
    const RECOVERY_KEYS = new Set([
        'workoutHistory.legacy',
        'fuelfire_logged_meals_recovery_backup',
        'fuelfire_workout_recovery_backups',
    ]);
    const RAW_VALUE_KEYS = new Set([
        'workoutHistory.legacy',
        'fuelfire_recent_meal_plan',
    ]);
    const NUMERIC_STORAGE_KEYS = new Set([
        'fuelfire_hydration_goal_oz',
        'stepGoal',
    ]);
    const MARKER_STORAGE_KEYS = new Set([
        'fuelfire_onboarding_v1',
    ]);
    const WORKOUT_RECOVERY_KEY_PATTERN = /^workoutHistory\.legacy\.[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)?$/;
    const KNOWN_STORE_SHAPES = Object.freeze({
        workoutHistory: 'collection',
        fuelfire_logged_meals: 'collection',
        fuelfire_meal_plans: 'array',
        fuelfire_saved_meal_plans: 'array',
        fuelfire_saved_meals: 'array',
        fuelfire_saved_meal_bundles_v1: 'array',
        fuelfire_learned_foods: 'array',
        fuelfire_meal_patterns_v1: 'array',
        fuelfire_body_stats: 'record',
        fuelfire_bodyfat_entries: 'array',
        fuelfire_weight_entries: 'array',
        fuelfire_personal_records: 'array',
        fuelfire_tracked_workouts: 'array',
        recentWorkouts: 'array',
        fitnessProgress: 'record',
        savedWorkouts: 'array',
        weeklySchedule: 'record',
        fuelfire_calorie_log: 'array',
        dailyFoodLog: 'array',
        quickAddItems: 'array',
        personalRecords: 'array',
        workoutTemplates: 'array',
        fuelfire_user_profile: 'record',
        userProfile: 'record',
        fuelfire_nutrition_goals: 'record',
        fuelfire_recent_diet_goals: 'record',
        fuelfire_diet_quiz_answers: 'record',
        fuelfire_last_meal_plan_quiz_answers: 'record',
        fuelfire_weekly_meal_plan_source: 'record',
        fuelfire_hydration_today: 'record',
        fuelfire_settings: 'record',
        fuelfire_account_settings: 'record',
        healthData: 'record',
        currentWorkout: 'record',
        activeWorkout: 'record',
        currentQuickWorkout: 'record',
        dailyNutrition: 'record',
        currentDietPlan: 'record',
        fuelfire_active_calories: 'array',
        fuelfire_workout_draft: 'record',
        fuelfire_workout_drafts: 'array',
        fuelfire_workout_session_draft: 'record',
        fuelfire_workout_session: 'record',
        fuelfire_food_draft: 'record',
        fuelfire_food_entry_draft: 'record',
        fuelfire_food_drafts: 'array',
    });
    const LEGACY_TEXT_KEYS = new Set([
        'userName',
        'userGender',
        'userAge',
        'userWeight',
        'fuelfire_last_active_date',
        'fuelfire_last_bmr',
        'fuelfire_nutrition_updated',
        'fuelfire_profile_updated',
        'fuelfire_apple_health_connected_at',
        'fuelfire_watch_prompt_dismissed_at',
        'fuelfire_pending_screen',
        'fuelfire_bulk_mode',
        '75hardStartDate',
    ]);
    const OWNED_KEYS = Object.freeze([
        ...Array.from(JSON_KEYS),
        ...Array.from(LEGACY_TEXT_KEYS),
    ]);
    const OWNED_KEY_SET = new Set(OWNED_KEYS);
    const ROOT_KEYS = new Set(['schemaVersion', 'app', 'exportedAt', 'data']);
    const DANGEROUS_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
    const SENSITIVE_KEY_PATTERN = /(?:password|token|secret|credential|authorization|cookie|session|refresh|access|revenuecat|^rc(?:_|$))/i;

    class AccountDataError extends Error {
        constructor(code, message, details = {}) {
            super(message);
            this.name = 'AccountDataError';
            this.code = code;
            Object.assign(this, details);
        }
    }

    function ensureStorage(storage) {
        const candidate = storage || root?.localStorage;
        if (!candidate || typeof candidate.getItem !== 'function' || typeof candidate.setItem !== 'function' || typeof candidate.removeItem !== 'function') {
            throw new AccountDataError('STORAGE_UNAVAILABLE', 'Local app storage is unavailable.');
        }
        return candidate;
    }

    function getItem(storage, key) {
        return storage.getItem(key);
    }

    function parseStoredValue(raw) {
        if (raw === null || raw === undefined) return undefined;
        try {
            return JSON.parse(raw);
        } catch (error) {
            return raw;
        }
    }

    function isPlainRecord(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
        const proto = Object.getPrototypeOf(value);
        return proto === Object.prototype || proto === null;
    }

    function isCollectionPayload(value) {
        return Array.isArray(value) || isPlainRecord(value);
    }

    function isNumericStorageValue(value) {
        if (typeof value === 'number') return Number.isFinite(value);
        return typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value));
    }

    function assertWorkoutRecoveryBackups(value) {
        if (!Array.isArray(value) || value.length > 8) {
            throw new AccountDataError('INVALID_BACKUP', 'fuelfire_workout_recovery_backups must be an array of at most 8 entries.', { key: 'fuelfire_workout_recovery_backups' });
        }
        const keys = new Set();
        value.forEach((entry, index) => {
            if (!isPlainRecord(entry) || Object.keys(entry).length !== 2 || Object.keys(entry).some((key) => key !== 'key' && key !== 'raw')) {
                throw new AccountDataError('INVALID_BACKUP', `Workout recovery entry ${index + 1} must contain only key and raw.`, { key: 'fuelfire_workout_recovery_backups' });
            }
            if (typeof entry.key !== 'string' || !WORKOUT_RECOVERY_KEY_PATTERN.test(entry.key)) {
                throw new AccountDataError('INVALID_BACKUP', `Workout recovery entry ${index + 1} has an invalid recovery key.`, { key: 'fuelfire_workout_recovery_backups' });
            }
            if (keys.has(entry.key)) {
                throw new AccountDataError('INVALID_BACKUP', `Workout recovery entry ${index + 1} duplicates a recovery key.`, { key: 'fuelfire_workout_recovery_backups' });
            }
            keys.add(entry.key);
            if (typeof entry.raw !== 'string') {
                throw new AccountDataError('INVALID_BACKUP', `Workout recovery entry ${index + 1} raw value must remain a string.`, { key: 'fuelfire_workout_recovery_backups' });
            }
        });
    }

    function assertKnownStoreTypes(data) {
        Object.entries(data).forEach(([key, value]) => {
            if (key === 'workoutHistory.legacy') {
                if (typeof value !== 'string') {
                    throw new AccountDataError('INVALID_BACKUP', 'workoutHistory.legacy must remain an opaque raw string.', { key });
                }
                return;
            }
            if (key === 'fuelfire_workout_recovery_backups') {
                assertWorkoutRecoveryBackups(value);
                return;
            }
            if (NUMERIC_STORAGE_KEYS.has(key)) {
                if (!isNumericStorageValue(value)) {
                    throw new AccountDataError('INVALID_BACKUP', `Known scalar store "${key}" must contain a finite number or numeric string.`, { key });
                }
                return;
            }
            if (MARKER_STORAGE_KEYS.has(key)) {
                if (typeof value !== 'string' && typeof value !== 'boolean') {
                    throw new AccountDataError('INVALID_BACKUP', `Known marker store "${key}" must contain a string or boolean.`, { key });
                }
                return;
            }
            const shape = KNOWN_STORE_SHAPES[key];
            let valid = true;
            if (shape === 'collection') valid = isCollectionPayload(value);
            else if (shape === 'array') valid = Array.isArray(value);
            else if (shape === 'record') valid = isPlainRecord(value);
            if (!valid) {
                const expected = shape === 'collection' ? 'an array or object' : shape === 'array' ? 'an array' : 'an object';
                throw new AccountDataError('INVALID_BACKUP', `Known store "${key}" must contain ${expected}.`, { key });
            }
            if (RECOVERY_KEYS.has(key) && !(typeof value === 'string' || isCollectionPayload(value))) {
                throw new AccountDataError('INVALID_BACKUP', `Recovery key "${key}" must contain a string, array, or object.`, { key });
            }
        });
    }

    function byteLength(value) {
        const text = typeof value === 'string' ? value : JSON.stringify(value);
        if (typeof TextEncoder === 'function') return new TextEncoder().encode(text).length;
        return unescape(encodeURIComponent(text)).length;
    }

    function assertSafeJsonValue(value, path = '$', seen = new Set(), depth = 0) {
        if (depth > 30) {
            throw new AccountDataError('INVALID_BACKUP', `Backup value is too deeply nested at ${path}.`);
        }
        if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') {
            if (typeof value === 'number' && !Number.isFinite(value)) {
                throw new AccountDataError('INVALID_BACKUP', `Backup contains a non-finite number at ${path}.`);
            }
            return;
        }
        if (Array.isArray(value)) {
            if (seen.has(value)) throw new AccountDataError('INVALID_BACKUP', `Backup contains a circular value at ${path}.`);
            seen.add(value);
            value.forEach((item, index) => assertSafeJsonValue(item, `${path}[${index}]`, seen, depth + 1));
            seen.delete(value);
            return;
        }
        if (!isPlainRecord(value)) {
            throw new AccountDataError('INVALID_BACKUP', `Backup contains an unsupported value at ${path}.`);
        }
        if (seen.has(value)) throw new AccountDataError('INVALID_BACKUP', `Backup contains a circular value at ${path}.`);
        seen.add(value);
        Object.keys(value).forEach((key) => {
            if (DANGEROUS_KEYS.has(key)) {
                throw new AccountDataError('INVALID_BACKUP', `Backup contains a blocked property name at ${path}.`);
            }
            // Storage keys are checked against the explicit allowlist before
            // this generic credential guard. Some owned keys contain words
            // such as "session" because they are drafts, not credentials.
            const isOwnedBackupKey = path === '$.data' && OWNED_KEY_SET.has(key);
            if (SENSITIVE_KEY_PATTERN.test(key) && !isOwnedBackupKey) {
                throw new AccountDataError('SENSITIVE_DATA', `Backup contains a credential or access field at ${path}.${key}.`);
            }
            assertSafeJsonValue(value[key], `${path}.${key}`, seen, depth + 1);
        });
        seen.delete(value);
    }

    function cloneJson(value) {
        if (value === undefined) return undefined;
        return JSON.parse(JSON.stringify(value));
    }

    function parseOwnedValue(key, raw) {
        if (RAW_VALUE_KEYS.has(key)) return raw;
        if (RECOVERY_KEYS.has(key)) {
            try {
                const parsed = JSON.parse(raw);
                return isCollectionPayload(parsed) ? parsed : raw;
            } catch (error) {
                return raw;
            }
        }
        return parseStoredValue(raw);
    }

    function toStorageValue(key, value) {
        if (RAW_VALUE_KEYS.has(key) || (RECOVERY_KEYS.has(key) && typeof value === 'string')) return value;
        if (NUMERIC_STORAGE_KEYS.has(key)) return String(value);
        if (MARKER_STORAGE_KEYS.has(key)) return String(value);
        if (LEGACY_TEXT_KEYS.has(key)) {
            if (value === null || value === undefined) return '';
            return String(value);
        }
        return JSON.stringify(value);
    }

    function readOwnedData(storage = root?.localStorage) {
        const target = ensureStorage(storage);
        const data = {};
        OWNED_KEYS.forEach((key) => {
            const raw = getItem(target, key);
            if (raw === null) return;
            data[key] = parseOwnedValue(key, raw);
        });
        return data;
    }

    function createBackup(storage = root?.localStorage, options = {}) {
        const target = ensureStorage(storage);
        const exportedAt = options.now ? new Date(options.now) : new Date();
        if (Number.isNaN(exportedAt.getTime())) {
            throw new AccountDataError('INVALID_DATE', 'Backup timestamp is invalid.');
        }
        const payload = {
            schemaVersion: SCHEMA_VERSION,
            app: 'fuelfire',
            exportedAt: exportedAt.toISOString(),
            data: readOwnedData(target),
        };
        assertKnownStoreTypes(payload.data);
        assertSafeJsonValue(payload);
        const json = JSON.stringify(payload, null, 2);
        const bytes = byteLength(json);
        const maxBytes = Number.isFinite(options.maxBytes) ? options.maxBytes : MAX_BACKUP_BYTES;
        if (bytes > maxBytes) {
            throw new AccountDataError('BACKUP_TOO_LARGE', `Backup is ${bytes} bytes; the maximum is ${maxBytes} bytes.`, { bytes, maxBytes });
        }
        const datePart = exportedAt.toISOString().slice(0, 10);
        return {
            payload,
            json,
            bytes,
            filename: `fuelfire-backup-${datePart}.json`,
            blob: typeof Blob === 'function' ? new Blob([json], { type: 'application/json' }) : null,
        };
    }

    function parseBackup(input, options = {}) {
        const maxBytes = Number.isFinite(options.maxBytes) ? options.maxBytes : MAX_BACKUP_BYTES;
        let payload;
        if (typeof input === 'string') {
            if (byteLength(input) > maxBytes) {
                throw new AccountDataError('BACKUP_TOO_LARGE', `Backup exceeds the ${maxBytes}-byte limit.`, { maxBytes });
            }
            try {
                payload = JSON.parse(input);
            } catch (error) {
                throw new AccountDataError('INVALID_BACKUP', 'Backup is not valid JSON.');
            }
        } else {
            payload = input;
        }
        if (!isPlainRecord(payload)) {
            throw new AccountDataError('INVALID_BACKUP', 'Backup must be a JSON object.');
        }
        const unknownRootKeys = Object.keys(payload).filter((key) => !ROOT_KEYS.has(key));
        if (unknownRootKeys.length) {
            throw new AccountDataError('INVALID_BACKUP', `Backup contains unsupported top-level fields: ${unknownRootKeys.join(', ')}.`);
        }
        if (payload.schemaVersion !== SCHEMA_VERSION || payload.app !== 'fuelfire') {
            throw new AccountDataError('UNSUPPORTED_BACKUP', 'Backup was created by an unsupported FuelFire version.');
        }
        if (typeof payload.exportedAt !== 'string' || Number.isNaN(Date.parse(payload.exportedAt))) {
            throw new AccountDataError('INVALID_BACKUP', 'Backup timestamp is missing or invalid.');
        }
        if (!isPlainRecord(payload.data)) {
            throw new AccountDataError('INVALID_BACKUP', 'Backup data must be an object.');
        }
        Object.keys(payload.data).forEach((key) => {
            if (!JSON_KEYS.has(key) && !LEGACY_TEXT_KEYS.has(key)) {
                throw new AccountDataError('UNSUPPORTED_KEY', `Backup contains a key that FuelFire does not own: ${key}.`);
            }
            if (DANGEROUS_KEYS.has(key) || (SENSITIVE_KEY_PATTERN.test(key) && !OWNED_KEY_SET.has(key))) {
                throw new AccountDataError('SENSITIVE_DATA', `Backup contains a blocked storage key: ${key}.`);
            }
        });
        assertKnownStoreTypes(payload.data);
        assertSafeJsonValue(payload);
        const normalized = cloneJson(payload);
        const bytes = byteLength(JSON.stringify(normalized));
        if (bytes > maxBytes) {
            throw new AccountDataError('BACKUP_TOO_LARGE', `Backup is ${bytes} bytes; the maximum is ${maxBytes} bytes.`, { bytes, maxBytes });
        }
        return { payload: normalized, bytes, keys: Object.keys(normalized.data) };
    }

    function previewBackup(input, storage = root?.localStorage, options = {}) {
        const parsed = parseBackup(input, options);
        const target = ensureStorage(storage);
        const duplicateKeys = parsed.keys.filter((key) => getItem(target, key) !== null);
        return {
            ...parsed,
            duplicateKeys,
            hasDuplicates: duplicateKeys.length > 0,
        };
    }

    function captureSnapshot(storage) {
        const snapshot = new Map();
        OWNED_KEYS.forEach((key) => {
            const value = getItem(storage, key);
            if (value !== null) snapshot.set(key, value);
        });
        return snapshot;
    }

    function restoreSnapshot(storage, snapshot) {
        OWNED_KEYS.forEach((key) => {
            if (getItem(storage, key) !== null) storage.removeItem(key);
        });
        snapshot.forEach((value, key) => {
            storage.setItem(key, value);
        });
    }

    function restoreBackup(input, storage = root?.localStorage, options = {}) {
        const parsed = parseBackup(input, options);
        const target = ensureStorage(storage);
        const duplicateKeys = parsed.keys.filter((key) => getItem(target, key) !== null);
        const mode = options.mode || 'merge';
        if (mode !== 'merge' && mode !== 'replace') {
            throw new AccountDataError('INVALID_MODE', 'Restore mode must be merge or replace.');
        }
        if ((duplicateKeys.length || mode === 'replace') && options.confirmed !== true) {
            throw new AccountDataError('CONFIRMATION_REQUIRED', 'Confirm how existing local data should be handled before restoring.', { duplicateKeys, mode });
        }

        const snapshot = captureSnapshot(target);
        const restoredKeys = [];
        const removedKeys = [];
        try {
            if (mode === 'replace') {
                OWNED_KEYS.forEach((key) => {
                    if (getItem(target, key) !== null) {
                        target.removeItem(key);
                        removedKeys.push(key);
                    }
                });
            }
            Object.entries(parsed.payload.data).forEach(([key, value]) => {
                target.setItem(key, toStorageValue(key, value));
                restoredKeys.push(key);
            });
            return {
                ok: true,
                mode,
                restoredKeys,
                removedKeys,
                duplicateKeys,
            };
        } catch (error) {
            try {
                restoreSnapshot(target, snapshot);
            } catch (rollbackError) {
                throw new AccountDataError('ROLLBACK_FAILED', 'Restore failed and local storage could not be rolled back safely.', { cause: error, rollbackError });
            }
            throw new AccountDataError('RESTORE_FAILED', 'Restore failed; existing local data was restored.', { cause: error });
        }
    }

    function deleteOwnedData(storage = root?.localStorage, options = {}) {
        if (options.confirmed !== true) {
            throw new AccountDataError('CONFIRMATION_REQUIRED', 'Confirm deletion of local app data first.');
        }
        const target = ensureStorage(storage);
        const snapshot = captureSnapshot(target);
        const deletedKeys = [];
        try {
            OWNED_KEYS.forEach((key) => {
                if (getItem(target, key) !== null) {
                    target.removeItem(key);
                    deletedKeys.push(key);
                }
            });
            return { ok: true, deletedKeys, preservedKeys: Array.from(snapshot.keys()).filter((key) => !deletedKeys.includes(key)) };
        } catch (error) {
            try {
                restoreSnapshot(target, snapshot);
            } catch (rollbackError) {
                throw new AccountDataError('ROLLBACK_FAILED', 'Deletion failed and local storage could not be restored safely.', { cause: error, rollbackError });
            }
            throw new AccountDataError('DELETE_FAILED', 'Deletion failed; existing local data was restored.', { cause: error });
        }
    }

    function parseObjectFromStorage(storage, key) {
        const raw = getItem(storage, key);
        if (!raw) return {};
        try {
            const parsed = JSON.parse(raw);
            return isPlainRecord(parsed) ? parsed : {};
        } catch (error) {
            return {};
        }
    }

    function readProfile(storage = root?.localStorage) {
        const target = ensureStorage(storage);
        const canonical = parseObjectFromStorage(target, 'fuelfire_user_profile');
        const legacyObject = parseObjectFromStorage(target, 'userProfile');
        const readLegacyText = (key) => {
            const value = getItem(target, key);
            return value === null ? '' : String(value).trim();
        };
        const profile = {
            ...legacyObject,
            ...canonical,
        };
        const name = String(profile.name || profile.displayName || readLegacyText('userName') || '').trim();
        const gender = String(profile.gender || profile.sex || readLegacyText('userGender') || '').trim();
        const ageValue = profile.age ?? readLegacyText('userAge');
        const weightValue = profile.weightLbs ?? profile.weight ?? readLegacyText('userWeight');
        const age = Number(ageValue);
        const weight = Number(weightValue);
        return {
            ...profile,
            name,
            gender,
            age: Number.isFinite(age) && age >= 0 ? age : null,
            weightLbs: Number.isFinite(weight) && weight > 0 ? weight : null,
        };
    }

    function writeProfile(profileInput = {}, storage = root?.localStorage, options = {}) {
        const target = ensureStorage(storage);
        const existing = parseObjectFromStorage(target, 'fuelfire_user_profile');
        const input = isPlainRecord(profileInput) ? profileInput : {};
        const name = String(input.name ?? input.displayName ?? '').trim().slice(0, 120);
        const gender = String(input.gender ?? input.sex ?? '').trim().slice(0, 40);
        const ageRaw = input.age === '' || input.age === null || input.age === undefined ? null : Number(input.age);
        const weightRaw = input.weightLbs === '' || input.weightLbs === null || input.weightLbs === undefined ? null : Number(input.weightLbs);
        if (ageRaw !== null && (!Number.isFinite(ageRaw) || ageRaw < 0 || ageRaw > 120)) {
            throw new AccountDataError('INVALID_PROFILE', 'Age must be between 0 and 120.');
        }
        if (weightRaw !== null && (!Number.isFinite(weightRaw) || weightRaw <= 0 || weightRaw > 1500)) {
            throw new AccountDataError('INVALID_PROFILE', 'Weight must be greater than 0 and no more than 1,500 lb.');
        }
        const updatedAt = options.now ? new Date(options.now) : new Date();
        if (Number.isNaN(updatedAt.getTime())) throw new AccountDataError('INVALID_DATE', 'Profile timestamp is invalid.');

        const next = { ...existing };
        if (name) next.name = name;
        else delete next.name;
        if (gender) {
            next.gender = gender;
            next.sex = gender;
        } else {
            delete next.gender;
            delete next.sex;
        }
        if (ageRaw !== null) next.age = ageRaw;
        else delete next.age;
        if (weightRaw !== null) {
            next.weight = weightRaw;
            next.weightLbs = weightRaw;
        } else {
            delete next.weight;
            delete next.weightLbs;
        }
        next.updatedAt = updatedAt.toISOString();
        assertSafeJsonValue(next, '$.profile');

        const legacy = { ...next };
        delete legacy.gender;
        target.setItem('fuelfire_user_profile', JSON.stringify(next));
        target.setItem('userProfile', JSON.stringify(legacy));
        if (name) target.setItem('userName', name); else target.removeItem('userName');
        if (gender) target.setItem('userGender', gender); else target.removeItem('userGender');
        if (ageRaw !== null) target.setItem('userAge', String(ageRaw)); else target.removeItem('userAge');
        if (weightRaw !== null) target.setItem('userWeight', String(weightRaw)); else target.removeItem('userWeight');
        return next;
    }

    function readSettings(storage = root?.localStorage) {
        const target = ensureStorage(storage);
        const stored = parseObjectFromStorage(target, 'fuelfire_settings');
        return { reducedMotion: stored.reducedMotion === true };
    }

    function writeSettings(settings = {}, storage = root?.localStorage) {
        const target = ensureStorage(storage);
        const next = { reducedMotion: settings.reducedMotion === true };
        target.setItem('fuelfire_settings', JSON.stringify(next));
        return next;
    }

    function normalizeCollection(value) {
        if (Array.isArray(value)) return value;
        if (!isPlainRecord(value)) return [];
        if (Array.isArray(value.records)) return value.records;
        if (Array.isArray(value.items)) return value.items;
        if (Array.isArray(value.history)) return value.history;
        return Object.values(value).flatMap((entry) => {
            if (Array.isArray(entry)) return entry;
            if (isPlainRecord(entry) && Array.isArray(entry.meals)) return entry.meals;
            return [];
        });
    }

    function readWorkouts(storage = root?.localStorage) {
        const target = ensureStorage(storage);
        const canonicalStore = root?.FuelFireWorkouts;
        if (canonicalStore && typeof canonicalStore.readHistory === 'function') {
            try {
                return normalizeCollection(canonicalStore.readHistory(target));
            } catch (error) {
                // Standalone account tests can still read the canonical key
                // until the shared store is present in the assembled app.
            }
        }
        return normalizeCollection(parseStoredValue(getItem(target, 'workoutHistory')));
    }

    function readMeals(storage = root?.localStorage) {
        const target = ensureStorage(storage);
        const canonicalStore = root?.FuelFireFoodStore;
        if (canonicalStore && typeof canonicalStore.readLogs === 'function') {
            try {
                return normalizeCollection(canonicalStore.readLogs(target));
            } catch (error) {
                // Standalone account tests can still read the canonical key
                // until the shared store is present in the assembled app.
            }
        }
        return normalizeCollection(parseStoredValue(getItem(target, 'fuelfire_logged_meals')));
    }

    function countStoredCollection(storage, key) {
        return normalizeCollection(parseStoredValue(getItem(storage, key))).length;
    }

    function readMetrics(storage = root?.localStorage) {
        const target = ensureStorage(storage);
        const workouts = readWorkouts(target);
        const meals = readMeals(target);
        const mealPlans = Math.max(
            countStoredCollection(target, 'fuelfire_meal_plans'),
            countStoredCollection(target, 'fuelfire_saved_meal_plans'),
        );
        const savedWorkouts = Math.max(
            countStoredCollection(target, 'savedWorkouts'),
            countStoredCollection(target, 'fuelfire_tracked_workouts'),
        );
        return {
            workouts,
            meals,
            workoutsCount: workouts.length,
            mealsCount: meals.length,
            mealPlansCount: mealPlans,
            savedWorkoutsCount: savedWorkouts,
            hasAnyData: Boolean(workouts.length || meals.length || mealPlans || savedWorkouts),
        };
    }

    const INACTIVE_ENTITLEMENT_STATUSES = new Set(['inactive', 'expired', 'revoked', 'cancelled', 'canceled']);
    const ACTIVE_ENTITLEMENT_STATUSES = new Set(['active', 'trial', 'trialing', 'subscribed']);

    function expirationTimestamp(value) {
        if (value === null || value === undefined || value === '') return null;
        if (typeof value === 'number') {
            if (!Number.isFinite(value)) return null;
            return value < 1e12 ? value * 1000 : value;
        }
        const parsed = Date.parse(String(value));
        return Number.isNaN(parsed) ? null : parsed;
    }

    function entitlementIsInactive(value) {
        if (value === false) return true;
        if (!isPlainRecord(value)) return false;
        if (value.isActive === false || value.active === false || value.revoked === true) return true;
        const status = typeof value.status === 'string' ? value.status.toLowerCase() : '';
        if (INACTIVE_ENTITLEMENT_STATUSES.has(status)) return true;
        const expiration = expirationTimestamp(value.expirationDate || value.expiresDate || value.expiresAt);
        return expiration !== null && expiration <= Date.now();
    }

    function entitlementIsActive(value, assumeActive = false) {
        if (entitlementIsInactive(value)) return false;
        if (value === true) return true;
        if (!isPlainRecord(value)) return false;
        if (value.isActive === true || value.active === true) return true;
        const status = typeof value.status === 'string' ? value.status.toLowerCase() : '';
        if (ACTIVE_ENTITLEMENT_STATUSES.has(status)) return true;
        const expiration = expirationTimestamp(value.expirationDate || value.expiresDate || value.expiresAt);
        if (expiration !== null) return expiration > Date.now();
        return assumeActive;
    }

    function buildEntitlementStatus(entitlements, options = {}) {
        const entries = isPlainRecord(entitlements) ? entitlements : {};
        const activeEntries = Object.entries(entries).filter(([, value]) => entitlementIsActive(value, options.assumeActive === true));
        const names = activeEntries.map(([name]) => name);
        const expirationDates = activeEntries
            .map(([, value]) => isPlainRecord(value) ? (value.expirationDate || value.expiresDate || value.expiresAt || null) : null)
            .filter(Boolean);
        return {
            available: options.available !== undefined ? options.available : false,
            configured: options.configured !== undefined ? options.configured : false,
            active: names.length > 0,
            entitlementNames: names,
            expirationDates,
            source: options.source || 'cache',
        };
    }

    function statusCandidate(rawStatus) {
        if (!isPlainRecord(rawStatus)) return null;
        if (isPlainRecord(rawStatus.status) && !rawStatus.entitlements && !rawStatus.activeEntitlements) {
            return rawStatus.status;
        }
        return rawStatus;
    }

    function providerEntitlementData(rawStatus) {
        const status = statusCandidate(rawStatus);
        if (!status) return null;
        const directActive = typeof status.active === 'boolean' ? status.active : null;
        if (isPlainRecord(status.entitlements?.active)) {
            return { status, entitlements: status.entitlements.active, assumeActive: true, directActive };
        }
        if (isPlainRecord(status.activeEntitlements)) {
            return { status, entitlements: status.activeEntitlements, assumeActive: true, directActive };
        }
        if (isPlainRecord(status.active)) {
            return { status, entitlements: status.active, assumeActive: true, directActive };
        }
        if (isPlainRecord(status.entitlements)) {
            return { status, entitlements: status.entitlements, assumeActive: false, directActive };
        }
        const metadataKeys = new Set(['available', 'configured', 'active', 'entitlementNames', 'expirationDates', 'refreshError', 'status']);
        const directEntries = Object.fromEntries(Object.entries(status).filter(([key]) => !metadataKeys.has(key)));
        return { status, entitlements: directEntries, assumeActive: false, directActive };
    }

    function normalizeProviderStatus(rawStatus, api) {
        const data = providerEntitlementData(rawStatus);
        if (!data) return null;
        const status = data.status;
        const result = buildEntitlementStatus(data.entitlements, {
            available: typeof status.available === 'boolean' ? status.available : true,
            configured: typeof status.configured === 'boolean' ? status.configured : Boolean(api),
            source: 'provider',
            assumeActive: data.assumeActive,
        });
        if (data.directActive === false) {
            result.active = false;
            result.entitlementNames = [];
            result.expirationDates = [];
        }
        if (!result.entitlementNames.length && data.directActive === true && Array.isArray(status.entitlementNames)) {
            result.entitlementNames = status.entitlementNames.slice();
            result.active = result.entitlementNames.length > 0;
            result.expirationDates = Array.isArray(status.expirationDates) ? status.expirationDates.slice() : [];
        }
        return result;
    }

    function readProviderStatus(api) {
        if (!api || typeof api.getStatus !== 'function') return null;
        try {
            const rawStatus = api.getStatus();
            if (rawStatus && typeof rawStatus.then === 'function') return null;
            return normalizeProviderStatus(rawStatus, api);
        } catch (error) {
            return null;
        }
    }

    async function readProviderStatusAsync(api) {
        if (!api || typeof api.getStatus !== 'function') return null;
        const rawStatus = await api.getStatus();
        return normalizeProviderStatus(rawStatus, api);
    }

    function readCachedRevenueCatStatus(storage, api) {
        let entitlements = {};
        const raw = getItem(storage, 'rc_entitlements');
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (isPlainRecord(parsed)) entitlements = parsed;
            } catch (error) {
                entitlements = {};
            }
        }
        return buildEntitlementStatus(entitlements, {
            available: Boolean(api && (typeof api.getStatus === 'function' || typeof api.refreshEntitlements === 'function' || typeof api.restorePurchases === 'function')),
            configured: Boolean(api),
            source: 'cache',
        });
    }

    function readRevenueCatStatus(storage = root?.localStorage) {
        const target = ensureStorage(storage);
        const api = root?.__aiAccess;
        return readProviderStatus(api) || readCachedRevenueCatStatus(target, api);
    }

    async function refreshRevenueCatStatus(options = {}) {
        const target = ensureStorage(options.storage || root?.localStorage);
        const api = options.api || root?.__aiAccess;
        if (!api) return readRevenueCatStatus(target);
        try {
            if (typeof api.refreshEntitlements === 'function') await api.refreshEntitlements();
            const providerStatus = await readProviderStatusAsync(api);
            return providerStatus || readCachedRevenueCatStatus(target, api);
        } catch (error) {
            const fallback = readProviderStatus(api) || readCachedRevenueCatStatus(target, api);
            return { ...fallback, refreshError: true };
        }
    }

    return Object.freeze({
        AccountDataError,
        SCHEMA_VERSION,
        MAX_BACKUP_BYTES,
        OWNED_KEYS,
        createBackup,
        parseBackup,
        previewBackup,
        restoreBackup,
        deleteOwnedData,
        readOwnedData,
        readProfile,
        writeProfile,
        readSettings,
        writeSettings,
        readWorkouts,
        readMeals,
        readMetrics,
        readRevenueCatStatus,
        refreshRevenueCatStatus,
    });
});
