(function attachWorkoutStore(root) {
    'use strict';

    const HISTORY_KEY = 'workoutHistory';
    const DRAFT_KEY = 'fuelfire_workout_draft';
    const LEGACY_KEYS = ['recentWorkouts', 'fuelfire_tracked_workouts'];

    function getStorage(storage) {
        if (storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function') {
            return storage;
        }
        if (root && root.localStorage) return root.localStorage;
        if (typeof globalThis !== 'undefined' && globalThis.localStorage) return globalThis.localStorage;
        return null;
    }

    function readRaw(storage, key) {
        const target = getStorage(storage);
        if (!target) return null;
        try {
            return target.getItem(key);
        } catch (error) {
            return null;
        }
    }

    function writeRaw(storage, key, value) {
        const target = getStorage(storage);
        if (!target) return false;
        try {
            target.setItem(key, value);
            return target.getItem(key) === value;
        } catch (error) {
            return false;
        }
    }

    function removeRaw(storage, key) {
        const target = getStorage(storage);
        if (!target || typeof target.removeItem !== 'function') return false;
        try {
            target.removeItem(key);
            return true;
        } catch (error) {
            return false;
        }
    }

    function parseJson(raw) {
        if (raw === null || raw === undefined || raw === '') return null;
        try {
            return JSON.parse(raw);
        } catch (error) {
            return null;
        }
    }

    function finiteNumber(value) {
        if (value === null || value === undefined || value === '') return null;
        const number = typeof value === 'number' ? value : Number.parseFloat(String(value).replace(/[^0-9+-.]/g, ''));
        return Number.isFinite(number) ? number : null;
    }

    function nonNegativeNumber(value) {
        const number = finiteNumber(value);
        return number === null ? null : Math.max(0, number);
    }

    function asText(value) {
        return value === null || value === undefined ? '' : String(value).trim();
    }

    function isoOrNull(value) {
        if (value === null || value === undefined || value === '') return null;
        const date = value instanceof Date ? value : new Date(value);
        return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }

    function hash(value) {
        let result = 2166136261;
        const text = String(value);
        for (let index = 0; index < text.length; index += 1) {
            result ^= text.charCodeAt(index);
            result = Math.imul(result, 16777619);
        }
        return (result >>> 0).toString(36);
    }

    function normalizeUnit(value, fallback) {
        const unit = asText(value).toLowerCase();
        const aliases = {
            bw: 'bodyweight',
            'body-weight': 'bodyweight',
            bodyweight: 'bodyweight',
            lb: 'lb',
            lbs: 'lb',
            pound: 'lb',
            pounds: 'lb',
            kg: 'kg',
            kilogram: 'kg',
            kilograms: 'kg',
            sec: 'seconds',
            secs: 'seconds',
            second: 'seconds',
            seconds: 'seconds',
            time: 'seconds'
        };
        return aliases[unit] || unit || fallback || 'lb';
    }

    function normalizeSet(set, fallbackIndex, exerciseUnit) {
        const raw = set && typeof set === 'object' ? set : { reps: set };
        const rawIndex = finiteNumber(raw.index ?? raw.setIndex ?? raw.set ?? raw.number);
        const index = rawIndex === null ? fallbackIndex : Math.max(0, Math.trunc(rawIndex));
        const durationSeconds = nonNegativeNumber(raw.durationSeconds ?? raw.seconds ?? (
            /(?:sec|second|time)/i.test(String(raw.unit || '')) ? raw.duration : null
        ));
        const weight = finiteNumber(raw.weight ?? raw.load ?? raw.lbs);
        const reps = nonNegativeNumber(raw.reps ?? raw.repetitions);
        const unit = normalizeUnit(raw.unit ?? raw.loadUnit, durationSeconds !== null ? 'seconds' : (weight === null ? (exerciseUnit || 'bodyweight') : 'lb'));
        const hasValue = weight !== null || reps !== null || durationSeconds !== null;
        return {
            ...raw,
            index,
            weight,
            reps,
            durationSeconds,
            unit,
            completed: raw.completed === undefined ? hasValue : Boolean(raw.completed)
        };
    }

    function normalizeExercise(exercise, exerciseIndex) {
        const raw = exercise && typeof exercise === 'object' ? exercise : { name: exercise };
        const name = asText(raw.name || raw.exerciseName || `Exercise ${exerciseIndex + 1}`) || `Exercise ${exerciseIndex + 1}`;
        const rawUnit = asText(raw.unit || raw.loadUnit);
        const exerciseUnit = rawUnit ? normalizeUnit(rawUnit, null) : null;
        const rawSets = Array.isArray(raw.sets) ? raw.sets : [];
        const fallbackSet = rawSets.length === 0 && (raw.weight !== undefined || raw.reps !== undefined || raw.durationSeconds !== undefined)
            ? [raw]
            : rawSets;
        const sets = fallbackSet.map((set, index) => normalizeSet(set, index + 1, exerciseUnit));
        const explicitId = asText(raw.id || raw.exerciseId);
        return {
            ...raw,
            id: explicitId || `exercise-${hash(`${name}|${exerciseIndex}`)}`,
            name,
            notes: asText(raw.notes),
            unit: exerciseUnit || (sets[0] && sets[0].unit) || 'lb',
            completed: raw.completed === undefined ? sets.some(set => set.completed) : Boolean(raw.completed),
            sets
        };
    }

    function recordDate(record) {
        return isoOrNull(record.endedAt || record.date || record.completedAt || record.startedAt || record.startTime || record.createdAt);
    }

    function exerciseSignature(exercises) {
        return (Array.isArray(exercises) ? exercises : []).map(exercise => {
            const name = asText(exercise && (exercise.name || exercise.exerciseName));
            const sets = Array.isArray(exercise && exercise.sets) ? exercise.sets : [];
            return `${name}:${sets.map(set => {
                if (!set || typeof set !== 'object') return String(set);
                return [set.index, set.weight, set.reps, set.durationSeconds, set.unit, set.completed].join(',');
            }).join(';')}`;
        }).join('|');
    }

    function generatedId(record, source, position) {
        const seed = [
            asText(record.workoutName || record.name || record.type || 'Workout'),
            isoOrNull(record.startedAt || record.startTime),
            isoOrNull(record.endedAt || record.date || record.completedAt),
            finiteNumber(record.duration),
            exerciseSignature(record.exercises),
            source,
            position
        ].join('|');
        return `workout-${hash(seed)}`;
    }

    function normalizeRecord(record, source, position, forCompletion = false) {
        if (!record || typeof record !== 'object' || Array.isArray(record)) return null;
        const raw = record;
        const startedAt = isoOrNull(raw.startedAt || raw.startTime || raw.started);
        const endedAt = isoOrNull(raw.endedAt || raw.completedAt || (forCompletion ? raw.date : null));
        const date = recordDate(raw) || (forCompletion ? new Date().toISOString() : null);
        const duration = nonNegativeNumber(raw.duration ?? raw.durationMinutes) ?? (
            startedAt && endedAt ? Math.max(0, (Date.parse(endedAt) - Date.parse(startedAt)) / 60000) : 0
        );
        const calories = nonNegativeNumber(raw.calories ?? raw.caloriesBurned);
        const exercises = Array.isArray(raw.exercises) ? raw.exercises.map(normalizeExercise) : [];
        const workoutName = asText(raw.workoutName || raw.name || raw.summary || raw.type || 'Workout') || 'Workout';
        const explicitId = asText(raw.id || raw.sessionId || raw.workoutId);
        const id = explicitId || generatedId({ ...raw, workoutName, startedAt, endedAt, date, duration, exercises }, source, position);
        return {
            ...raw,
            id,
            workoutName,
            date,
            startedAt,
            endedAt,
            duration: Math.max(0, duration),
            calories,
            source: 'fuelfire',
            exercises,
            healthExported: Boolean(raw.healthExported),
            healthExportedAt: isoOrNull(raw.healthExportedAt),
            healthWorkoutId: asText(raw.healthWorkoutId) || null
        };
    }

    function extractRecords(value, key) {
        if (Array.isArray(value)) return value;
        if (!value || typeof value !== 'object') return [];
        if (key === 'fitnessProgress' && Array.isArray(value.workoutHistory)) return value.workoutHistory;
        if (Array.isArray(value.records)) return value.records;
        return [value];
    }

    function sameSession(left, right) {
        if (!left || !right) return false;
        if (left.id && right.id && left.id === right.id) return true;

        const leftStart = left.startedAt ? Date.parse(left.startedAt) : NaN;
        const rightStart = right.startedAt ? Date.parse(right.startedAt) : NaN;
        const leftEnd = left.endedAt ? Date.parse(left.endedAt) : NaN;
        const rightEnd = right.endedAt ? Date.parse(right.endedAt) : NaN;
        if (Number.isFinite(leftStart) && Number.isFinite(rightStart) && Math.abs(leftStart - rightStart) <= 1000) {
            if (!Number.isFinite(leftEnd) || !Number.isFinite(rightEnd) || Math.abs(leftEnd - rightEnd) <= 1000) {
                return left.workoutName === right.workoutName;
            }
        }

        const leftDate = left.date ? Date.parse(left.date) : NaN;
        const rightDate = right.date ? Date.parse(right.date) : NaN;
        return Number.isFinite(leftDate) && Number.isFinite(rightDate) && leftDate === rightDate &&
            left.workoutName === right.workoutName && left.duration === right.duration &&
            exerciseSignature(left.exercises) === exerciseSignature(right.exercises);
    }

    function mergeRecords(existing, incoming) {
        const merged = { ...incoming, ...existing };
        const existingExercises = Array.isArray(existing.exercises) ? existing.exercises : [];
        const incomingExercises = Array.isArray(incoming.exercises) ? incoming.exercises : [];
        if (incomingExercises.length > existingExercises.length) merged.exercises = incomingExercises;
        if ((!existing.notes || existing.notes === '') && incoming.notes) merged.notes = incoming.notes;
        if ((!existing.workoutName || existing.workoutName === 'Workout') && incoming.workoutName && incoming.workoutName !== 'Workout') {
            merged.workoutName = incoming.workoutName;
        }
        if (!existing.startedAt && incoming.startedAt) merged.startedAt = incoming.startedAt;
        if (!existing.endedAt && incoming.endedAt) merged.endedAt = incoming.endedAt;
        if (!existing.date && incoming.date) merged.date = incoming.date;
        if ((existing.duration === 0 || existing.duration === null) && incoming.duration > 0) merged.duration = incoming.duration;
        if (existing.calories === null && incoming.calories !== null) merged.calories = incoming.calories;
        merged.healthExported = Boolean(existing.healthExported || incoming.healthExported);
        merged.healthExportedAt = existing.healthExportedAt || incoming.healthExportedAt || null;
        merged.healthWorkoutId = existing.healthWorkoutId || incoming.healthWorkoutId || null;
        return merged;
    }

    function writeHistory(history, storage) {
        const serialized = JSON.stringify(history);
        return writeRaw(storage, HISTORY_KEY, serialized);
    }

    function readHistory(storage) {
        const canonicalRaw = readRaw(storage, HISTORY_KEY);
        const canonicalValue = parseJson(canonicalRaw);
        const allRecords = [];
        const sources = [{ key: HISTORY_KEY, value: canonicalValue }];

        LEGACY_KEYS.forEach(key => sources.push({ key, value: parseJson(readRaw(storage, key)) }));
        sources.push({ key: 'fitnessProgress', value: parseJson(readRaw(storage, 'fitnessProgress')) });

        sources.forEach(({ key, value }) => {
            extractRecords(value, key).forEach((record, position) => {
                const normalized = normalizeRecord(record, key, position);
                if (!normalized) return;
                const duplicateIndex = allRecords.findIndex(existing => sameSession(existing, normalized));
                if (duplicateIndex === -1) {
                    allRecords.push(normalized);
                } else {
                    allRecords[duplicateIndex] = mergeRecords(allRecords[duplicateIndex], normalized);
                }
            });
        });

        allRecords.sort((left, right) => {
            const leftDate = left.date ? Date.parse(left.date) : NaN;
            const rightDate = right.date ? Date.parse(right.date) : NaN;
            if (Number.isFinite(leftDate) && Number.isFinite(rightDate) && leftDate !== rightDate) return rightDate - leftDate;
            if (Number.isFinite(rightDate) && !Number.isFinite(leftDate)) return 1;
            if (!Number.isFinite(rightDate) && Number.isFinite(leftDate)) return -1;
            return 0;
        });

        if (canonicalRaw !== null && canonicalValue === null) {
            // Do not replace an unreadable canonical value until its original
            // bytes are safely backed up. A quota failure must leave the
            // corrupt record available for recovery.
            if (!writeRaw(storage, `${HISTORY_KEY}.legacy`, canonicalRaw)) {
                readHistory.lastError = new Error('Unable to back up corrupt workout history');
                return allRecords;
            }
        }

        const canonicalSerialized = canonicalValue === null ? null : JSON.stringify(canonicalValue);
        const normalizedSerialized = JSON.stringify(allRecords);
        const hasLegacyRecords = LEGACY_KEYS.some(key => extractRecords(parseJson(readRaw(storage, key)), key).length > 0) ||
            extractRecords(parseJson(readRaw(storage, 'fitnessProgress')), 'fitnessProgress').length > 0;
        const needsCanonicalWrite = canonicalRaw === null || canonicalValue === null || hasLegacyRecords || canonicalSerialized !== normalizedSerialized;
        if (needsCanonicalWrite && !writeHistory(allRecords, storage)) {
            readHistory.lastError = new Error('Unable to persist migrated workout history');
            return allRecords;
        }
        readHistory.lastError = null;
        return allRecords;
    }

    function completionId(record) {
        const explicitId = asText(record && (record.id || record.sessionId || record.workoutId));
        if (explicitId) return explicitId;
        return `workout-${hash(JSON.stringify({
            workoutName: asText(record && (record.workoutName || record.name || record.type || 'Workout')),
            startedAt: isoOrNull(record && (record.startedAt || record.startTime)),
            duration: nonNegativeNumber(record && (record.duration ?? record.durationMinutes)),
            exercises: exerciseSignature(record && record.exercises)
        }))}`;
    }

    function completeSession(record, storage) {
        const now = new Date().toISOString();
        const input = { ...(record || {}) };
        input.id = completionId(input);
        input.startedAt = input.startedAt || input.startTime || now;
        input.endedAt = input.endedAt || now;
        input.date = input.date || input.endedAt;
        const normalized = normalizeRecord(input, 'completion', 0, true);
        const history = readHistory(storage);
        if (readHistory.lastError) {
            const error = new Error('Unable to read and migrate workout history safely');
            error.code = 'WORKOUT_HISTORY_MIGRATION_FAILED';
            throw error;
        }
        const existingIndex = history.findIndex(item => sameSession(item, normalized));
        const completed = existingIndex === -1
            ? normalized
            : mergeRecords(history[existingIndex], normalized);

        if (existingIndex === -1) history.unshift(completed);
        else history[existingIndex] = completed;
        if (!writeHistory(history, storage)) {
            const error = new Error('Unable to persist workout history');
            error.code = 'WORKOUT_HISTORY_PERSISTENCE_FAILED';
            throw error;
        }
        const persisted = parseJson(readRaw(storage, HISTORY_KEY));
        if (!Array.isArray(persisted) || !persisted.some(item => item && item.id === completed.id)) {
            const error = new Error('Workout history persistence could not be verified');
            error.code = 'WORKOUT_HISTORY_PERSISTENCE_UNVERIFIED';
            throw error;
        }
        return completed;
    }

    function markHealthExported(id, details = {}, storage) {
        const history = readHistory(storage);
        if (readHistory.lastError) {
            const error = new Error('Unable to read and migrate workout history safely');
            error.code = 'WORKOUT_HISTORY_MIGRATION_FAILED';
            throw error;
        }
        const targetId = asText(id);
        const index = history.findIndex(item => item.id === targetId);
        if (index === -1) return null;
        history[index] = {
            ...history[index],
            healthExported: true,
            healthExportedAt: isoOrNull(details.healthExportedAt || new Date().toISOString()),
            healthWorkoutId: asText(details.healthWorkoutId) || history[index].healthWorkoutId || null
        };
        if (!writeHistory(history, storage)) {
            const error = new Error('Unable to persist Health export status');
            error.code = 'WORKOUT_HEALTH_STATUS_PERSISTENCE_FAILED';
            throw error;
        }
        const persisted = parseJson(readRaw(storage, HISTORY_KEY));
        if (!Array.isArray(persisted) || !persisted.some(item => item && item.id === targetId && item.healthExported === true)) {
            const error = new Error('Health export status persistence could not be verified');
            error.code = 'WORKOUT_HEALTH_STATUS_PERSISTENCE_UNVERIFIED';
            throw error;
        }
        return history[index];
    }

    function readDraft(storage) {
        const parsed = parseJson(readRaw(storage, DRAFT_KEY));
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    }

    function saveDraft(draft, storage) {
        if (!draft || typeof draft !== 'object') return null;
        const saved = { ...draft, version: 1, updatedAt: new Date().toISOString() };
        if (!writeRaw(storage, DRAFT_KEY, JSON.stringify(saved))) {
            const error = new Error('Unable to persist workout draft');
            error.code = 'WORKOUT_DRAFT_PERSISTENCE_FAILED';
            throw error;
        }
        return saved;
    }

    function clearDraft(storage) {
        removeRaw(storage, DRAFT_KEY);
    }

    const api = {
        HISTORY_KEY,
        DRAFT_KEY,
        readHistory,
        normalizeRecord,
        completeSession,
        markHealthExported,
        readDraft,
        saveDraft,
        clearDraft,
        removeDraft: clearDraft
    };

    if (root) root.FuelFireWorkouts = api;
    if (root && root.window && root.window !== root) root.window.FuelFireWorkouts = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
