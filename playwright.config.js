import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    outputDir: './output/playwright/results',
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 2 : undefined,
    reporter: process.env.CI
        ? [['line'], ['html', { outputFolder: 'output/playwright/report', open: 'never' }]]
        : [['list'], ['html', { outputFolder: 'output/playwright/report', open: 'never' }]],
    expect: {
        timeout: 7000,
        toHaveScreenshot: {
            animations: 'disabled',
            maxDiffPixelRatio: 0.01,
        },
    },
    use: {
        baseURL: 'http://127.0.0.1:4287',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        locale: 'en-US',
        timezoneId: 'America/Denver',
    },
    webServer: {
        command: './node_modules/.bin/serve public -l 4287 --no-clipboard',
        url: 'http://127.0.0.1:4287/index.html',
        reuseExistingServer: !process.env.CI,
        timeout: 30000,
    },
    projects: [
        {
            name: 'desktop-chromium',
            use: {
                browserName: 'chromium',
                viewport: { width: 1280, height: 900 },
            },
        },
        {
            name: 'mobile-chromium',
            use: {
                browserName: 'chromium',
                viewport: { width: 390, height: 844 },
                deviceScaleFactor: 3,
                isMobile: true,
                hasTouch: true,
            },
        },
    ],
});
