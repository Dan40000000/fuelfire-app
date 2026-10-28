import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: '.',
    testMatch: 'food-legacy-bridges.e2e.js',
    fullyParallel: false,
    reporter: 'line',
    outputDir: '/tmp/fuelfire-food-legacy-playwright-results',
    use: {
        baseURL: 'http://127.0.0.1:4357',
        browserName: 'chromium',
        locale: 'en-US',
        timezoneId: 'America/Denver',
        trace: 'retain-on-failure',
    },
    webServer: {
        command: '../../node_modules/.bin/serve ../../public -l 4357 --no-clipboard',
        url: 'http://127.0.0.1:4357/index.html',
        reuseExistingServer: !process.env.CI,
        timeout: 30000,
    },
});
