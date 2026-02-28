import { test, expect } from '@playwright/test';

test.describe('KüchenTakt Homepage', () => {
    test('opens the landing page and shows brand', async ({ page }) => {
        await page.goto('/');

        await expect(page).toHaveTitle(/KüchenTakt/i);
        await expect(page.getByText('KüchenTakt')).toBeVisible();
    });
});
