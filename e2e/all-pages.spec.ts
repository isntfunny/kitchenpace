import { test, expect, type Page } from '@playwright/test';

const E2E_EMAIL = 'e2e@test.com';
const E2E_PASSWORD = 'TestPassword123!';

const PUBLIC_PAGES = [
    '/',
    '/recipes',
    '/auth/signin',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/error',
    '/auth/signout',
];

const AUTH_PAGES = [
    '/profile',
    '/profile/edit',
    '/profile/manage',
    '/my-recipes',
    '/favorites',
    '/notifications',
    '/recipe/create',
];

const RECIPE_PAGES = ['/recipe/spaghetti-carbonara'];

const RECIPE_FILTER_PAGES = [
    '/recipes?category=hauptgericht',
    '/recipes?difficulty=MEDIUM',
    '/recipes?tags=vegetarisch',
    '/recipes?timeOfDay=abendessen',
    '/recipes?minRating=4',
    '/recipes?query=pasta',
];

const USER_PAGES = ['/user/test-user-id'];

function createErrorCatcher(page: Page) {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        }
    });
    console.log(consoleErrors);
    return () => expect(consoleErrors).toHaveLength(0);
}

async function expectNoErrorsOnPage(page: Page, url: string) {
    const checkErrors = createErrorCatcher(page);
    await page.goto(url);
    await expect(page).toHaveTitle(/KüchenTakt|KitchenPace/i);
    checkErrors();
}

async function login(page: Page) {
    await page.goto('/auth/signin');
    await page.fill('input[name="email"]', E2E_EMAIL);
    await page.fill('input[name="password"]', E2E_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
}

test.describe('All Pages - Public', () => {
    for (const path of PUBLIC_PAGES) {
        test(`visits ${path}`, async ({ page }) => {
            await expectNoErrorsOnPage(page, path);
        });
    }
});

test.describe('All Pages - Recipe Filters', () => {
    for (const path of RECIPE_FILTER_PAGES) {
        test(`visits ${path}`, async ({ page }) => {
            await expectNoErrorsOnPage(page, path);
        });
    }
});

test.describe('All Pages - Recipes', () => {
    for (const path of RECIPE_PAGES) {
        test(`visits ${path}`, async ({ page }) => {
            await expectNoErrorsOnPage(page, path);
        });
    }
});

test.describe('All Pages - User Profiles', () => {
    for (const path of USER_PAGES) {
        test(`visits ${path}`, async ({ page }) => {
            await expectNoErrorsOnPage(page, path);
        });
    }
});

test.describe('All Pages - Authenticated', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    for (const path of AUTH_PAGES) {
        test(`visits ${path}`, async ({ page }) => {
            await expectNoErrorsOnPage(page, path);
        });
    }
});

test.describe('All Pages - Admin', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
    });

    test('visits /admin', async ({ page }) => {
        await expectNoErrorsOnPage(page, '/admin');
    });

    test('visits /admin/worker', async ({ page }) => {
        await expectNoErrorsOnPage(page, '/admin/worker');
    });
});
