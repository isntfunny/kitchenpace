import assert from 'node:assert/strict';
import { test } from 'node:test';

import { build } from 'esbuild';

// Bundle the actual service with only its external DB/catalog boundaries replaced.
// Transaction writes are buffered, while independent writes survive rollback.
const receipts = new Map<string, any>();
let failCommit = false;
let failReceiptUpdate = false;
const key = (where: any) =>
    `${where.userId_operationId.userId}:${where.userId_operationId.operationId}`;
const store = (transactional: boolean, writes: (() => void)[] = []) => ({
    findUnique: async ({ where }: any) => receipts.get(key(where)) ?? null,
    create: async ({ data }: any) => {
        const write = () =>
            receipts.set(`${data.userId}:${data.operationId}`, structuredClone(data));
        if (transactional) writes.push(write);
        else write();
        return data;
    },
    update: async ({ where, data }: any) => {
        if (failReceiptUpdate) throw new Error('DB write failed');
        const write = () => receipts.set(key(where), { ...receipts.get(key(where)), ...data });
        if (transactional) writes.push(write);
        else write();
        return data;
    },
    deleteMany: async () => ({ count: 0 }),
});
let encrypted = '';
const db = {
    bringConnection: {
        findUnique: async ({ where }: any) =>
            where.userId === 'owner' ? { credentials: encrypted, defaultListUuid: 'mine' } : null,
    },
    bringTransfer: store(false),
    $transaction: async (work: (tx: any) => Promise<any>) => {
        const writes: (() => void)[] = [];
        const result = await work({
            bringConnection: db.bringConnection,
            bringTransfer: store(true, writes),
            $queryRaw: async () => [{ acquired: true }],
        });
        if (failCommit) throw new Error('Commit failed');
        writes.forEach((write) => write());
        return result;
    },
};
(globalThis as any).__bringTestDb = db;
const output = await build({
    entryPoints: ['src/lib/bring/service.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false,
    plugins: [
        {
            name: 'boundaries',
            setup(build) {
                build.onResolve({ filter: /^server-only$/ }, () => ({
                    path: 'empty',
                    namespace: 'test',
                }));
                build.onResolve({ filter: /^@shared\/prisma$/ }, () => ({
                    path: 'db',
                    namespace: 'test',
                }));
                build.onResolve({ filter: /^\.\/catalog$/ }, () => ({
                    path: 'catalog',
                    namespace: 'test',
                }));
                build.onLoad({ filter: /.*/, namespace: 'test' }, ({ path }) => ({
                    contents:
                        path === 'db'
                            ? 'export const prisma = globalThis.__bringTestDb;'
                            : path === 'catalog'
                              ? 'export async function loadCatalog() { return [{itemId:"Peperoni",name:"Paprika"}]; }'
                              : '',
                    loader: 'js',
                }));
            },
        },
    ],
});
const service = await import(
    `data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString('base64')}`
);
const { encryptCredentials } = await import('../../src/lib/bring/crypto');
process.env.BRING_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString('base64');
encrypted = encryptCredentials('owner', { email: 'owner@example.org', password: 'test' });
let remote: { name: string; specification: string }[] = [];
let writeCount = 0;
globalThis.fetch = async (url, init) => {
    const path = String(url);
    if (path.endsWith('/bringauth'))
        return Response.json({ uuid: 'remote-owner', access_token: 'token' });
    if (path.endsWith('/lists'))
        return Response.json({ lists: [{ listUuid: 'mine', name: 'Zuhause' }] });
    if (init?.method === 'PUT') {
        writeCount++;
        const body = new URLSearchParams(init.body as URLSearchParams);
        remote.push({ name: body.get('purchase')!, specification: body.get('specification')! });
        return new Response(null, { status: 204 });
    }
    return Response.json({ purchase: remote, recently: [] });
};

test('committed remote writes remain recorded even if the surrounding transaction fails', async () => {
    receipts.clear();
    remote = [];
    writeCount = 0;
    failCommit = true;
    const input = [{ id: '1', name: 'Nudeln', specification: '400 g' }];
    await assert.rejects(service.transfer('owner', 'operation-1', 'mine', input));
    assert.equal(remote.length, 1);
    assert.ok(receipts.has('owner:operation-1'), 'remote side effect needs a durable receipt');
    failCommit = false;
    remote = []; // Shopper bought the item between attempts: replay must not resurrect it.
    await service.transfer('owner', 'operation-1', 'mine', input);
    assert.equal(writeCount, 1);
});

test('pending ambiguous transfers are never replayed after receipt finalization fails', async () => {
    receipts.clear();
    remote = [];
    writeCount = 0;
    failCommit = false;
    failReceiptUpdate = true;
    const input = [{ id: '1', name: 'Nudeln', specification: '400 g' }];
    await assert.rejects(service.transfer('owner', 'operation-2', 'mine', input));
    failReceiptUpdate = false;
    remote = [];
    await assert.rejects(service.transfer('owner', 'operation-2', 'mine', input));
    assert.equal(writeCount, 1);
});

test('service refuses missing connections and foreign list IDs before writes', async () => {
    failCommit = false;
    failReceiptUpdate = false;
    writeCount = 0;
    await assert.rejects(service.readList('stranger', 'mine'));
    await assert.rejects(
        service.mutateItem('owner', {
            listUuid: 'foreign',
            operation: 'add',
            name: 'Milch',
            specification: '1 L',
        }),
    );
    assert.equal(writeCount, 0);
});

test('service presents localized names while retaining canonical item identity', async () => {
    remote = [{ name: 'Peperoni', specification: '2 Stück' }];
    const result = await service.readList('owner', 'mine');
    assert.equal(result.purchase[0].name, 'Peperoni');
    assert.equal(result.purchase[0].displayName, 'Paprika');
});

test('API receipts reject a different recipe request even when expanded ingredients match', async () => {
    failCommit = false;
    failReceiptUpdate = false;
    receipts.clear();
    remote = [];
    writeCount = 0;
    const items = [{ id: '1', name: 'Nudeln', specification: '400 g' }];
    await service.transfer('owner', 'api-recipe:request-1', 'mine', items, { recipeId: 'one' });
    remote = [];
    await service.transfer('owner', 'api-recipe:request-1', 'mine', items, { recipeId: 'one' });
    assert.equal(writeCount, 1, 'completed API retry must not add again');
    await assert.rejects(
        service.transfer('owner', 'api-recipe:request-1', 'mine', items, { recipeId: 'two' }),
    );
    assert.equal(writeCount, 1);
});
