import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

import { createApiApp } from '../../src/lib/api/app';
import { createApiAuthenticator } from '../../src/lib/api/auth';
import { API_KEY_DISABLED_PATHS, personalApiKeyPlugin } from '../../src/lib/api/key-plugin';
import { createKeyManager } from '../../src/lib/api/keys';
import { createApiServices } from '../../src/lib/api/services';

const url = process.env.API_TEST_DATABASE_URL;
if (!url || !url.includes('127.0.0.1:55492/kuc90'))
    throw new Error('Use disposable API_TEST_DATABASE_URL on port 55492');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const auth = betterAuth({
    secret: 'kuc90-disposable-test-secret-at-least-32-characters',
    baseURL: 'http://localhost:3100',
    database: prismaAdapter(db, { provider: 'postgresql' }),
    plugins: [personalApiKeyPlugin()],
    disabledPaths: API_KEY_DISABLED_PATHS,
    logger: { disabled: true },
});
let key = '';
let alice = '';
let bob = '';
let draft = '';
let published = '';
const service = createApiServices(db);
const app = createApiApp({
    services: service,
    authenticate: createApiAuthenticator(auth.api.verifyApiKey, db),
});
const call = (path: string, init: RequestInit = {}) =>
    app.request(`/api/v1${path}`, {
        ...init,
        headers: { 'x-api-key': key, ...init.headers },
    });
before(async () => {
    alice = (
        await db.user.create({
            data: {
                name: 'API test A',
                email: `a-${Date.now()}@example.test`,
                emailVerified: true,
            },
        })
    ).id;
    bob = (
        await db.user.create({
            data: {
                name: 'API test B',
                email: `b-${Date.now()}@example.test`,
                emailVerified: true,
            },
        })
    ).id;
    draft = (
        await db.recipe.create({
            data: { title: 'Private', slug: `private-${alice}`, authorId: bob },
        })
    ).id;
    published = (
        await db.recipe.create({
            data: {
                title: 'Public',
                slug: `public-${alice}`,
                authorId: bob,
                status: 'PUBLISHED',
                publishedAt: new Date(),
            },
        })
    ).id;
    key = (
        await auth.api.createApiKey({
            body: {
                userId: alice,
                name: 'test',
                permissions: {
                    recipes: ['read'],
                    cooks: ['read', 'write'],
                    imports: ['create'],
                    favorites: ['read', 'write'],
                    collections: ['read'],
                },
            },
        })
    ).key;
});
after(async () => {
    await db.user.deleteMany({ where: { id: { in: [alice, bob] } } });
    await db.$disconnect();
});

test('public OpenAPI is available without a key; data endpoints reject missing keys', async () => {
    assert.equal((await app.request('/api/v1/openapi.json')).status, 200);
    assert.equal((await app.request('/api/v1/recipes')).status, 401);
});
test('foreign drafts are hidden and public DTOs exclude internals', async () => {
    assert.equal((await call(`/recipes/${draft}`)).status, 404);
    const response = await call(`/recipes/${published}`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.title, 'Public');
    assert.equal('moderationNote' in body, false);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal((await call('/recipes?limit=101')).status, 400);
});
test('scope-restricted, revoked, expired and banned keys are refused', async () => {
    const read = await auth.api.createApiKey({ body: { userId: alice, name: 'readonly' } });
    assert.equal((await call('/cooks', { headers: { 'x-api-key': read.key } })).status, 403);
    await db.apikey.update({ where: { id: read.id }, data: { enabled: false } });
    assert.equal((await call('/recipes', { headers: { 'x-api-key': read.key } })).status, 401);
    await db.apikey.update({
        where: { id: read.id },
        data: { enabled: true, expiresAt: new Date(0) },
    });
    assert.equal((await call('/recipes', { headers: { 'x-api-key': read.key } })).status, 401);
    await db.user.update({ where: { id: alice }, data: { banned: true } });
    assert.equal((await call('/recipes')).status, 403);
    await db.user.update({ where: { id: alice }, data: { banned: false } });
});
test('cook POSTs need only JSON and each request records a cooking event', async () => {
    const init = {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ recipeId: published, servings: 2 }),
    };
    const responses = await Promise.all(Array.from({ length: 5 }, () => call('/cooks', init)));
    assert.deepEqual(
        responses.map((r) => r.status),
        [201, 201, 201, 201, 201],
    );
    assert.equal(await db.userCookHistory.count({ where: { userId: alice } }), 5);
    assert.equal((await db.recipe.findUniqueOrThrow({ where: { id: published } })).cookCount, 5);
});
test('favorite PUT and DELETE are idempotent and reject inaccessible recipes', async () => {
    assert.equal((await call(`/favorites/${draft}`, { method: 'PUT' })).status, 404);
    for (let i = 0; i < 2; i++)
        assert.equal((await call(`/favorites/${published}`, { method: 'PUT' })).status, 200);
    assert.equal(await db.favorite.count({ where: { userId: alice } }), 1);
    for (let i = 0; i < 2; i++)
        assert.equal((await call(`/favorites/${published}`, { method: 'DELETE' })).status, 200);
});

