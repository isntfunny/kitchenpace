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
import { BringError } from '../../src/lib/bring/client';
import type { TransferItem } from '../../src/lib/bring/types';

const url = process.env.API_TEST_DATABASE_URL;
if (!url?.includes('127.0.0.1:55490/kuc90')) throw new Error('Disposable API database required');
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const auth = betterAuth({
    secret: 'kuc90-bring-test-secret-at-least-32-characters',
    baseURL: 'http://localhost:3100',
    database: prismaAdapter(db, { provider: 'postgresql' }),
    plugins: [personalApiKeyPlugin()],
    logger: { disabled: true },
});
let owner = '',
    stranger = '',
    recipe = '',
    foreign = '',
    ingredient = '',
    unit = '';
let key = '',
    readKey = '';
let upstreamError: BringError | undefined;
let transferStatus: 'added' | 'existing' | 'failed' = 'added';
const transfers: {
    user: string;
    token: string;
    list: string;
    items: TransferItem[];
    context: unknown;
}[] = [];
const gateway = {
    async availableLists(user: string) {
        assert.equal(user, owner);
        if (upstreamError) throw upstreamError;
        return {
            lists: [{ listUuid: 'mine', name: 'Zuhause', password: 'never-expose' }],
            defaultListUuid: 'mine',
        };
    },
    async readList(user: string, list: string) {
        assert.equal(user, owner);
        if (list !== 'mine') throw new BringError('FORBIDDEN', 'upstream secret');
        return {
            purchase: [{ name: 'Peperoni', displayName: 'Paprika', specification: '2 Stück' }],
            recently: [],
        };
    },
    async transfer(
        user: string,
        token: string,
        list: string,
        items: TransferItem[],
        context?: unknown,
    ) {
        if (list !== 'mine') throw new BringError('FORBIDDEN', 'upstream secret');
        transfers.push({ user, token, list, items, context });
        return items.map((item) => ({ id: item.id, name: item.name, status: transferStatus }));
    },
};
const app = createApiApp({
    services: createApiServices(db, gateway),
    authenticate: createApiAuthenticator(auth.api.verifyApiKey, db),
});
const call = (path: string, init: RequestInit = {}) =>
    app.request(`/api/v1${path}`, { ...init, headers: { 'x-api-key': key, ...init.headers } });
