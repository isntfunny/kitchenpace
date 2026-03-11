import { defineConfig, devices } from '@playwright/test';

// When E2E_BASE_URL is set we run against an already-deployed instance
// (e.g. the beta site in CI) — no local dev server needed.
const remoteUrl = process.env.E2E_BASE_URL;

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
        baseURL: remoteUrl ?? 'http://localhost:3100',
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
    // Only spin up the local dev server when not pointing at a remote URL
    webServer: remoteUrl
        ? undefined
        : {
              env: {
                  NEXT_PUBLIC_APP_URL: 'http://localhost:3100',
                  DATABASE_URL:
                      'postgresql://kitchenpace:kitchenpace_secret@127.0.0.1:64000/kitchenpace',
                  OPENPANEL_MOCK: '1',
              },
              command: 'PORT=3100 npm run dev',
              port: 3100,
              reuseExistingServer: !process.env.CI,
              timeout: 120_000,
          },
});
