import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BringError } from '@app/lib/bring/client';
import { encryptCredentials } from '@app/lib/bring/crypto';
import {
    backoffMs,
    isDueForSync,
    syncConnection,
    type BringSyncClient,
    type SyncDeps,
} from '@app/lib/bring/sync';

import { createFakeDb } from '../meal-plan/fake-db';

const KEY = Buffer.alloc(32, 7).toString('base64');
process.env.BRING_ENCRYPTION_KEY = KEY;
const USER = 'u1';
const LIST = 'bring-list';
const NOW = new Date('2026-11-21T12:00:00Z');
const LAST = new Date('2026-11-21T11:50:00Z');

/** In-memory Bring!: add/complete/remove like the real list. Never touches the network. */
class FakeBring implements BringSyncClient {
    purchase: Array<{ name: string; specification: string }> = [];
    recently: Array<{ name: string; specification: string }> = [];
    writes: string[] = [];
    failWith: BringError | null = null;
    failItem: string | null = null;
    constructor(purchase: Array<[string, string]> = [], recently: Array<[string, string]> = []) {
        this.purchase = purchase.map(([name, specification]) => ({ name, specification }));
        this.recently = recently.map(([name, specification]) => ({ name, specification }));
    }
    async lists() {
        if (this.failWith) throw this.failWith;
        return [{ listUuid: LIST, name: 'Zuhause' }];
    }
    async items() {
        if (this.failWith) throw this.failWith;
        return { purchase: this.purchase, recently: this.recently };
    }
    async write(_list: string, op: 'add' | 'complete' | 'remove', name: string, spec: string) {
        if (this.failItem === name) throw new Error('boom');
        this.writes.push(`${op}:${name}:${spec}`);
        this.purchase = this.purchase.filter((i) => i.name !== name);
        this.recently = this.recently.filter((i) => i.name !== name);
        if (op === 'add') this.purchase.push({ name, specification: spec });
        if (op === 'complete') this.recently.push({ name, specification: spec });
    }
}

function setup(items: Array<Record<string, any>> = [], connection: Record<string, any> = {}) {
    const db = createFakeDb({
        shoppingList: [{ id: 'l1', userId: USER }],
        shoppingItem: items.map((item, i) => ({
            id: `item-${i}`,
            shoppingListId: 'l1',
            itemKey: `t:${String(item.name).toLowerCase()}`,
            ingredientId: null,
            quantity: null,
            baseUnit: null,
            displayUnit: null,
            quantityText: null,
            note: null,
            position: 0,
            updatedAt: new Date('2026-11-21T10:00:00Z'),
            ...item,
        })),
        bringConnection: [
            {
                userId: USER,
                credentials: encryptCredentials(USER, { email: 'a@b.de', password: 'x' }, KEY),
                defaultListUuid: LIST,
                syncEnabled: true,
                syncListUuid: LIST,
                syncStatus: 'OK',
                lastSyncAt: LAST,
                lastSyncError: null,
                syncErrorCount: 0,
                syncSnapshot: null,
                updatedAt: LAST,
                ...connection,
            },
        ],
    });
    return db;
}

const deps = (client: BringSyncClient, over: Partial<SyncDeps> = {}): SyncDeps => ({
    login: async () => client,
    loadCatalog: async () => [{ itemId: 'Milch', name: 'Milch' }],
    findIngredientId: async () => null,
    now: () => NOW,
    ...over,
});

const rows = (db: any, model: string) => db.tables[model] ?? [];
const connection = (db: any) => rows(db, 'bringConnection')[0];

