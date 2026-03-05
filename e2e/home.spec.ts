import { test, expect } from '@playwright/test';

test.describe('KüchenTakt Homepage', () => {
    test('searches for next "Kochen ist nicht immer Schritt für Schritt" on front page', async ({
        page,
    }) => {
        await page.goto('/');

        const nextButton = page.getByRole('button', { name: /nächste/i });
        await expect(nextButton).toBeVisible();

        await nextButton.click();

        await expect(page.locator('h1, h2, h3, h4, h5, h6')).toContainText(
            'Kochen ist nicht immer Schritt für Schritt',
        );
    });

    test('verifies "Neuste Rezepte" section has 10 recipes', async ({ page }) => {
        await page.goto('/');

        const latestRecipesSection = page.getByRole('heading', { name: /neuste rezepte/i });
        await expect(latestRecipesSection).toBeVisible();

        const recipeCards = page.locator('.recipe-card');
        await expect(recipeCards).toHaveCount(10);
    });
});
