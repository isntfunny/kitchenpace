import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

/** Local-only browser smoke: isolated Next on :3109, disposable DB, and moderation-stub.mjs on :3110. */
import { chromium } from '@playwright/test';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from 'better-auth/crypto';

const databaseUrl = process.env.API_TEST_DATABASE_URL;
if (!databaseUrl?.includes('127.0.0.1:55490/kuc90'))
    throw new Error('Disposable API_TEST_DATABASE_URL required');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
const base = 'http://localhost:3109';
const browser = await chromium.launch({ executablePath: process.env.API_TEST_CHROMIUM_PATH });
const context = await browser.newContext({ baseURL: base });
const page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.message));
const stamp = Date.now();
const email = `browser-${stamp}@example.test`;
const password = 'Disposable-test-passphrase-123';
const user = await db.user.create({
    data: {
        name: 'API Browser',
        email,
        emailVerified: true,
        profile: { create: { nickname: `API Browser ${stamp}`, slug: `api-browser-${stamp}` } },
    },
});
await db.account.create({
    data: {
        userId: user.id,
        accountId: user.id,
        providerId: 'credential',
        password: await hashPassword(password),
    },
});
const privateTitle = `Never-public-${stamp}`;
const draft = await db.recipe.create({
    data: {
        authorId: user.id,
        title: privateTitle,
        slug: `browser-private-${stamp}`,
        description: 'Private description',
    },
});
try {
    const spec = await context.request.get('/api/v1/openapi.json');
    assert.equal(spec.status(), 200);
    const hidden = await context.request.get(`/recipe/${draft.slug}`, { timeout: 120000 });
    assert.equal(
        (await hidden.text()).includes(privateTitle),
        false,
        'draft title leaked through metadata',
    );
    // Exercise the actual callable Server Action with forged owner/admin arguments.
    const chunks = '.next/dev/server/chunks/ssr';
    let editAction: string | undefined;
    for (const file of await readdir(chunks)) {
        if (!file.endsWith('.js')) continue;
        const source = await readFile(`${chunks}/${file}`, 'utf8');
        const match = source.match(/"([a-f0-9]{40,})":\{"name":"fetchRecipeForEdit"\}/);
        if (match) {
            editAction = match[1];
            break;
        }
    }
    assert.ok(editAction, 'Compiled editor action is registered');
    const forged = await context.request.post(`/recipe/${draft.slug}`, {
        headers: {
            'Next-Action': editAction,
            'Content-Type': 'text/plain;charset=UTF-8',
            Origin: base,
        },
        data: JSON.stringify([draft.id, user.id, true]),
    });
    assert.ok(
        [200, 403, 404].includes(forged.status()),
        'Forged editor action must be rejected or return no data',
    );
    assert.equal((await forged.text()).includes(privateTitle), false, 'forged admin exposed draft');
    const signin = await context.request.post('/api/auth/sign-in/email', {
        data: { email, password },
        headers: { Origin: base },
    });
    assert.equal(signin.status(), 200, await signin.text());
    await page.goto('/profile/api-keys', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.getByRole('heading', { name: 'API & Integrationen' }).waitFor();
    assert.equal(await page.getByRole('checkbox', { checked: true }).count(), 1);
    await page.getByLabel('Bring!-Listen und Artikel lesen', { exact: true }).check();
    await page.getByLabel('Eigene Sammlungen lesen', { exact: true }).check();
    await page
        .getByLabel('Eigene Sammlungen verwalten (erstellen, bearbeiten, löschen)', { exact: true })
        .check();
    await page.getByLabel('Name', { exact: true }).fill('Smoke integration');
    await page.getByLabel('Gültigkeit').selectOption('never');
    await page.getByRole('button', { name: 'Schlüssel erstellen', exact: true }).click();
    const secret = page
        .locator('code')
        .filter({ hasText: /^kt_.{20,}$/ })
        .first();
    await secret.waitFor({ timeout: 20000 });
    const key = (await secret.innerText()).trim();
    const recipes = await context.request.get('/api/v1/recipes', { headers: { 'x-api-key': key } });
    assert.equal(recipes.status(), 200);
    assert.ok(
        (await recipes.json()).items.some((r: { title: string }) => r.title === privateTitle),
    );
    assert.equal(
        (await context.request.get('/api/v1/cooks', { headers: { 'x-api-key': key } })).status(),
        403,
    );
    const bring = await context.request.get('/api/v1/bring/lists', {
        headers: { 'x-api-key': key },
    });
    assert.equal(bring.status(), 409);
    assert.equal((await bring.json()).error.code, 'BRING_CONNECTION_REQUIRED');
    // Requires a local moderation stub via OPENAI_BASE_URL, never live credentials.
    const collectionResponse = await context.request.post('/api/v1/collections', {
        headers: { 'x-api-key': key },
        data: { title: `Private collection ${stamp}`, recipeIds: [draft.id] },
    });
    assert.equal(collectionResponse.status(), 201, await collectionResponse.text());
    const collection = await collectionResponse.json();
    const updatedCollection = await context.request.patch(`/api/v1/collections/${collection.id}`, {
        headers: { 'x-api-key': key },
        data: { title: `Updated private collection ${stamp}` },
    });
    assert.equal(updatedCollection.status(), 200, await updatedCollection.text());
    assert.equal((await updatedCollection.json()).published, false);
    const anonCollection = await browser.newContext({ baseURL: base });
    try {
        const hiddenCollection = await anonCollection.request.get(`/collection/${collection.slug}`);
        assert.equal(hiddenCollection.status(), 404);
        assert.equal(
            (await hiddenCollection.text()).includes(`Updated private collection ${stamp}`),
            false,
        );
    } finally {
        await anonCollection.close();
    }
    assert.equal(
        (
            await context.request.delete(`/api/v1/collections/${collection.id}`, {
                headers: { 'x-api-key': key },
            })
        ).status(),
        204,
    );
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.ok((await page.innerText('body')).includes('Läuft ab: Nie'));
    assert.equal((await page.innerText('body')).includes(key), false, 'secret redisplayed');
    await page.getByRole('button', { name: 'Widerrufen', exact: true }).click();
    await page.getByRole('button', { name: 'Jetzt widerrufen' }).click();
    await page.getByText('Du hast noch keine API-Schlüssel erstellt.').waitFor();
    assert.equal(
        (await context.request.get('/api/v1/recipes', { headers: { 'x-api-key': key } })).status(),
        401,
    );
    await page.goto('/developers/api', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page
        .locator('.kuechentakt-api-reference .scalar-api-reference')
        .waitFor({ timeout: 60000 });
    assert.equal(
        await page
            .locator('.scalar-api-reference')
            .evaluate((element) => getComputedStyle(element).display),
        'grid',
        'Scalar stylesheet must be loaded',
    );
    await page.locator('.kuechentakt-api-reference').scrollIntoViewIfNeeded();
    await page.screenshot({ path: '/tmp/kuc90-api-docs-light.png', fullPage: false });
    await page.evaluate(() => localStorage.setItem('kitchenpace-theme', 'dark'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('.kuechentakt-api-reference.dark-mode').first().waitFor({ timeout: 60000 });
    await page.locator('.kuechentakt-api-reference .scalar-api-reference').waitFor();
    await page.locator('.kuechentakt-api-reference').scrollIntoViewIfNeeded();
    await page.screenshot({ path: '/tmp/kuc90-api-docs-dark.png', fullPage: false });
    assert.deepEqual(errors, []);
    console.log(
        'PASS: private metadata, account create/reload/revoke, collection HTTP CRUD/privacy, scoped HTTP, Scalar light/dark',
    );
} finally {
    await browser.close();
    await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
}
