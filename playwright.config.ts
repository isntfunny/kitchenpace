import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    timeout: 60_000,
    expect: {
        timeout: 10_000,
    },
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    use: {
        baseURL: 'http://localhost:3100',
        viewport: { width: 1280, height: 720 },
        actionTimeout: 30_000,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
            },
        },
    ],
    webServer: {
        env: {
            NEXT_PUBLIC_APP_URL: 'http://localhost:3100'
        },
        command: 'npm run dev',
        port: 3100,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});
