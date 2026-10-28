import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    await page.route('**/api/**', route => route.fulfill({
        status: 503, contentType: 'application/json', body: JSON.stringify({ success: false }),
    }));
    await page.addInitScript(() => {
        localStorage.setItem('fuelfire_onboarding_v1', 'completed');
        if (sessionStorage.getItem('saved-tracker-fixture')) return;
        sessionStorage.setItem('saved-tracker-fixture', '1');
        localStorage.setItem('savedWorkouts', JSON.stringify([{
            id: 'manual-reliability', type: 'manual', workoutName: 'Saved Mixed Session',
            startedAt: new Date(Date.now() - 185000).toISOString(),
            weeklySchedule: {
                Wednesday: { name: 'Mixed day', exercises: [
                    { id: 'row', name: 'Weighted Row', sets: 2, reps: '8', unit: 'kg' },
                    { id: 'push', name: 'Push Ups', sets: 2, reps: '10', unit: 'bodyweight' },
                    { id: 'plank', name: 'Plank', sets: 1, reps: '30 sec', unit: 'seconds' },
                ] },
            },
        }]));
        localStorage.setItem('fitnessProgress', JSON.stringify({
            totalWorkouts: 99, monthlyWorkouts: 99, lastMonthWorkouts: 99, totalTime: 99,
        }));
        localStorage.removeItem('workoutHistory');
        localStorage.removeItem('fuelfire_workout_draft');
    });
});

async function openSavedTracker(page) {
    await page.goto('/#saved-workouts');
    await page.evaluate(() => window.showScreen('saved-workouts'));
    await page.locator('#day-manual-reliability').selectOption('Wednesday');
    await page.locator('button[onclick="startWorkout(\'manual-reliability\')"]').click();
    await expect(page.locator('#workout-tracker-content')).toContainText('Saved Mixed Session');
    await expect(page.locator('#workout-tracker-content')).not.toContainText('Rest Day');
}

test('saved manual tracker preserves mixed sets, original timer and notes through reload', async ({ page }) => {
    await openSavedTracker(page);
    await page.getByRole('spinbutton', { name: 'Weight, Weighted Row, set 2', exact: true }).fill('32.5');
    await page.getByRole('spinbutton', { name: 'Reps, Weighted Row, set 2', exact: true }).fill('8');
    await page.getByRole('combobox', { name: 'Unit, Weighted Row, set 2', exact: true }).selectOption('kg');
    await page.getByRole('checkbox', { name: 'Completed, Weighted Row, set 2', exact: true }).check();
    await page.getByRole('spinbutton', { name: 'Reps, Push Ups, set 1', exact: true }).fill('12');
    await page.getByRole('checkbox', { name: 'Completed, Push Ups, set 1', exact: true }).check();
    await page.getByRole('spinbutton', { name: 'Duration seconds, Plank, set 1', exact: true }).fill('35');
    await page.getByRole('checkbox', { name: 'Completed, Plank, set 1', exact: true }).check();
    await page.getByRole('textbox', { name: 'Notes for Weighted Row', exact: true }).fill('Controlled tempo.');
    const originalDraft = await page.evaluate(() => JSON.parse(localStorage.getItem('fuelfire_workout_draft')));

    await page.reload();
    await openSavedTracker(page);
    await expect(page.getByRole('spinbutton', { name: 'Weight, Weighted Row, set 2', exact: true })).toHaveValue('32.5');
    await expect(page.getByRole('spinbutton', { name: 'Reps, Push Ups, set 1', exact: true })).toHaveValue('12');
    await expect(page.getByRole('spinbutton', { name: 'Duration seconds, Plank, set 1', exact: true })).toHaveValue('35');
    await expect(page.getByRole('textbox', { name: 'Notes for Weighted Row', exact: true })).toHaveValue('Controlled tempo.');
    const restoredDraft = await page.evaluate(() => JSON.parse(localStorage.getItem('fuelfire_workout_draft')));
    expect(restoredDraft.startedAt).toBe(originalDraft.startedAt);
    expect(restoredDraft.sessionId).toBe(originalDraft.sessionId);

    await page.evaluate(async () => {
        window.confirm = () => true;
        window.alert = () => {};
        await Promise.all([window.completeWorkout(), window.completeWorkout()]);
    });
    const history = await page.evaluate(() => window.FuelFireWorkouts.readHistory(localStorage));
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ workoutName: 'Saved Mixed Session', startedAt: originalDraft.startedAt });
    expect(history[0].duration).toBeGreaterThanOrEqual(3);
    expect(history[0].exercises[0].sets).toEqual(expect.arrayContaining([
        expect.objectContaining({ index: 2, weight: 32.5, reps: 8, unit: 'kg', completed: true }),
    ]));
    expect(history[0].exercises[0].notes).toBe('Controlled tempo.');
    expect(history[0].exercises[1].sets[0]).toMatchObject({ reps: 12, unit: 'bodyweight' });
    expect(history[0].exercises[2].sets[0]).toMatchObject({ durationSeconds: 35, unit: 'seconds' });
    expect(await page.evaluate(() => localStorage.getItem('fuelfire_workout_draft'))).toBeNull();
    const progress = await page.evaluate(() => window.loadProgressData());
    expect(progress.totalWorkouts).toBe(1);
    expect(progress.monthlyWorkouts).toBe(1);
    expect(progress.lastMonthWorkouts).toBe(0);
    expect(progress.totalTime).toBe(history[0].duration / 60);
});

test('failed completion retains the draft and does not report a saved workout', async ({ page }) => {
    await openSavedTracker(page);
    await page.getByRole('spinbutton', { name: 'Reps, Push Ups, set 1', exact: true }).fill('10');
    await page.evaluate(async () => {
        window.confirm = () => true;
        window.alert = () => {};
        const originalSet = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
            if (key === 'workoutHistory') throw new DOMException('Full', 'QuotaExceededError');
            return originalSet.call(this, key, value);
        };
        await window.completeWorkout();
        Storage.prototype.setItem = originalSet;
    });
    await expect(page.locator('[data-workout-draft-status]')).toContainText('could not be saved');
    await expect(page.locator('.tracker-complete')).toBeEnabled();
    expect(await page.evaluate(() => localStorage.getItem('fuelfire_workout_draft'))).not.toBeNull();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('workoutHistory') || '[]'))).toHaveLength(0);
});