test('first run: both lists are merged, items linked, base stored', async () => {
    const db = setup([{ name: 'Brot', status: 'OPEN', quantityText: '1 Stk' }]);
    const bring = new FakeBring([['Eier', '10 Stk']]);
    const result = await syncConnection(db, USER, deps(bring));
    assert.equal(result.outcome, 'ok');
    assert.deepEqual(bring.writes, ['add:Brot:1 Stk']);
    const names = rows(db, 'shoppingItem').map((i: any) => i.name);
    assert.deepEqual(names.sort(), ['Brot', 'Eier']);
    const brot = rows(db, 'shoppingItem').find((i: any) => i.name === 'Brot');
    assert.equal(brot.bringName, 'Brot');
    assert.ok(brot.bringSyncHash);
    assert.deepEqual(Object.keys(connection(db).syncSnapshot).sort(), ['Brot', 'Eier']);
    assert.equal(connection(db).syncStatus, 'OK');
    assert.equal(connection(db).lastSyncAt.getTime(), NOW.getTime());
    // the new item came from Bring!
    const eier = rows(db, 'shoppingItem').find((i: any) => i.name === 'Eier');
    assert.equal(eier.quantity, 10);
    assert.equal(rows(db, 'shoppingItemSource')[0].kind, 'BRING');
    // second run right after: nothing changes
    bring.writes.length = 0;
    const again = await syncConnection(db, USER, deps(bring));
    assert.equal(again.outcome, 'ok');
    assert.deepEqual(bring.writes, []);
    assert.equal(again.pulled, 0);
});

test('checked off on Bring! is bought here with history origin BRING', async () => {
    const db = setup([{ name: 'Milch', status: 'OPEN', bringName: 'Milch', bringSyncHash: null }], {
        syncSnapshot: { Milch: { state: 'open', spec: '' } },
    });
    // hash of the synced state
    const { entryHash } = await import('@app/lib/bring/sync-plan');
    rows(db, 'shoppingItem')[0].bringSyncHash = entryHash('Milch', '', 'open');
    const bring = new FakeBring([], [['Milch', '']]);
    const result = await syncConnection(db, USER, deps(bring));
    assert.equal(result.outcome, 'ok');
    assert.equal(rows(db, 'shoppingItem')[0].status, 'PURCHASED');
    const history = rows(db, 'shoppingHistory');
    assert.equal(history.length, 1);
    assert.equal(history[0].event, 'PURCHASED');
    assert.equal(history[0].origin, 'BRING');
    assert.equal(history[0].occurredAt.getTime(), NOW.getTime());
    assert.deepEqual(bring.writes, []);
});

test('checked off here is ticked off on Bring!', async () => {
    const { entryHash } = await import('@app/lib/bring/sync-plan');
    const db = setup(
        [
            {
                name: 'Milch',
                status: 'PURCHASED',
                bringName: 'Milch',
                bringSyncHash: entryHash('Milch', '', 'open'),
            },
        ],
        { syncSnapshot: { Milch: { state: 'open', spec: '' } } },
    );
    const bring = new FakeBring([['Milch', '']]);
    await syncConnection(db, USER, deps(bring));
    assert.deepEqual(bring.writes, ['complete:Milch:']);
    assert.equal(connection(db).syncSnapshot.Milch.state, 'done');
});

test('a conflict is resolved by the rule and logged', async () => {
    const { entryHash } = await import('@app/lib/bring/sync-plan');
    const db = setup(
        [
            {
                name: 'Milch',
                status: 'OPEN',
                bringName: 'Milch',
                quantityText: '2 l',
                bringSyncHash: entryHash('Milch', '1 l', 'open'),
                // edited after the middle of the window → local wins
                updatedAt: new Date('2026-11-21T11:58:00Z'),
            },
        ],
        { syncSnapshot: { Milch: { state: 'open', spec: '1 l' } } },
    );
    const bring = new FakeBring([['Milch', '3 l']]);
    await syncConnection(db, USER, deps(bring));
    assert.deepEqual(bring.writes, ['add:Milch:2 l']);
    const log = rows(db, 'bringSyncConflict');
    assert.equal(log.length, 1);
    assert.equal(log[0].userId, USER);
    assert.equal(log[0].field, 'spec');
    assert.equal(log[0].localValue, '2 l');
    assert.equal(log[0].remoteValue, '3 l');
    assert.equal(log[0].resolution, 'local');
});

