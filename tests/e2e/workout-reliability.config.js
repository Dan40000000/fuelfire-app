const { defineConfig } = require('@playwright/test');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '../..');
const port = process.env.WORKOUT_E2E_PORT || '4299';
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`;
const useExternalServer = Boolean(process.env.PLAYWRIGHT_BASE_URL);

module.exports = defineConfig({
    testDir: '.',
    testMatch: 'workout-reliability.spec.js',
    timeout: 30_000,
    fullyParallel: false,
    workers: 1,
    use: {
        baseURL,
        browserName: 'chromium',
        headless: true,
        trace: 'retain-on-failure'
    },
    ...(useExternalServer ? {} : {
        webServer: {
            command: `./node_modules/.bin/serve public -l ${port} --no-clipboard`,
            cwd: projectRoot,
            url: `${baseURL}/workout-quiz.html`,
            reuseExistingServer: false,
            timeout: 30_000
        }
    }),
    projects: [
        {
            name: 'workout-chromium',
            use: { browserName: 'chromium' }
        },
        {
            name: 'workout-webkit',
            use: { browserName: 'webkit' }
        }
    ]
});
