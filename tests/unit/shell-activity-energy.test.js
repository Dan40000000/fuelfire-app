import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const FuelFireEnergy = require('../../public/activity-energy.js');

const NOW = new Date('2026-10-28T12:00:00');
const TODAY = '2026-10-28T09:00:00';
const YESTERDAY = '2026-10-27T12:00:00';

describe('FuelFireEnergy health/local reconciliation', () => {
    it('counts a matching fresh Health/local session once', () => {
        const summary = FuelFireEnergy.getActivitySummary({
            now: NOW,
            healthData: {
                dataDate: TODAY,
                activeEnergy: 400,
                workouts: [{
                    originID: 'health-session-400',
                    source: 'Apple Health',
                    startDate: TODAY
                }]
            },
            workouts: [{
                id: 'local-session-400',
                originID: 'health-session-400',
                date: TODAY,
                calories: 400,
                source: 'fuelfire'
            }]
        });

        expect(summary.activeCalories).toBe(400);
        expect(summary.localWorkoutCalories).toBe(400);
        expect(summary.reconciledWorkoutCalories).toBe(0);
        expect(summary.reconciliation.deduplicatedWorkoutIds).toEqual(['health-session-400']);
    });

    it('adds independent Health and local activity', () => {
        const summary = FuelFireEnergy.getActivitySummary({
            now: NOW,
            healthData: {
                dataDate: TODAY,
                activeEnergy: 400,
                workouts: [{
                    originID: 'health-session-400',
                    source: 'Apple Health',
                    startDate: TODAY
                }]
            },
            workouts: [{
                id: 'local-session-400',
                originID: 'different-session-400',
                date: TODAY,
                calories: 400,
                source: 'fuelfire'
            }]
        });

        expect(summary.activeCalories).toBe(800);
        expect(summary.reconciledWorkoutCalories).toBe(400);
    });

    it('does not let stale matching Health suppress a current local workout', () => {
        const summary = FuelFireEnergy.getActivitySummary({
            now: NOW,
            healthData: {
                dataDate: YESTERDAY,
                activeEnergy: 0,
                workouts: [{
                    originID: 'health-session-stale',
                    source: 'Apple Health',
                    startDate: YESTERDAY
                }]
            },
            workouts: [{
                id: 'local-session-today',
                originID: 'health-session-stale',
                date: TODAY,
                calories: 400,
                source: 'fuelfire'
            }]
        });

        expect(summary.healthStatus).toBe('stale');
        expect(summary.healthActiveCalories).toBe(0);
        expect(summary.localWorkoutCalories).toBe(400);
        expect(summary.reconciledWorkoutCalories).toBe(400);
        expect(summary.activeCalories).toBe(400);
        expect(summary.hasActivity).toBe(true);
    });

    it('keeps a newly exported local workout pending until Health provides evidence', () => {
        const localWorkout = {
            id: 'local-session-pending',
            healthWorkoutId: 'health-session-pending',
            healthExported: true,
            healthExportedAt: '2026-10-28T11:55:00',
            date: TODAY,
            calories: 400,
            source: 'fuelfire'
        };
        const syncingHealth = {
            dataDate: TODAY,
            syncTime: '2026-10-28T12:00:00',
            activeEnergy: 0,
            workouts: []
        };

        const pending = FuelFireEnergy.getActivitySummary({
            now: NOW,
            healthData: syncingHealth,
            workouts: [localWorkout]
        });

        expect(pending.reconciledWorkoutCalories).toBe(400);
        expect(pending.activeCalories).toBe(400);

        const caughtUp = FuelFireEnergy.getActivitySummary({
            now: NOW,
            healthData: {
                ...syncingHealth,
                activeEnergy: 400,
                workouts: [{
                    originID: 'health-session-pending',
                    source: 'Apple Health',
                    startDate: TODAY
                }]
            },
            workouts: [localWorkout]
        });

        expect(caughtUp.reconciledWorkoutCalories).toBe(0);
        expect(caughtUp.activeCalories).toBe(400);
    });

    it('does not treat a stale Health numeric value as fresh known activity', () => {
        const summary = FuelFireEnergy.getActivitySummary({
            now: NOW,
            healthData: {
                dataDate: YESTERDAY,
                activeEnergy: 0
            },
            workouts: [],
            manualEntries: []
        });

        expect(summary.healthStatus).toBe('stale');
        expect(summary.healthActiveCalories).toBe(0);
        expect(summary.activeCalories).toBe(0);
        expect(summary.hasActivity).toBe(false);
    });

    it('does not treat unavailable Health energy as a verified zero', () => {
        const summary = FuelFireEnergy.getActivitySummary({
            now: NOW,
            healthData: null,
            workouts: [],
            manualEntries: []
        });

        expect(summary.healthStatus).toBe('missing');
        expect(summary.healthActiveCalories).toBe(0);
        expect(summary.bmr).toBeNull();
        expect(summary.hasActivity).toBe(false);
    });

    it('does not treat current metadata without an energy value as zero activity', () => {
        const summary = FuelFireEnergy.getActivitySummary({
            now: NOW,
            healthData: { dataDate: TODAY },
            workouts: [],
            manualEntries: []
        });

        expect(summary.healthStatus).toBe('current');
        expect(summary.healthActiveCalories).toBe(0);
        expect(summary.hasActivity).toBe(false);
    });

    it('treats a fresh explicit zero as known activity data', () => {
        const summary = FuelFireEnergy.getActivitySummary({
            now: NOW,
            healthData: {
                dataDate: TODAY,
                activeEnergy: 0
            },
            workouts: [],
            manualEntries: []
        });

        expect(summary.healthStatus).toBe('current');
        expect(summary.activeCalories).toBe(0);
        expect(summary.hasActivity).toBe(true);
    });

    it('preserves a canonical zero weight without treating it as a usable BMR weight', () => {
        const storage = {
            getItem(key) {
                if (key === 'fuelfire_user_profile') return JSON.stringify({ weightLbs: 0, heightInches: 70, ageYears: 30 });
                return null;
            }
        };

        const profile = FuelFireEnergy.resolveProfile(storage, {
            dataDate: YESTERDAY,
            weight: 180
        });

        expect(profile.weightLbs).toBe(0);
        expect(profile.weight).toBe(0);
        expect(profile.hasWeight).toBe(false);
    });
});
