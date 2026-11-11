import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: '.',
    testMatch: 'account-data-20261028.spec.js',
    fullyParallel: false,
    reporter: 'line',
    use: {
        baseURL: 'http://127.0.0.1:4291',
        browserName: 'chromium',
        viewport: { width: 1280, height: 900 },
        locale: 'en-US',
        timezoneId: 'America/Denver',
        trace: 'retain-on-failure',
    },
});