const send = (input: unknown, token = 'bring-request-1', list = 'mine') =>
    call(`/bring/lists/${list}/recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': token },
        body: JSON.stringify(input),
    });
before(async () => {
    owner = (
        await db.user.create({
            data: { email: `bring-api-${Date.now()}@example.test`, emailVerified: true },
        })
    ).id;
    stranger = (
        await db.user.create({
            data: { email: `bring-other-${Date.now()}@example.test`, emailVerified: true },
        })
    ).id;
    unit = (await db.unit.create({ data: { shortName: `g-${owner}`, longName: `Gramm-${owner}` } }))
        .id;
    ingredient = (
        await db.ingredient.create({ data: { name: 'Mehl', slug: `bring-flour-${owner}` } })
    ).id;
    recipe = (
        await db.recipe.create({
            data: {
                authorId: owner,
                title: 'Private pancakes',
                slug: `bring-${owner}`,
                servings: 2,
                recipeIngredients: {
                    create: {
                        ingredientId: ingredient,
                        unitId: unit,
                        amount: '1/2',
                        notes: 'gesiebt',
                    },
                },
            },
        })
    ).id;
    foreign = (
        await db.recipe.create({
            data: { authorId: stranger, title: 'Secret', slug: `bring-${stranger}` },
        })
    ).id;
    key = (
        await auth.api.createApiKey({
            body: { userId: owner, permissions: { bring: ['read', 'write'] } },
        })
    ).key;
    readKey = (
        await auth.api.createApiKey({ body: { userId: owner, permissions: { bring: ['read'] } } })
    ).key;
});
after(async () => {
    await db.user.deleteMany({ where: { id: { in: [owner, stranger] } } });
    await db.ingredient.delete({ where: { id: ingredient } });
    await db.unit.delete({ where: { id: unit } });
    await db.$disconnect();
});
test('Bring lists and contents expose explicit DTOs under a separate read scope', async () => {
    assert.equal((await app.request('/api/v1/bring/lists')).status, 401);
    const result = await call('/bring/lists');
    assert.equal(result.status, 200);
    assert.deepEqual(await result.json(), {
        lists: [{ listUuid: 'mine', name: 'Zuhause' }],
        defaultListUuid: 'mine',
    });
    const items = await call('/bring/lists/mine', { headers: { 'x-api-key': readKey } });
    assert.equal(items.status, 200);
    assert.equal((await items.json()).purchase[0].displayName, 'Paprika');
    assert.equal((await call('/bring/lists/foreign')).status, 404);
});
test('Bring recipe transfer scales stored ingredients and requires explicit write permission', async () => {
    const denied = await call('/bring/lists/mine/recipes', {
        method: 'POST',
        headers: {
            'x-api-key': readKey,
            'Content-Type': 'application/json',
            'Idempotency-Key': 'deny',
        },
        body: JSON.stringify({ recipeId: recipe }),
    });
    assert.equal(denied.status, 403);
    const response = await send({ recipeId: recipe, servings: 4, ingredientIds: [ingredient] });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).items, [
        { id: ingredient, name: 'Mehl', status: 'added' },
    ]);
    assert.deepEqual(transfers.at(-1), {
        user: owner,
        token: 'api-recipe:bring-request-1',
        list: 'mine',
        items: [{ id: ingredient, name: 'Mehl', specification: `1 g-${owner} gesiebt` }],
        context: { recipeId: recipe, servings: 4, ingredientIds: [ingredient] },
    });
});
test('Bring transfer rejects foreign drafts and invalid selections before any remote write', async () => {
    const count = transfers.length;
    assert.equal((await send({ recipeId: foreign })).status, 404);
    for (const body of [
        { recipeId: recipe, ingredientIds: ['foreign'] },
        { recipeId: recipe, ingredientIds: [] },
        { recipeId: recipe, ingredientIds: [ingredient, ingredient] },
        { recipeId: recipe, servings: 0 },
        { recipeId: recipe, items: [] },
    ]) {
        assert.equal((await send(body)).status, 400);
    }
    assert.equal(transfers.length, count);
    assert.equal((await send({ recipeId: recipe }, 'foreign-list', 'foreign')).status, 404);
});
test('Bring errors do not leak upstream text or disguise missing connection as invalid API key', async () => {
    for (const [code, status, expected] of [
        ['AUTH', 409, 'BRING_CONNECTION_REQUIRED'],
        ['CONFIG', 503, 'BRING_UNAVAILABLE'],
        ['CONFLICT', 409, 'BRING_CONFLICT'],
    ] as const) {
        upstreamError = new BringError(code, 'password: never-expose');
        const response = await call('/bring/lists');
        assert.equal(response.status, status);
        const body = await response.json();
        assert.equal(body.error.code, expected);
        assert.equal(JSON.stringify(body).includes('never-expose'), false);
    }
    upstreamError = undefined;
});

test('Bring defaults to recipe portions and preserves partial outcomes for callers', async () => {
    transferStatus = 'failed';
    const response = await send({ recipeId: recipe }, 'partial');
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).items, [
        { id: ingredient, name: 'Mehl', status: 'failed' },
    ]);
    assert.equal(transfers.at(-1)?.items[0].specification, `0,5 g-${owner} gesiebt`);
    transferStatus = 'added';
});

test('ordinary recipe keys cannot read Bring data and public recipes can be transferred', async () => {
    const ordinary = await auth.api.createApiKey({ body: { userId: owner } });
    assert.equal(
        (await call('/bring/lists', { headers: { 'x-api-key': ordinary.key } })).status,
        403,
    );
    await db.recipe.update({
        where: { id: recipe },
        data: { authorId: stranger, status: 'PUBLISHED', moderationStatus: 'APPROVED' },
    });
    assert.equal((await send({ recipeId: recipe }, 'public-recipe')).status, 200);
    await db.recipe.update({ where: { id: recipe }, data: { moderationStatus: 'PENDING' } });
    assert.equal((await send({ recipeId: recipe }, 'pending-recipe')).status, 404);
});
