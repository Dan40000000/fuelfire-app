import { expect, test } from '@playwright/test';

test('quick workout starts the exact generated preview', async ({ page }) => {
    await page.goto('/workout-quiz.html');
    await page.check('#chest');
    await page.getByRole('button', { name: '30 min' }).click();
    await page.getByRole('button', { name: /Home Setup|Home$/ }).first().click();
    await page.getByRole('button', { name: 'Routine' }).click();
    await page.getByRole('button', { name: /Generate My Workout/ }).click();

    const previewNames = await page.locator('#workout-exercises .exercise-name').allTextContents();
    expect(previewNames.length).toBeGreaterThan(0);

    await page.getByRole('button', { name: /Start Workout/ }).click();
    await expect(page).toHaveURL(url => /\/in-workout(?:\.html)?$/.test(url.pathname));

    const startedNames = await page.evaluate(() => JSON.parse(localStorage.getItem('currentWorkout')).exercises.map(exercise => exercise.name));
    expect(startedNames).toEqual(previewNames);
});

test('active workout restores mixed sets and completes once after a double submission', async ({ page }) => {
    await page.addInitScript(() => {
        const startedAt = new Date(Date.now() - 125000).toISOString();
        if (sessionStorage.getItem('e2e-mixed-seeded')) return;
        sessionStorage.setItem('e2e-mixed-seeded', 'true');
        localStorage.setItem('currentWorkout', JSON.stringify({
            sessionId: 'e2e-mixed-session',
            workoutName: 'Mixed Reliability Session',
            startedAt,
            summary: 'mixed set regression',
            exercises: [
                { name: 'Weighted Row', sets: 2, reps: '8-10', unit: 'lb' },
                { name: 'Push Ups', sets: 2, reps: '10', unit: 'bodyweight' },
                { name: 'Plank', sets: 2, reps: '30 sec', unit: 'seconds' }
            ]
        }));
        localStorage.removeItem('workoutHistory');
        localStorage.removeItem('fuelfire_workout_draft');
    });

    await page.goto('/in-workout.html');
    await page.fill('#weight-0-0', '72.5');
    await page.fill('#reps-0-0', '8');
    await page.check('#completed-0-0');
    await page.fill('#reps-1-0', '10');
    await page.selectOption('#unit-1-0', 'bodyweight');
    await page.check('#completed-1-0');
    await page.fill('#duration-2-0', '30');
    await page.check('#completed-2-0');
    await page.fill('#notes-0', 'Keep the tempo controlled.');

    const draftBeforeReload = await page.evaluate(() => JSON.parse(localStorage.getItem('fuelfire_workout_draft')));
    expect(draftBeforeReload.startedAt).toBe(JSON.parse(await page.evaluate(() => localStorage.getItem('currentWorkout'))).startedAt);
    expect(draftBeforeReload.exercises[0].sets[0]).toMatchObject({ weight: 72.5, reps: 8, index: 1 });
    expect(draftBeforeReload.exercises[1].sets[0]).toMatchObject({ reps: 10, unit: 'bodyweight', completed: true });
    expect(draftBeforeReload.exercises[2].sets[0]).toMatchObject({ durationSeconds: 30, unit: 'seconds', completed: true });

    await page.reload();
    await expect(page.locator('#weight-0-0')).toHaveValue('72.5');
    await expect(page.locator('#reps-1-0')).toHaveValue('10');
    await expect(page.locator('#duration-2-0')).toHaveValue('30');
    await expect(page.locator('#notes-0')).toHaveValue('Keep the tempo controlled.');

    page.on('dialog', dialog => dialog.accept());
    await page.locator('.finish-workout-btn').dblclick();
    await expect(page).toHaveURL(url =>
        /(?:^|\/)index(?:\.html)?$/.test(url.pathname) || (url.pathname === '/' && (url.hash === '' || url.hash === '#home'))
    );

    const history = await page.evaluate(() => JSON.parse(localStorage.getItem('workoutHistory')));
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
        id: 'e2e-mixed-session',
        workoutName: 'Mixed Reliability Session',
        source: 'fuelfire',
        healthExported: false
    });
    expect(history[0].duration).toBeGreaterThanOrEqual(2);
    expect(history[0].exercises[0].sets[0]).toMatchObject({ index: 1, weight: 72.5, reps: 8, unit: 'lb', completed: true });
    expect(history[0].exercises[1].sets[0]).toMatchObject({ index: 1, weight: null, reps: 10, unit: 'bodyweight', completed: true });
    expect(history[0].exercises[2].sets[0]).toMatchObject({ index: 1, durationSeconds: 30, unit: 'seconds', completed: true });
});
