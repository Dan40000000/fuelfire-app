import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['tests/unit/**/*.test.js', 'tests/contracts/**/*.test.js'],
        testTimeout: 10000,
        hookTimeout: 10000,
        restoreMocks: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json-summary', 'html'],
            reportsDirectory: 'output/coverage',
            include: [
                // Keep this as an explicit, reviewable core-module scope. This
                // is not a whole-application coverage claim.
                'api/_lib/http.js',
                'api/_lib/security.js',
                'api/ai-food-vision.js',
                'public/workout-store.js',
                'public/food-store.js',
                'public/activity-energy.js',
                'public/account-data.js',
                'public/workout-calorie-estimator.mjs',
            ],
        },
    },
});