test('import POSTs need only JSON while user-wide concurrency and daily quotas remain atomic', async () => {
    const init = {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: 'Zwei Tomaten schneiden und mit Salz würzen.' }),
    };
    const responses = await Promise.all(Array.from({ length: 4 }, () => call('/imports', init)));
    assert.deepEqual(responses.map((r) => r.status).sort(), [202, 202, 429, 429]);
    const first = await responses.find((r) => r.status === 202)!.json();
    assert.equal(typeof first.id, 'string');
    assert.equal(first.status, 'queued');
    const ownStatus = await call(`/imports/${first.id}`);
    assert.equal(ownStatus.status, 200);
    assert.deepEqual(await ownStatus.json(), first);
    assert.equal(await db.apiImport.count({ where: { userId: alice } }), 2);
    const other = await auth.api.createApiKey({
        body: { userId: bob, permissions: { imports: ['create'] } },
    });
    assert.equal(
        (await call(`/imports/${first.id}`, { headers: { 'x-api-key': other.key } })).status,
        404,
    );
    await db.apiImport.updateMany({
        where: { userId: alice },
        data: { status: 'failed', input: {} },
    });
    for (let i = 0; i < 8; i++) {
        assert.equal((await call('/imports', init)).status, 202);
        await db.apiImport.updateMany({
            where: { userId: alice },
            data: { status: 'failed', input: {} },
        });
    }
    assert.equal((await call('/imports', init)).status, 429);
});

test('key management exposes secrets once, enforces owner and blocks direct plugin HTTP endpoints', async () => {
    const manager = createKeyManager(db, auth.api.createApiKey);
    const created = await manager.create(alice, { name: 'Managed' });
    assert.ok(created.key.startsWith('kt_'));
    const stored = await db.apikey.findUniqueOrThrow({ where: { id: created.id } });
    assert.notEqual(stored.key, created.key);
    assert.ok(stored.expiresAt && stored.expiresAt > new Date());
    assert.deepEqual(JSON.parse(stored.permissions!), { recipes: ['read'] });
    assert.equal(
        (await manager.list(alice)).some((k) => 'key' in k),
        false,
    );
    await manager.rename(bob, created.id, 'Hijacked');
    await manager.revoke(bob, created.id);
    assert.equal(
        (await db.apikey.findUniqueOrThrow({ where: { id: created.id } })).name,
        'Managed',
    );
    assert.equal(
        await auth.api.getSession({ headers: new Headers({ 'x-api-key': created.key }) }),
        null,
    );
    for (const path of ['/api-key/create', '/api-key/update', '/api-key/delete']) {
        const response = await auth.handler(
            new Request(`http://localhost:3100/api/auth${path}`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: '{}',
            }),
        );
        assert.equal(response.status, 404);
    }
    await manager.revoke(alice, created.id);
    assert.equal((await call('/recipes', { headers: { 'x-api-key': created.key } })).status, 401);
});

test('OpenAPI declares protection for every data operation and documented schema matches runtime', async () => {
    const doc = await (await app.request('/api/v1/openapi.json')).json();
    assert.equal(doc.components.securitySchemes.ApiKey.name, 'x-api-key');
    assert.equal(JSON.stringify(doc).toLowerCase().includes('idempotency'), false);
    for (const [path, operations] of Object.entries(doc.paths)) {
        for (const operation of Object.values(operations as Record<string, { security: unknown }>))
            assert.deepEqual(operation.security, [{ ApiKey: [] }], path);
    }
    assert.equal((await call('/recipes?limit=0')).status, 400);
    assert.equal(
        (
            await call('/imports', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    text: 'A complete recipe with enough content.',
                    publish: true,
                }),
            })
        ).status,
        400,
    );
});

test('malformed JSON is a client error, not an internal error', async () => {
    const response = await call('/cooks', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{',
    });
    assert.equal(response.status, 400);
});

test('managed keys support no expiry, keep the default lifetime and can be revoked', async () => {
    const manager = createKeyManager(db, auth.api.createApiKey);
    const permanent = await manager.create(alice, { name: 'Permanent integration', days: null });
    const stored = await db.apikey.findUniqueOrThrow({ where: { id: permanent.id } });
    assert.equal(stored.expiresAt, null);
    assert.equal((await call('/recipes', { headers: { 'x-api-key': permanent.key } })).status, 200);
    const defaultKey = await manager.create(alice, { name: 'Default lifetime' });
    const timed = await db.apikey.findUniqueOrThrow({ where: { id: defaultKey.id } });
    assert.ok(timed.expiresAt);
    assert.ok(Math.abs(timed.expiresAt.getTime() - Date.now() - 90 * 86400000) < 10000);
    await manager.revoke(alice, permanent.id);
    assert.equal((await call('/recipes', { headers: { 'x-api-key': permanent.key } })).status, 401);
});
