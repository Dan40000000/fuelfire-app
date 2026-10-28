import fs from 'node:fs/promises';

import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const accountUrl = '/account.html';

async function clearLocalData(page) {
    await page.goto(accountUrl);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
}

async function seedLocalData(page) {
    await page.evaluate(() => {
        localStorage.setItem('fuelfire_user_profile', JSON.stringify({ name: 'Browser user', age: 34, weight: 180 }));
        localStorage.setItem('workoutHistory', JSON.stringify([{ workoutName: 'Saved session', duration: 0 }]));
        localStorage.setItem('fuelfire_logged_meals', JSON.stringify({ '2026-10-28': [{ name: 'Oats', calories: 300 }] }));
        localStorage.setItem('fuelfire_workout_draft', JSON.stringify({ version: 1, workoutName: 'Draft', exercises: [] }));
        localStorage.setItem('healthData', JSON.stringify({ steps: 10, activeEnergy: 20 }));
        localStorage.setItem('rc_app_user_id', 'keep-rc-identity');
        localStorage.setItem('unrelated_origin_key', 'keep-unrelated');
    });
}

test.describe('FuelFire account data audit regressions', () => {
    test.beforeEach(async ({ page, baseURL }) => {
        const testOrigin = new URL(baseURL).origin;
        await page.route('**/*', async (route) => {
            const url = new URL(route.request().url());
            if (url.origin === testOrigin) await route.continue();
            else await route.abort('blockedbyclient');
        });
    });

    test('fresh account has honest empty state, semantic controls, legal links, and no fabricated records', async ({ page }) => {
        await clearLocalData(page);

        await expect(page.getByRole('heading', { name: 'Your local profile' })).toBeVisible();
        await expect(page.locator('#workout-count')).toHaveText('0');
        await expect(page.locator('#meal-count')).toHaveText('0');
        await expect(page.getByText('No local activity yet.')).toBeVisible();
        await expect(page.getByText('John Athlete')).toHaveCount(0);
        await expect(page.getByText('Purchase history')).toHaveCount(0);
        await expect(page.getByRole('switch', { name: 'Reduce motion' })).toHaveAttribute('role', 'switch');
        await expect(page.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', 'privacy-policy.html');
        await expect(page.getByRole('link', { name: 'Feature terms' })).toHaveAttribute('href', 'terms.html');
        await expect(page.locator('#manage-subscriptions-link')).toHaveAccessibleName(/opens in new tab/i);

        const axe = await new AxeBuilder({ page }).analyze();
        expect(axe.violations.filter((violation) => violation.impact === 'critical')).toEqual([]);
        expect(axe.violations.filter((violation) => violation.id === 'color-contrast')).toEqual([]);
    });

    test('exports and restores local data, while cancel and invalid files preserve storage', async ({ page }) => {
        await clearLocalData(page);
        await seedLocalData(page);
        await page.reload();

        await expect(page.locator('#workout-count')).toHaveText('1');
        await expect(page.locator('#meal-count')).toHaveText('1');

        const downloadPromise = page.waitForEvent('download');
        await page.getByRole('button', { name: 'Export local data' }).click();
        const download = await downloadPromise;
        const backupText = await fs.readFile(await download.path(), 'utf8');
        const backup = JSON.parse(backupText);
        expect(backup.app).toBe('fuelfire');
        expect(backup.data.fuelfire_workout_draft).toBeTruthy();
        expect(backup.data.healthData).toBeTruthy();
        expect(backup.data.rc_app_user_id).toBeUndefined();
        expect(backup.data.unrelated_origin_key).toBeUndefined();

        await page.evaluate(() => localStorage.setItem('fuelfire_workout_draft', JSON.stringify({ version: 1, workoutName: 'Before cancel', exercises: [] })));
        const importFile = {
            name: 'fuelfire-backup.json',
            mimeType: 'application/json',
            buffer: Buffer.from(JSON.stringify(backup)),
        };
        await page.evaluate(() => document.getElementById('import-dialog').setAttribute('aria-hidden', 'true'));
        await page.locator('#import-data-file').setInputFiles(importFile);
        await expect(page.getByRole('dialog', { name: 'Restore FuelFire backup?' })).toBeVisible();
        await expect(page.locator('#import-dialog')).not.toHaveAttribute('aria-hidden', 'true');
        await page.getByRole('button', { name: 'Cancel' }).click();
        await expect(page.getByRole('dialog', { name: 'Restore FuelFire backup?' })).toBeHidden();
        await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('fuelfire_workout_draft')).workoutName)).toBe('Before cancel');

        await page.locator('#import-data-file').setInputFiles({
            name: 'malformed.json',
            mimeType: 'application/json',
            buffer: Buffer.from('{not-json'),
        });
        await expect(page.locator('#backup-error')).toContainText('valid JSON');
        await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('fuelfire_workout_draft')).workoutName)).toBe('Before cancel');

        await page.locator('#import-data-file').setInputFiles(importFile);
        await page.getByRole('button', { name: 'Merge imported records' }).click();
        await expect(page.locator('#backup-status')).toContainText('Restored');
        await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('fuelfire_workout_draft')).workoutName)).toBe('Draft');
    });

    test('delete dialog has a cancel path and a labelled double confirmation', async ({ page }) => {
        await clearLocalData(page);
        await seedLocalData(page);

        const deleteButton = page.getByRole('button', { name: 'Delete local app data' });
        await deleteButton.click();
        const dialog = page.getByRole('alertdialog', { name: 'Delete local app data?' });
        await expect(dialog).toBeVisible();
        await dialog.getByText('Show the exact local keys in scope').click();
        await expect(dialog.getByText('fuelfire_workout_draft', { exact: true })).toBeVisible();
        await expect(dialog.getByText('healthData', { exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Cancel' }).click();
        await expect(dialog).toBeHidden();
        await expect.poll(() => page.evaluate(() => localStorage.getItem('fuelfire_workout_draft'))).not.toBeNull();

        await deleteButton.click();
        const deleteDialog = page.getByRole('alertdialog', { name: 'Delete local app data?' });
        await deleteDialog.getByLabel('Type DELETE to continue').fill('DELETE');
        await deleteDialog.getByRole('button', { name: 'Continue' }).click();
        await expect(page.getByRole('alertdialog', { name: 'Final confirmation: delete local app data' })).toBeVisible();
        await page.getByRole('button', { name: 'Delete local data' }).click();
        await expect.poll(() => page.evaluate(() => localStorage.getItem('fuelfire_workout_draft'))).toBeNull();
        await expect.poll(() => page.evaluate(() => localStorage.getItem('healthData'))).toBeNull();
        await expect.poll(() => page.evaluate(() => localStorage.getItem('rc_app_user_id'))).toBe('keep-rc-identity');
        await expect.poll(() => page.evaluate(() => localStorage.getItem('unrelated_origin_key'))).toBe('keep-unrelated');
    });

    test('associates validation errors with profile and delete confirmation controls', async ({ page }) => {
        await clearLocalData(page);

        const ageInput = page.locator('#profileAgeInput');
        await ageInput.fill('121');
        await page.getByRole('button', { name: 'Save profile' }).click();
        await expect(ageInput).toHaveAttribute('aria-invalid', 'true');
        await expect(ageInput).toHaveAttribute('aria-describedby', /profile-form-error/);
        await expect(page.locator('#profile-form-error')).toBeVisible();
        await expect(ageInput).toBeFocused();

        const deleteButton = page.getByRole('button', { name: 'Delete local app data' });
        await deleteButton.click();
        const dialog = page.getByRole('alertdialog', { name: 'Delete local app data?' });
        const confirmationInput = dialog.getByLabel('Type DELETE to continue');
        await confirmationInput.fill('no');
        await dialog.getByRole('button', { name: 'Continue' }).click();
        await expect(confirmationInput).toHaveAttribute('aria-invalid', 'true');
        await expect(confirmationInput).toHaveAttribute('aria-describedby', /delete-confirmation-error/);
        await expect(page.locator('#delete-confirmation-error')).toBeVisible();
        await expect(confirmationInput).toBeFocused();
        await dialog.getByRole('button', { name: 'Cancel' }).click();
    });

    test('settings persist and Escape returns focus after canceling a dialog', async ({ page }) => {
        await clearLocalData(page);

        const motionToggle = page.getByRole('switch', { name: 'Reduce motion' });
        await motionToggle.click();
        await expect(motionToggle).toHaveAttribute('aria-checked', 'true');
        await page.reload();
        await expect(page.getByRole('switch', { name: 'Reduce motion' })).toHaveAttribute('aria-checked', 'true');

        const deleteButton = page.getByRole('button', { name: 'Delete local app data' });
        await deleteButton.click();
        await expect(page.getByRole('alertdialog')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.getByRole('alertdialog')).toBeHidden();
        await expect(deleteButton).toBeFocused();
    });

    test('legal pages are reachable and retain one main heading', async ({ page }) => {
        await clearLocalData(page);
        for (const path of ['/privacy-policy.html', '/terms.html']) {
            await page.goto(path);
            await expect(page.locator('main')).toBeVisible();
            await expect(page.locator('h1')).toHaveCount(1);
            await expect(page.getByRole('link', { name: 'My account' }).first()).toHaveAttribute('href', 'account.html');
        }
    });
});
