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
if (!url?.includes('127.0.0.1:55492/kuc90')) throw new Error('Disposable API database required');
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
let occurrence = '';
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
const removals: { user: string; list: string; name: string }[] = [];
const gateway = {
    async removeItem(user: string, list: string, name: string) {
        if (upstreamError) throw upstreamError;
        if (list !== 'mine') throw new BringError('FORBIDDEN', 'private upstream detail');
        removals.push({ user, list, name });
        return { purchase: [], recently: [] };
    },
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
const send = (input: unknown, list = 'mine') =>
    call(`/bring/lists/${list}/recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    occurrence = (await db.recipeIngredient.findFirstOrThrow({ where: { recipeId: recipe } })).id;
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
        },
        body: JSON.stringify({ recipeId: recipe }),
    });
    assert.equal(denied.status, 403);
    const response = await send({ recipeId: recipe, servings: 4, ingredientIds: [ingredient] });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).items, [
        { id: occurrence, name: 'Mehl', status: 'added' },
    ]);
    assert.match(transfers.at(-1)!.token, /^api-recipe:[0-9a-f-]{36}$/);
    assert.deepEqual(transfers.at(-1), {
        user: owner,
        token: transfers.at(-1)!.token,
        list: 'mine',
        items: [{ id: occurrence, name: 'Mehl', specification: `1 g-${owner} gesiebt` }],
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
    assert.equal((await send({ recipeId: recipe }, 'foreign')).status, 404);
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
    const response = await send({ recipeId: recipe });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).items, [
        { id: occurrence, name: 'Mehl', status: 'failed' },
    ]);
    assert.equal(transfers.at(-1)?.items[0].specification, `1/2 g-${owner} gesiebt`);
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
    assert.equal((await send({ recipeId: recipe })).status, 200);
    await db.recipe.update({ where: { id: recipe }, data: { moderationStatus: 'PENDING' } });
    assert.equal((await send({ recipeId: recipe })).status, 404);
});

test('Bring item deletion requires write scope, validates input and preserves canonical names', async () => {
    const path = '/bring/lists/mine/items?name=' + encodeURIComponent('Salz & Pfeffer / mild');
    assert.equal((await app.request('/api/v1' + path, { method: 'DELETE' })).status, 401);
    assert.equal(
        (await call(path, { method: 'DELETE', headers: { 'x-api-key': readKey } })).status,
        403,
    );
    for (const query of ['', '?name=', '?name=%20', '?name=' + 'x'.repeat(201)]) {
        assert.equal(
            (await call('/bring/lists/mine/items' + query, { method: 'DELETE' })).status,
            400,
        );
    }
    const response = await call(path, { method: 'DELETE' });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { purchase: [], recently: [] });
    assert.deepEqual(removals.at(-1), { user: owner, list: 'mine', name: 'Salz & Pfeffer / mild' });
    assert.equal(
        (await call('/bring/lists/foreign/items?name=Tomate', { method: 'DELETE' })).status,
        404,
    );
    upstreamError = new BringError('CONFLICT', 'private upstream detail');
    const conflict = await call(path, { method: 'DELETE' });
    assert.equal(conflict.status, 409);
    assert.equal((await conflict.json()).error.code, 'BRING_CONFLICT');
    upstreamError = undefined;
    const spec = await (await app.request('/api/v1/openapi.json')).json();
    const operation = spec.paths['/api/v1/bring/lists/{id}/items'].delete;
    assert.deepEqual(operation.security, [{ ApiKey: [] }]);
    assert.ok(
        operation.parameters.some(
            (p: { name: string; in: string; required: boolean }) =>
                p.name === 'name' && p.in === 'query' && p.required,
        ),
    );
});

test('distinct recipe occurrences are exposed and can be transferred independently', async () => {
    await db.recipe.update({ where: { id: recipe }, data: { authorId: owner, status: 'DRAFT' } });
    const first = await db.recipeIngredient.findFirstOrThrow({ where: { recipeId: recipe } });
    const second = await db.recipeIngredient.create({
        data: {
            recipeId: recipe,
            ingredientId: ingredient,
            unitId: unit,
            amount: '',
            notes: 'für die Creme',
            position: 1,
        },
    });
    try {
        const reader = createApiServices(db, gateway);
        const dto = await reader.recipe({ userId: owner } as any, recipe);
        assert.equal(dto.ingredients.length, 2);
        assert.deepEqual(
            dto.ingredients.map((i: any) => i.recipeIngredientId),
            [first.id, second.id],
        );
        assert.ok(dto.ingredients.every((i: any) => i.id === ingredient));
        assert.equal(
            (await send({ recipeId: recipe, servings: 4, ingredientIds: [second.id] })).status,
            200,
        );
        assert.deepEqual(transfers.at(-1)!.items, [
            { id: second.id, name: 'Mehl', specification: `g-${owner} für die Creme` },
        ]);
        assert.equal((await send({ recipeId: recipe, ingredientIds: [ingredient] })).status, 200);
        assert.equal(transfers.at(-1)!.items.length, 2);
        assert.equal(new Set(transfers.at(-1)!.items.map((i) => i.id)).size, 2);
    } finally {
        await db.recipeIngredient.delete({ where: { id: second.id } });
    }
});
