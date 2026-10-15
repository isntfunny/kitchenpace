import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

import { createApiApp } from '../../src/lib/api/app';
import { createApiAuthenticator } from '../../src/lib/api/auth';
import { personalApiKeyPlugin } from '../../src/lib/api/key-plugin';
import { createApiServices } from '../../src/lib/api/services';

const url = process.env.API_TEST_DATABASE_URL;
if (!url?.includes('127.0.0.1:55490/kuc90')) throw new Error('Disposable API database required');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const auth = betterAuth({
    secret: 'collections-test-secret-at-least-32-characters',
    baseURL: 'http://localhost:3100',
    database: prismaAdapter(db, { provider: 'postgresql' }),
    plugins: [personalApiKeyPlugin()],
    logger: { disabled: true },
});
let owner = '',
    stranger = '',
    key = '',
    readKey = '',
    recipe = '',
    foreignRecipe = '',
    foreignCollection = '';
let decision: 'AUTO_APPROVED' | 'PENDING' | 'REJECTED' = 'AUTO_APPROVED';
const invalidated: string[] = [];
let duringModeration: (() => Promise<void>) | undefined;
const app = createApiApp({
    services: createApiServices(db, undefined, {
        moderate: async () => {
            await duringModeration?.();
            return { decision, score: 0.2, flags: {}, flagged: false, raw: {} };
        },
        invalidate: async (slug: string) => {
            invalidated.push(slug);
        },
    }),
    authenticate: createApiAuthenticator(auth.api.verifyApiKey, db),
});
const call = (path: string, method = 'GET', data?: unknown, token = key) =>
    app.request('/api/v1' + path, {
        method,
        headers: { 'x-api-key': token, 'content-type': 'application/json' },
        ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
    });
before(async () => {
    owner = (
        await db.user.create({
            data: { email: `collections-${Date.now()}@example.test`, emailVerified: true },
        })
    ).id;
    stranger = (
        await db.user.create({
            data: { email: `collections-other-${Date.now()}@example.test`, emailVerified: true },
        })
    ).id;
    recipe = (
        await db.recipe.create({ data: { authorId: owner, title: 'Own draft', slug: owner } })
    ).id;
    foreignRecipe = (
        await db.recipe.create({
            data: { authorId: stranger, title: 'Foreign draft', slug: stranger },
        })
    ).id;
    foreignCollection = (
        await db.collection.create({
            data: { authorId: stranger, title: 'Secret', slug: stranger },
        })
    ).id;
    key = (
        await auth.api.createApiKey({
            body: { userId: owner, permissions: { collections: ['read', 'write'] } },
        })
    ).key;
    readKey = (
        await auth.api.createApiKey({
            body: { userId: owner, permissions: { collections: ['read'] } },
        })
    ).key;
});
after(async () => {
    await db.moderationQueue.deleteMany({ where: { authorId: { in: [owner, stranger] } } });
    await db.user.deleteMany({ where: { id: { in: [owner, stranger] } } });
    await db.$disconnect();
});
test('collection CRUD keeps ownership, editor blocks, relations and private state consistent', async () => {
    const created = await call('/collections', 'POST', {
        title: 'Test menu',
        description: 'A private collection',
        recipeIds: [recipe],
    });
    assert.equal(created.status, 201);
    const c = await created.json();
    assert.equal(c.published, false);
    assert.deepEqual(c.recipeIds, [recipe]);
    const stored = await db.collection.findUniqueOrThrow({
        where: { id: c.id },
        include: { recipes: true },
    });
    assert.equal(stored.recipes[0].recipeId, recipe);
    assert.ok(JSON.stringify(stored.blocks).includes(recipe));
    assert.equal((await call('/collections/' + c.id)).status, 200);
    assert.equal(
        (await (await call('/collections/' + c.id + '/recipes')).json()).items[0].id,
        recipe,
    );
    await db.collection.update({ where: { id: c.id }, data: { published: true } });
    const edited = await call('/collections/' + c.id, 'PATCH', { title: 'Edited' });
    assert.equal(edited.status, 200);
    const changed = await edited.json();
    assert.equal(changed.title, 'Edited');
    assert.equal(changed.published, false);
    assert.deepEqual(changed.recipeIds, [recipe]);
    assert.deepEqual(
        (await db.collection.findUniqueOrThrow({ where: { id: c.id } })).blocks,
        stored.blocks,
    );
    assert.equal((await call('/collections/' + c.id, 'PATCH', { recipeIds: [] })).status, 200);
    assert.equal(await db.collectionRecipe.count({ where: { collectionId: c.id } }), 0);
    assert.equal((await call('/collections/' + c.id, 'DELETE')).status, 204);
    assert.equal((await call('/collections/' + c.id)).status, 404);
    assert.ok(invalidated.includes(c.slug));
});
test('collection mutation scopes, ownership and recipe visibility cannot be bypassed', async () => {
    assert.equal(
        (await call('/collections', 'POST', { title: 'No permission' }, readKey)).status,
        403,
    );
    for (const method of ['PATCH', 'DELETE']) {
        assert.equal(
            (
                await call(
                    '/collections/' + foreignCollection,
                    method,
                    method === 'PATCH' ? { title: 'Denied' } : undefined,
                    readKey,
                )
            ).status,
            403,
        );
    }
    for (const method of ['GET', 'PATCH', 'DELETE']) {
        assert.equal(
            (
                await call(
                    '/collections/' + foreignCollection,
                    method,
                    method === 'PATCH' ? { title: 'Forged' } : undefined,
                )
            ).status,
            404,
        );
    }
    for (const body of [
        { title: '' },
        { title: 'x', authorId: stranger },
        { title: 'x', published: true },
        { title: 'x', recipeIds: [foreignRecipe] },
        { title: 'x', recipeIds: [recipe, recipe] },
    ]) {
        assert.equal((await call('/collections', 'POST', body)).status, 400);
    }
    assert.equal((await call('/collections/' + foreignCollection, 'PATCH', {})).status, 400);
});
test('collection moderation rejects unsafe changes and queues pending private content', async () => {
    decision = 'REJECTED';
    assert.equal((await call('/collections', 'POST', { title: 'Rejected' })).status, 400);
    assert.equal(await db.collection.count({ where: { authorId: owner, title: 'Rejected' } }), 0);
    decision = 'PENDING';
    const c = await (await call('/collections', 'POST', { title: 'Review me' })).json();
    assert.equal(c.published, false);
    assert.equal(
        (await db.collection.findUniqueOrThrow({ where: { id: c.id } })).moderationStatus,
        'PENDING',
    );
    assert.equal(
        await db.moderationQueue.count({ where: { contentId: c.id, status: 'PENDING' } }),
        1,
    );
});

test('collection updates reject concurrent edits without overwriting them', async () => {
    decision = 'AUTO_APPROVED';
    const c = await (await call('/collections', 'POST', { title: 'Before' })).json();
    duringModeration = async () => {
        await db.collection.update({
            where: { id: c.id },
            data: { title: 'Concurrent website edit', updatedAt: new Date(Date.now() + 1000) },
        });
    };
    try {
        const response = await call('/collections/' + c.id, 'PATCH', { title: 'Stale API edit' });
        assert.equal(response.status, 409);
        assert.equal((await response.json()).error.code, 'COLLECTION_CHANGED');
        assert.equal(
            (await db.collection.findUniqueOrThrow({ where: { id: c.id } })).title,
            'Concurrent website edit',
        );
    } finally {
        duringModeration = undefined;
    }
});
