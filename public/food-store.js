(function attachFuelFireFoodStore(global) {
    'use strict';

    const STORAGE_KEY = 'fuelfire_logged_meals';
    const RECOVERY_BACKUP_KEY = `${STORAGE_KEY}_recovery_backup`;

    function getStorage(storage) {
        if (storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function') {
            return storage;
        }
        try {
            return global.localStorage;
        } catch (error) {
            return null;
        }
    }

    function asFiniteNonNegative(value, fallback = 0) {
        const parsed = typeof value === 'number'
            ? value
            : Number(String(value ?? '').replace(/,/g, '').trim());
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
    }

    function cleanText(value, fallback = '') {
        const cleaned = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
        return cleaned || fallback;
    }

    function localDateKey(value = new Date()) {
        const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
        if (Number.isNaN(date.getTime())) return localDateKey(new Date());
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function normalizeMeal(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

        const calories = asFiniteNonNegative(value.calories);
        const protein = asFiniteNonNegative(value.protein);
        const carbs = asFiniteNonNegative(value.carbs);
        const fiber = Math.min(carbs, asFiniteNonNegative(value.fiber));
        const netCarbs = Math.min(carbs, asFiniteNonNegative(
            value.netCarbs,
            Math.max(0, carbs - fiber)
        ));
        const name = cleanText(value.name || value.foodName, 'Food item');

        return {
            ...value,
            name,
            calories,
            protein,
            carbs,
            fiber,
            netCarbs,
            fat: asFiniteNonNegative(value.fat),
            sugar: asFiniteNonNegative(value.sugar),
            quantity: asFiniteNonNegative(value.quantity, 1) || 1,
            serving: cleanText(value.serving, '1 serving'),
            type: cleanText(value.type || value.meal, 'snack'),
        };
    }

    function normalizeDay(value) {
        const day = Array.isArray(value) ? {} : (value && typeof value === 'object' ? value : {});
        const rawMeals = Array.isArray(value) ? value : day.meals;
        const meals = (Array.isArray(rawMeals) ? rawMeals : [])
            .map(normalizeMeal)
            .filter(Boolean);

        return {
            ...day,
            meals,
            totalCalories: meals.reduce((total, meal) => total + meal.calories, 0),
        };
    }

    function normalizeLegacyArray(value) {
        const grouped = {};
        value.forEach((meal) => {
            const normalized = normalizeMeal(meal);
            if (!normalized) return;
            const key = localDateKey(meal?.date || meal?.time || meal?.loggedAt || new Date());
            grouped[key] ||= { meals: [], totalCalories: 0 };
            grouped[key].meals.push(normalized);
        });
        return grouped;
    }

    function normalizeLogs(value) {
        if (Array.isArray(value)) return normalizeLegacyArray(value);
        if (!value || typeof value !== 'object') return {};

        const normalized = {};
        Object.entries(value).forEach(([rawKey, rawDay]) => {
            let key = '';
            if (/^\d{4}-\d{2}-\d{2}$/.test(rawKey)) {
                key = rawKey;
            } else if (rawKey) {
                const parsedKey = new Date(rawKey);
                if (!Number.isNaN(parsedKey.getTime())) key = localDateKey(parsedKey);
            }
            if (!key) return;
            const day = normalizeDay(rawDay);
            if (day.meals.length || (rawDay && typeof rawDay === 'object')) {
                normalized[key] = day;
            }
        });
        return normalized;
    }

    function preserveOriginal(storage, raw, reason) {
        if (!storage || raw === null || raw === undefined) return { ok: true, alreadyBacked: true };
        let existing;
        try {
            existing = storage.getItem(RECOVERY_BACKUP_KEY);
            if (existing) {
                if (existing === raw) return { ok: true, alreadyBacked: true };
                const payload = JSON.parse(existing);
                if (payload === raw || (payload && payload.original === raw)) {
                    return { ok: true, alreadyBacked: true };
                }
                return {
                    ok: false,
                    error: new Error('The existing food recovery backup does not contain this raw payload.'),
                };
            }
        } catch (error) {
            return {
                ok: false,
                error: error instanceof Error ? error : new Error('The food recovery backup could not be read.'),
            };
        }

        const backup = JSON.stringify({
            savedAt: new Date().toISOString(),
            reason,
            original: raw,
        });
        try {
            storage.setItem(RECOVERY_BACKUP_KEY, backup);
            if (storage.getItem(RECOVERY_BACKUP_KEY) !== backup) {
                throw new Error('The food recovery backup did not persist.');
            }
            return { ok: true, alreadyBacked: false };
        } catch (error) {
            return {
                ok: false,
                error: error instanceof Error ? error : new Error('The food recovery backup could not be written.'),
            };
        }
    }

    function restoreOriginal(storage, raw) {
        if (!storage) return;
        try {
            if (raw === null || raw === undefined) {
                if (typeof storage.removeItem === 'function') storage.removeItem(STORAGE_KEY);
            } else {
                storage.setItem(STORAGE_KEY, raw);
            }
        } catch (error) {
            // A failed restore must not hide the original write failure. The
            // recovery backup is attempted separately before this point.
        }
    }

    function storageFailure(normalized, message, cause) {
        const error = cause instanceof Error ? cause : new Error(message);
        if (!error.message) error.message = message;
        return {
            ok: false,
            logs: normalized,
            error,
        };
    }

    function readLogs(storage) {
        const target = getStorage(storage);
        readLogs.lastError = null;
        if (!target) {
            readLogs.lastError = new Error('Food log storage is unavailable.');
            return {};
        }

        let raw;
        try {
            raw = target.getItem(STORAGE_KEY);
        } catch (error) {
            readLogs.lastError = error instanceof Error ? error : new Error('Food log storage could not be read.');
            return {};
        }
        if (!raw) return {};

        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (error) {
            const backup = preserveOriginal(target, raw, 'invalid-json');
            if (!backup.ok) {
                readLogs.lastError = backup.error;
                return {};
            }
            const recovered = JSON.stringify({});
            try {
                target.setItem(STORAGE_KEY, recovered);
                if (target.getItem(STORAGE_KEY) !== recovered) {
                    throw new Error('Food log recovery did not persist.');
                }
            } catch (writeError) {
                // Keep returning a safe empty value if storage is unavailable.
                restoreOriginal(target, raw);
                readLogs.lastError = writeError instanceof Error
                    ? writeError
                    : new Error('Food log recovery could not be persisted.');
            }
            return {};
        }

        const normalized = normalizeLogs(parsed);
        if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
            const backup = preserveOriginal(target, raw, Array.isArray(parsed) ? 'legacy-array' : 'normalized-or-corrupt');
            if (!backup.ok) {
                readLogs.lastError = backup.error;
                return normalized;
            }
            const serialized = JSON.stringify(normalized);
            try {
                target.setItem(STORAGE_KEY, serialized);
                if (target.getItem(STORAGE_KEY) !== serialized) {
                    throw new Error('Food log migration did not persist.');
                }
            } catch (error) {
                // Return the normalized in-memory value even if storage is read-only.
                restoreOriginal(target, raw);
                readLogs.lastError = error instanceof Error
                    ? error
                    : new Error('Food log migration could not be persisted.');
            }
        }
        return normalized;
    }

    function writeLogs(logs, storage) {
        const target = getStorage(storage);
        const normalized = normalizeLogs(logs);
        writeLogs.lastError = null;
        if (!target) {
            const failure = storageFailure(normalized, 'Food log storage is unavailable.');
            writeLogs.lastError = failure.error;
            return failure;
        }

        let existing;
        try {
            existing = target.getItem(STORAGE_KEY);
        } catch (error) {
            const failure = storageFailure(normalized, 'Food log storage could not be read.', error);
            writeLogs.lastError = failure.error;
            return failure;
        }
        if (existing) {
            let needsRecovery = false;
            try {
                const parsedExisting = JSON.parse(existing);
                needsRecovery = JSON.stringify(parsedExisting) !== JSON.stringify(normalizeLogs(parsedExisting));
            } catch (error) {
                needsRecovery = true;
            }
            if (needsRecovery) {
                const backup = preserveOriginal(target, existing, 'write-recovery');
                if (!backup.ok) {
                    const failure = storageFailure(normalized, 'Food log recovery backup could not be written; existing data was kept.', backup.error);
                    writeLogs.lastError = failure.error;
                    return failure;
                }
            }
        }

        const serialized = JSON.stringify(normalized);
        try {
            target.setItem(STORAGE_KEY, serialized);
            if (target.getItem(STORAGE_KEY) !== serialized) {
                throw new Error('Food log storage did not persist the complete update.');
            }
        } catch (error) {
            preserveOriginal(target, existing, 'write-failure');
            restoreOriginal(target, existing);
            const failure = storageFailure(normalized, 'Food log could not be saved. Your existing log was kept.', error);
            writeLogs.lastError = failure.error;
            return failure;
        }

        return { ok: true, logs: normalized, error: null };
    }

    readLogs.lastError = null;
    writeLogs.lastError = null;

    global.FuelFireFoodStore = {
        readLogs,
        writeLogs,
        normalizeLogs,
        getLocalDateKey: localDateKey,
        storageKey: STORAGE_KEY,
        recoveryBackupKey: RECOVERY_BACKUP_KEY,
    };
})(typeof window !== 'undefined' ? window : globalThis);
