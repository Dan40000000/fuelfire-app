(function activityEnergyFactory(root, factory) {
    const api = factory(root);
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.FuelFireEnergy = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function createActivityEnergy(root) {
    'use strict';

    const PROFILE_KEY = 'fuelfire_user_profile';
    const LEGACY_PROFILE_KEY = 'userProfile';
    const HEALTH_DATA_KEY = 'healthData';
    const WORKOUTS_KEY = 'workoutHistory';
    const MANUAL_CALORIES_KEY = 'fuelfire_active_calories';

    function finiteNumber(value) {
        if (value === null || value === undefined || value === '') return null;
        const number = Number(value);
        return Number.isFinite(number) ? number : null;
    }

    function parseDate(value) {
        if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
        if (typeof value === 'number' && Number.isFinite(value)) {
            const date = new Date(value);
            return Number.isNaN(date.getTime()) ? null : date;
        }
        if (typeof value !== 'string' || !value.trim()) return null;
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    function dayKey(value) {
        const date = parseDate(value);
        if (!date) return null;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function todayKey(now) {
        return dayKey(now || new Date());
    }

    function readJson(storage, key, fallback) {
        if (!storage || typeof storage.getItem !== 'function') return fallback;
        try {
            const raw = storage.getItem(key);
            if (raw === null || raw === undefined || raw === '') return fallback;
            return JSON.parse(raw);
        } catch (error) {
            return fallback;
        }
    }

    function getDefaultStorage() {
        try {
            return root && root.localStorage ? root.localStorage : null;
        } catch (error) {
            return null;
        }
    }

    function firstDefinedNumber(values, validator) {
        for (const value of values) {
            const number = finiteNumber(value);
            if (number !== null && (!validator || validator(number))) return number;
        }
        return null;
    }

    function normalizeCollection(value) {
        if (Array.isArray(value)) return value;
        if (value && Array.isArray(value.workouts)) return value.workouts;
        if (value && Array.isArray(value.entries)) return value.entries;
        if (value && Array.isArray(value.items)) return value.items;
        return [];
    }

    function recordDate(record) {
        if (!record || typeof record !== 'object') return null;
        return record.date || record.startedAt || record.startDate || record.timestamp || record.createdAt || record.endedAt || record.endDate;
    }

    function isToday(record, now) {
        const value = recordDate(record);
        if (!value) return false;
        return dayKey(value) === todayKey(now);
    }

    function identifier(record) {
        if (!record || typeof record !== 'object') return null;
        const candidates = [record.originID, record.originId, record.origin_id, record.healthWorkoutId, record.healthWorkoutID, record.workoutId, record.uuid, record.id];
        for (const candidate of candidates) {
            if (candidate !== null && candidate !== undefined && String(candidate).trim()) return String(candidate);
        }
        return null;
    }

    function timeForMatch(record) {
        return parseDate(record && (record.startedAt || record.startDate || record.date || record.timestamp));
    }

    function healthSource(record) {
        const value = [record && record.source, record && record.sourceName, record && record.provider, record && record.bundleIdentifier]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
        return value;
    }

    function isHealthRecord(record) {
        const source = healthSource(record);
        return source.includes('health') || source.includes('apple') || source.includes('healthkit') || source.includes('watch');
    }

    function healthSyncDate(healthData) {
        if (!healthData || typeof healthData !== 'object') return null;
        return healthData.syncTime || healthData.syncedAt || healthData.lastSync || healthData.updatedAt;
    }

    function getHealthFreshness(healthData, now) {
        if (!healthData || typeof healthData !== 'object') {
            return { state: 'missing', isFresh: false, date: null };
        }
        if (healthData.stale === true || healthData.isStale === true) {
            return { state: 'stale', isFresh: false, date: healthData.dataDate || healthData.healthDataDate || null };
        }

        const currentDay = todayKey(now);
        const candidates = [
            healthData.dataDate,
            healthData.healthDataDate,
            healthData.localDate,
            healthData.date,
            healthData.aggregatedTotals && healthData.aggregatedTotals.date,
            healthSyncDate(healthData)
        ];
        for (const candidate of candidates) {
            const candidateDay = dayKey(candidate);
            if (candidateDay) {
                if (candidateDay !== currentDay) {
                    return { state: 'stale', isFresh: false, date: candidateDay };
                }
                return { state: 'current', isFresh: true, date: candidateDay };
            }
        }

        // Standalone callers often provide a same-day fixture without metadata.
        return { state: 'current', isFresh: true, date: currentDay };
    }

    function getHealthActive(healthData) {
        const aggregate = healthData && healthData.aggregatedTotals;
        return firstDefinedNumber([
            healthData && healthData.activeEnergy,
            healthData && healthData.activeCalories,
            healthData && healthData.activeEnergyBurned,
            healthData && healthData.caloriesBurnedActive,
            aggregate && aggregate.activeEnergy,
            aggregate && aggregate.activeCalories
        ], value => value >= 0);
    }

    function getHealthBmr(healthData) {
        const aggregate = healthData && healthData.aggregatedTotals;
        return firstDefinedNumber([
            healthData && healthData.bmr,
            healthData && healthData.restingEnergy,
            healthData && healthData.basalEnergy,
            aggregate && aggregate.bmr,
            aggregate && aggregate.restingEnergy
        ], value => value >= 0);
    }

    function getManualCalories(entries, now) {
        if (!entries) return 0;
        if (!Array.isArray(entries) && typeof entries === 'object') {
            const current = entries[todayKey(now)];
            if (current !== undefined) return getManualCalories(current, now);
            if (Array.isArray(entries.entries)) return getManualCalories(entries.entries, now);
            return 0;
        }
        return normalizeCollection(entries).reduce((total, entry) => {
            if (!entry || typeof entry !== 'object') return total;
            if (!isToday(entry, now)) return total;
            const calories = firstDefinedNumber([entry.calories, entry.activeCalories, entry.value], value => value >= 0);
            return total + (calories === null ? 0 : calories);
        }, 0);
    }

    function getWorkoutCalories(workout) {
        return firstDefinedNumber([workout && workout.calories, workout && workout.activeCalories, workout && workout.caloriesBurned], value => value >= 0);
    }

    function hasMatchingHealthWorkout(localWorkout, healthWorkouts) {
        const localId = identifier(localWorkout);
        const localTime = timeForMatch(localWorkout);
        return healthWorkouts.some(healthWorkout => {
            const healthId = identifier(healthWorkout);
            if (localId && healthId && localId === healthId) return true;

            if (!localWorkout.healthExported || !isHealthRecord(healthWorkout) || !localTime) return false;
            const healthTime = timeForMatch(healthWorkout);
            if (!healthTime) return false;
            return Math.abs(healthTime.getTime() - localTime.getTime()) <= 10 * 60 * 1000;
        });
    }

    function readCanonicalWorkouts(storage) {
        const canonical = root && root.FuelFireWorkouts;
        if (canonical && typeof canonical.readHistory === 'function') {
            try {
                return normalizeCollection(canonical.readHistory(storage || getDefaultStorage()));
            } catch (error) {
                return [];
            }
        }

        // This narrow fallback keeps the worker testable before workout-store.js
        // is loaded. The canonical module wins as soon as it is present.
        return normalizeCollection(readJson(storage || getDefaultStorage(), WORKOUTS_KEY, []));
    }

    function readManualEntries(storage) {
        return readJson(storage || getDefaultStorage(), MANUAL_CALORIES_KEY, []);
    }

    function resolveProfile(storage, healthData) {
        const actualStorage = storage || getDefaultStorage();
        const canonical = readJson(actualStorage, PROFILE_KEY, {}) || {};
        const legacy = readJson(actualStorage, LEGACY_PROFILE_KEY, {}) || {};
        const health = healthData && typeof healthData === 'object' ? healthData : {};

        const weightValue = firstDefinedNumber([
            canonical.weightLbs,
            canonical.weight,
            canonical.currentWeight,
            health.weight,
            legacy.weightLbs,
            legacy.weight,
            legacy.currentWeight
        ], value => value >= 0);
        const weightKg = firstDefinedNumber([canonical.weightKg, legacy.weightKg], value => value >= 0);
        const weightLbs = weightValue !== null ? weightValue : (weightKg === null ? null : weightKg * 2.20462);
        const heightInches = firstDefinedNumber([
            canonical.heightInches,
            canonical.height,
            legacy.heightInches,
            legacy.height
        ], value => value > 0);
        const age = firstDefinedNumber([
            canonical.ageYears,
            canonical.age,
            legacy.ageYears,
            legacy.age
        ], value => value > 0);
        const sex = String(canonical.sex || canonical.gender || legacy.sex || legacy.gender || '').toLowerCase() || null;

        return {
            ...legacy,
            ...canonical,
            weightLbs,
            weight: weightLbs,
            heightInches,
            age,
            sex,
            source: weightValue !== null ? (canonical.weightLbs !== undefined || canonical.weight !== undefined ? 'profile' : 'health') : null,
            hasWeight: weightLbs !== null && weightLbs > 0,
            hasHeight: heightInches !== null && heightInches > 0,
            hasAge: age !== null && age > 0
        };
    }

    function calculateBmr(profile) {
        if (!profile || !profile.hasWeight || !profile.hasHeight || !profile.hasAge) return null;
        const weightKg = profile.weightLbs / 2.20462;
        const heightCm = profile.heightInches * 2.54;
        const base = (10 * weightKg) + (6.25 * heightCm) - (5 * profile.age);
        return Math.round(base + (profile.sex === 'female' ? -161 : 5));
    }

    function getActivitySummary(options) {
        const settings = options || {};
        const now = settings.now || new Date();
        const healthData = settings.healthData || null;
        const freshness = getHealthFreshness(healthData, now);
        const healthActiveValue = getHealthActive(healthData);
        const healthActiveCalories = freshness.isFresh && healthActiveValue !== null ? healthActiveValue : 0;
        const healthWorkouts = normalizeCollection(healthData && healthData.workouts);
        const workouts = normalizeCollection(settings.workouts);
        const manualCalories = getManualCalories(settings.manualEntries, now);
        const profile = resolveProfile(settings.storage, healthData);
        const bmrFromHealth = getHealthBmr(healthData);
        const bmr = bmrFromHealth !== null ? bmrFromHealth : calculateBmr(profile);

        let localWorkoutCalories = 0;
        let reconciledWorkoutCalories = 0;
        const deduplicatedWorkoutIds = [];
        for (const workout of workouts) {
            if (!isToday(workout, now)) continue;
            const calories = getWorkoutCalories(workout);
            if (calories === null) continue;
            localWorkoutCalories += calories;
            // A fresh sync timestamp only says that native stats were read. It
            // does not prove that a just-exported workout has reached Health.
            // Keep the local calories pending until an actual Health workout
            // record provides identifier or justified time/source evidence.
            const matchingHealthRecord = freshness.isFresh
                && hasMatchingHealthWorkout(workout, healthWorkouts);
            if (matchingHealthRecord) {
                const id = identifier(workout);
                if (id) deduplicatedWorkoutIds.push(id);
                continue;
            }
            reconciledWorkoutCalories += calories;
        }

        const activeCalories = healthActiveCalories + reconciledWorkoutCalories + manualCalories;
        const totalCaloriesBurned = bmr === null ? null : bmr + activeCalories;
        const hasActivity = (freshness.isFresh && healthActiveValue !== null)
            || localWorkoutCalories > 0
            || manualCalories > 0;

        return {
            date: todayKey(now),
            bmr,
            restingCalories: bmr,
            activeCalories,
            totalActiveCalories: activeCalories,
            healthActiveCalories,
            localWorkoutCalories,
            reconciledWorkoutCalories,
            manualCalories,
            totalCaloriesBurned,
            caloriesBurned: totalCaloriesBurned,
            healthStatus: freshness.state,
            healthDataStatus: freshness.state,
            healthDataFresh: freshness.isFresh,
            staleHealthData: freshness.state === 'stale',
            hasActivity,
            profile,
            reconciliation: {
                healthWorkoutCount: healthWorkouts.length,
                localWorkoutCount: workouts.filter(workout => isToday(workout, now)).length,
                deduplicatedWorkoutIds,
                healthActiveCalories,
                reconciledWorkoutCalories,
                manualCalories
            }
        };
    }

    function getActiveCalories(options) {
        const settings = options || {};
        const storage = settings.storage || getDefaultStorage();
        const healthData = settings.healthData === undefined ? readJson(storage, HEALTH_DATA_KEY, null) : settings.healthData;
        const workouts = settings.workouts === undefined ? readCanonicalWorkouts(storage) : settings.workouts;
        const manualEntries = settings.manualEntries === undefined ? readManualEntries(storage) : settings.manualEntries;
        return getActivitySummary({ ...settings, storage, healthData, workouts, manualEntries }).activeCalories;
    }

    return {
        getActiveCalories,
        getActivitySummary,
        resolveProfile
    };
});
