import { test as setup, expect } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL ?? 'https://beta.xn--kchentakt-q9a.de';
const E2E_EMAIL = process.env.E2E_EMAIL ?? 'info@isntfunny.de';
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? 'voll1111';

const AUTH_FILE = 'e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
    await page.goto(`${BASE}/auth/signin`, { waitUntil: 'load' });
    await page.fill('input[name="email"]', E2E_EMAIL);
    await page.fill('input[name="password"]', E2E_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(`${BASE}/`, { timeout: 10_000 });

    await page.context().storageState({ path: AUTH_FILE });
});