test('Bring! outage: no exception, error is recorded, local list untouched', async () => {
    const db = setup([{ name: 'Brot', status: 'OPEN' }]);
    const bring = new FakeBring();
    bring.failWith = new BringError('UNAVAILABLE', 'Bring! ist gerade nicht erreichbar.');
    const result = await syncConnection(db, USER, deps(bring));
    assert.equal(result.outcome, 'error');
    assert.equal(connection(db).syncStatus, 'ERROR');
    assert.equal(connection(db).syncErrorCount, 1);
    assert.match(connection(db).lastSyncError, /nicht erreichbar/);
    assert.equal(rows(db, 'shoppingItem')[0].status, 'OPEN');
    assert.equal(rows(db, 'shoppingItem').length, 1);
});

test('repeated auth errors stop the sync', async () => {
    const db = setup([]);
    const bring = new FakeBring();
    bring.failWith = new BringError('AUTH', 'Bitte verbinde dein Bring!-Konto erneut.');
    const first = await syncConnection(db, USER, deps(bring));
    const second = await syncConnection(db, USER, deps(bring));
    assert.equal(first.outcome, 'error');
    assert.equal(second.outcome, 'error');
    assert.equal(connection(db).syncStatus, 'ERROR');
    const third = await syncConnection(db, USER, deps(bring));
    assert.equal(third.outcome, 'auth-failed');
    assert.equal(connection(db).syncStatus, 'AUTH_FAILED');
    // now it is not even tried
    bring.failWith = null;
    const fourth = await syncConnection(db, USER, deps(bring));
    assert.equal(fourth.outcome, 'auth-failed');
    assert.equal(bring.writes.length, 0);
    assert.equal(isDueForSync(connection(db), NOW), false);
});

test('one failing item does not block the others and is retried next time', async () => {
    const db = setup([
        { name: 'Brot', status: 'OPEN' },
        { name: 'Käse', status: 'OPEN' },
    ]);
    const bring = new FakeBring();
    bring.failItem = 'Brot';
    const result = await syncConnection(db, USER, deps(bring));
    assert.equal(result.outcome, 'partial');
    assert.equal(result.failed, 1);
    assert.deepEqual(bring.writes, ['add:Käse:']);
    assert.deepEqual(Object.keys(connection(db).syncSnapshot), ['Käse']);
    assert.equal(connection(db).syncStatus, 'ERROR');
    bring.failItem = null;
    const retry = await syncConnection(db, USER, deps(bring));
    assert.equal(retry.outcome, 'ok');
    assert.ok(bring.writes.includes('add:Brot:'));
});

test('dry run reports the plan and writes nothing', async () => {
    const db = setup([{ name: 'Brot', status: 'OPEN' }]);
    const bring = new FakeBring([['Eier', '']]);
    const result = await syncConnection(db, USER, deps(bring, { dryRun: true }));
    assert.equal(result.dryRun, true);
    assert.equal(result.pushed, 1);
    assert.equal(result.pulled, 1);
    assert.deepEqual(bring.writes, []);
    assert.equal(rows(db, 'shoppingItem').length, 1);
    assert.equal(connection(db).syncSnapshot, null);
    assert.equal(connection(db).lastSyncAt.getTime(), LAST.getTime());
});

test('switched off or no list chosen: skipped', async () => {
    const off = await syncConnection(
        setup([], { syncEnabled: false }),
        USER,
        deps(new FakeBring()),
    );
    assert.equal(off.outcome, 'skipped');
    const noList = await syncConnection(
        setup([], { syncListUuid: null }),
        USER,
        deps(new FakeBring()),
    );
    assert.equal(noList.outcome, 'skipped');
});

test('backoff grows with repeated errors and is capped', () => {
    assert.equal(backoffMs(0), 0);
    assert.equal(backoffMs(1), 5 * 60_000);
    assert.equal(backoffMs(3), 20 * 60_000);
    assert.equal(backoffMs(30), 6 * 3_600_000);
    const base = { syncEnabled: true, syncStatus: 'ERROR', syncErrorCount: 2, updatedAt: LAST };
    assert.equal(isDueForSync(base, new Date(LAST.getTime() + 9 * 60_000)), false);
    assert.equal(isDueForSync(base, new Date(LAST.getTime() + 10 * 60_000)), true);
    assert.equal(isDueForSync({ ...base, syncErrorCount: 0 }, LAST), true);
    assert.equal(isDueForSync({ ...base, syncEnabled: false }, NOW), false);
});
