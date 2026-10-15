import assert from 'node:assert/strict';
import { test } from 'node:test';

import { requireList, transferItems } from '../../src/lib/bring/transfer';
import type { BringItem } from '../../src/lib/bring/types';

test('list authorization refuses another account list and never silently picks the first', () => {
    assert.throws(() => requireList([{ listUuid: 'mine', name: 'Zuhause' }], 'foreign'));
    assert.throws(() => requireList([{ listUuid: 'mine', name: 'Zuhause' }], ''));
    assert.equal(requireList([{ listUuid: 'mine', name: 'Zuhause' }], 'mine').name, 'Zuhause');
});

test('transfer preserves existing quantities and reconciles an ambiguous write before retry', async () => {
    const purchase: BringItem[] = [{ name: 'Milch', specification: '1 L' }];
    const client = {
        items: async () => ({ purchase: [...purchase], recently: [] }),
        write: async (_list: string, _op: string, name: string, specification: string) => {
            if (name === 'Salz') throw new Error('offline');
            purchase.push({ name, specification });
            if (name === 'Nudeln') throw new Error('response lost after successful write');
        },
    };
    const inputs = [
        { id: '1', name: 'Milch', specification: '2 L' },
        { id: '2', name: 'Nudeln', specification: '400 g' },
        { id: '3', name: 'Salz', specification: '' },
    ];
    const outcomes = await transferItems(client, 'mine', inputs, []);
    assert.deepEqual(
        outcomes.map((o) => o.status),
        ['existing', 'added', 'failed'],
    );
    assert.deepEqual(purchase, [
        { name: 'Milch', specification: '1 L' },
        { name: 'Nudeln', specification: '400 g' },
    ]);
    const retried = await transferItems(client, 'mine', inputs, []);
    assert.deepEqual(
        retried.map((o) => o.status),
        ['existing', 'existing', 'failed'],
    );
    assert.equal(purchase.length, 2);
});

test('catalog-equivalent ingredients in one import cannot overwrite each other', async () => {
    const purchase: BringItem[] = [];
    const client = {
        items: async () => ({ purchase: [...purchase], recently: [] }),
        write: async (_list: string, _op: string, name: string, specification: string) => {
            purchase.push({ name, specification });
        },
    };
    const outcomes = await transferItems(
        client,
        'mine',
        [
            { id: '1', name: 'Paprika', specification: '2 Stück' },
            { id: '2', name: 'Peperoni', specification: '1 Stück' },
        ],
        [{ itemId: 'Peperoni', name: 'Paprika' }],
    );
    assert.deepEqual(
        outcomes.map((o) => o.status),
        ['added', 'existing'],
    );
    assert.equal(purchase[0].specification, '2 Stück + 1 Stück');
});

test('two uses of the same ingredient retain both specifications in one shopping item', async () => {
    const writes: { name: string; specification: string }[] = [];
    const client = {
        items: async () => ({ purchase: [], recently: [] }),
        write: async (_l: string, _o: string, name: string, specification: string) => {
            writes.push({ name, specification });
        },
    };
    const result = await transferItems(
        client as any,
        'mine',
        [
            { id: 'dough-salt', name: 'Salz', specification: '2 TL für den Teig' },
            { id: 'cream-salt', name: 'Salz', specification: 'nach Geschmack für die Creme' },
        ],
        [],
    );
    assert.equal(writes.length, 1);
    assert.equal(writes[0].specification, '2 TL für den Teig + nach Geschmack für die Creme');
    assert.equal(result.length, 2);
    assert.deepEqual(
        result.map((i) => i.id),
        ['dough-salt', 'cream-salt'],
    );
});
