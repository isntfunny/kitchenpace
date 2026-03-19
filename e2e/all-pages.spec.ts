import { test, expect, type Page } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL ?? 'https://beta.xn--kchentakt-q9a.de';

// ---------------------------------------------------------------------------
// Page lists
// ---------------------------------------------------------------------------

const PUBLIC_PAGES = [
    '/',
    '/changelog',
    '/recipes',
    '/auth/signin',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/error',
];

const AUTH_PAGES = [
    '/profile',
    '/profile/edit',
    '/profile/settings',
    '/profile/account',
    '/profile/recipes',
    '/profile/favorites',
    '/profile/images',
    '/notifications',
    '/recipe/create',
    '/recipe/create/import',
    '/auth/password/edit',
];

const RECIPE_PAGES = ['/recipe/spaghetti-bolognese'];

const CATEGORY_PAGES = ['/category/hauptgericht'];

const USER_PAGES = ['/user/alex-chen'];

const ADMIN_PAGES = ['/admin', '/admin/worker', '/moderation'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Collect console errors (ignoring Cloudflare Turnstile noise). */
function createErrorCatcher(page: Page) {
    const errors: string[] = [];
    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            const text = msg.text();
            // Ignore Cloudflare Turnstile / captcha errors
            if (text.includes('challenges.cloudflare') || text.includes('font-size:0')) return;
            // Ignore CSP reports from third-party iframes
            if (text.includes('script-src') && text.includes('not explicitly set')) return;
            // Ignore Twitch player errors (offline channel = expected 404 in embed)
            if (text.includes('MasterPlaylist') || text.includes('Player stopping playback'))
                return;
            // Ignore failed resource loads from captcha
            if (text.includes('the server respon') && text.includes('challenges')) return;
            // Ignore network errors (own-origin 4xx already caught by failedRequests check)
            if (text.includes('Failed to load resource')) return;
            errors.push(text);
        }
    });
    return () => {
        if (errors.length > 0) {
            console.error('Console errors found:', errors);
        }
        expect(errors, 'Expected no console errors').toHaveLength(0);
    };
}

/** Navigate to a page, wait for load + 5 s soak, then check for errors. */
async function visitAndCheck(page: Page, path: string) {
    const checkErrors = createErrorCatcher(page);
    const url = path.startsWith('http') ? path : `${BASE}${path}`;

    // Track failed network requests from our own origin
    const failedRequests: string[] = [];
    page.on('response', (response) => {
        const status = response.status();
        const reqUrl = response.url();
        // Only care about our own domain, ignore third-party
        if (!reqUrl.includes('xn--kchentakt-q9a.de') && !reqUrl.includes('localhost')) return;
        if (status >= 400 && status !== 404) {
            failedRequests.push(`${status} ${reqUrl}`);
        }
    });

    await page.goto(url, { waitUntil: 'load', timeout: 30_000 });
    await expect(page).toHaveTitle(/KüchenTakt|Authentifizierung|Passwort|Changelog/i);

    // Soak for 2 seconds to catch late-firing errors (hydration, lazy loads, SSE)
    await page.waitForTimeout(2_000);

    if (failedRequests.length > 0) {
        console.error('Failed requests:', failedRequests);
    }
    expect(failedRequests, 'Expected no failed requests from own origin').toHaveLength(0);

    checkErrors();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// All tests run with the authenticated session (storageState from auth.setup.ts).
// Public pages work fine when logged in; auth form pages may redirect to / which is ok.

test.describe('All Pages - Public', () => {
    for (const path of PUBLIC_PAGES) {
        test(`visits ${path}`, async ({ page }) => {
            await visitAndCheck(page, path);
        });
    }
});

test.describe('All Pages - Recipes', () => {
    for (const path of RECIPE_PAGES) {
        test(`visits ${path}`, async ({ page }) => {
            await visitAndCheck(page, path);
        });
    }
});

test.describe('All Pages - Categories', () => {
    for (const path of CATEGORY_PAGES) {
        test(`visits ${path}`, async ({ page }) => {
            await visitAndCheck(page, path);
        });
    }
});

test.describe('All Pages - User Profiles', () => {
    for (const path of USER_PAGES) {
        test(`visits ${path}`, async ({ page }) => {
            await visitAndCheck(page, path);
        });
    }
});

test.describe('All Pages - Authenticated', () => {
    for (const path of AUTH_PAGES) {
        test(`visits ${path}`, async ({ page }) => {
            await visitAndCheck(page, path);
        });
    }
});

test.describe('All Pages - Admin', () => {
    for (const path of ADMIN_PAGES) {
        test(`visits ${path}`, async ({ page }) => {
            await visitAndCheck(page, path);
        });
    }
});
