import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    entryHash,
    planSync,
    type LocalEntry,
    type RemoteEntry,
    type Snapshot,
} from '@app/lib/bring/sync-plan';

const T0 = new Date('2026-11-21T10:00:00Z');

const local = (name: string, over: Partial<LocalEntry> = {}): LocalEntry => ({
    id: `id-${name}`,
    name,
    bringName: null,
    state: 'open',
    spec: '',
    syncedHash: null,
    updatedAt: T0,
    ...over,
});
/** A local item as it stands right after a sync: linked, hash of its current state */
const synced = (name: string, spec = '', state: LocalEntry['state'] = 'open', over = {}) =>
    local(name, {
        bringName: name,
        spec,
        state,
        syncedHash: entryHash(name, spec, state),
        ...over,
    });
const remote = (name: string, spec = ''): RemoteEntry => ({ name, spec });

function plan(
    localEntries: LocalEntry[],
    purchase: RemoteEntry[],
    recently: RemoteEntry[] = [],
    snapshot: Snapshot | null = {},
    remoteChangedAt = new Date('2026-11-21T10:05:00Z'),
) {
    return planSync({
        local: localEntries,
        remote: { purchase, recently },
        snapshot,
        remoteChangedAt,
        resolveName: (name) => name,
    });
}

test('new local item goes to Bring!, new Bring! item comes to KochTakt', () => {
    const result = plan([local('Milch', { spec: '1 l' })], [remote('Eier', '10 Stk')]);
    assert.deepEqual(result.remote, [{ op: 'add', name: 'Milch', spec: '1 l' }]);
    assert.deepEqual(result.local, [
        { type: 'create', name: 'Eier', bringName: 'Eier', spec: '10 Stk', state: 'open' },
    ]);
    assert.deepEqual(result.snapshot, {
        Milch: { state: 'open', spec: '1 l' },
        Eier: { state: 'open', spec: '10 Stk' },
    });
});

test('items already on both sides are linked without writes', () => {
    const result = plan([local('Milch', { spec: '1 l' })], [remote('Milch', '1 l')]);
    assert.equal(result.remote.length + result.local.length, 0);
    assert.equal(result.conflicts.length, 0);
    assert.deepEqual(result.touched, [{ itemId: 'id-Milch', bringName: 'Milch', spec: '1 l' }]);
});

test('recently list without base is history, not news; dormant and bought unlinked items stay out', () => {
    const result = plan(
        [local('Brot', { state: 'done' }), local('Salz', { state: 'none' })],
        [],
        [remote('Käse')],
    );
    assert.equal(result.remote.length + result.local.length, 0);
});

test('checked off on Bring! → bought here', () => {
    const base: Snapshot = { Milch: { state: 'open', spec: '1 l' } };
    const result = plan([synced('Milch', '1 l')], [], [remote('Milch', '1 l')], base);
    assert.deepEqual(result.local, [
        { type: 'apply', itemId: 'id-Milch', bringName: 'Milch', state: 'done' },
    ]);
    assert.equal(result.remote.length, 0);
    assert.equal(result.snapshot.Milch.state, 'done');
});

test('checked off here → ticked off on Bring!', () => {
    const base: Snapshot = { Milch: { state: 'open', spec: '1 l' } };
    const result = plan([synced('Milch', '1 l', 'done')], [remote('Milch', '1 l')], [], base);
    assert.deepEqual(result.remote, [{ op: 'complete', name: 'Milch', spec: '1 l' }]);
});

test('checking off wins when one side checked off and the other removed or changed it', () => {
    const base: Snapshot = { Milch: { state: 'open', spec: '1 l' } };
    // here bought, removed on Bring!
    const a = plan([synced('Milch', '1 l', 'done')], [], [], base);
    assert.equal(a.remote.length, 0);
    assert.equal(a.local.length, 0);
    assert.equal(a.snapshot.Milch.state, 'done');
    assert.equal(a.conflicts[0].resolution, 'checked-off');
    // removed here, bought on Bring!: bought wins, the item comes back as bought
    const b = plan([], [], [remote('Milch', '1 l')], base);
    assert.deepEqual(b.local, [
        { type: 'create', name: 'Milch', bringName: 'Milch', spec: '1 l', state: 'done' },
    ]);
    assert.equal(b.conflicts[0].resolution, 'checked-off');
});

test('removal is carried over, in both directions', () => {
    const base: Snapshot = { Milch: { state: 'open', spec: '' } };
    const removedHere = plan([], [remote('Milch')], [], base);
    assert.deepEqual(removedHere.remote, [{ op: 'remove', name: 'Milch', spec: '' }]);
    const removedThere = plan([synced('Milch')], [], [], base);
    assert.deepEqual(removedThere.local, [
        { type: 'delete', itemId: 'id-Milch', bringName: 'Milch' },
    ]);
    assert.equal(removedThere.snapshot.Milch, undefined);
});

test('Bring! pruning its "recently" list is no removal', () => {
    const base: Snapshot = { Milch: { state: 'done', spec: '' } };
    const result = plan([synced('Milch', '', 'done')], [], [], base);
    assert.equal(result.remote.length + result.local.length, 0);
});

test('needed again here after being bought → added on Bring! again', () => {
    const base: Snapshot = { Milch: { state: 'done', spec: '' } };
    const result = plan(
        [synced('Milch', '', 'done', {})].map((e) => ({
            ...e,
            state: 'open' as const,
            spec: '2 l',
        })),
        [],
        [remote('Milch')],
        base,
    );
    assert.deepEqual(result.remote, [{ op: 'add', name: 'Milch', spec: '2 l' }]);
});

test('amount changed on one side only is carried over', () => {
    const base: Snapshot = { Milch: { state: 'open', spec: '1 l' } };
    const here = plan(
        [{ ...synced('Milch', '1 l'), spec: '2 l' }],
        [remote('Milch', '1 l')],
        [],
        base,
    );
    assert.deepEqual(here.remote, [{ op: 'add', name: 'Milch', spec: '2 l' }]);
    const there = plan([synced('Milch', '1 l')], [remote('Milch', '3 l')], [], base);
    assert.deepEqual(there.local, [
        { type: 'apply', itemId: 'id-Milch', bringName: 'Milch', spec: '3 l' },
    ]);
    assert.equal(there.conflicts.length, 0);
});

test('amount changed on both sides: the newer change wins and is logged', () => {
    const base: Snapshot = { Milch: { state: 'open', spec: '1 l' } };
    const edited = (updatedAt: Date) => ({ ...synced('Milch', '1 l'), spec: '2 l', updatedAt });
    // local edit after the estimated remote change → local wins
    const localWins = plan(
        [edited(new Date('2026-11-21T10:08:00Z'))],
        [remote('Milch', '3 l')],
        [],
        base,
    );
    assert.deepEqual(localWins.remote, [{ op: 'add', name: 'Milch', spec: '2 l' }]);
    assert.deepEqual(localWins.conflicts, [
        {
            itemId: 'id-Milch',
            bringName: 'Milch',
            field: 'spec',
            localValue: '2 l',
            remoteValue: '3 l',
            resolution: 'local',
        },
    ]);
    // local edit before it → Bring! wins
    const remoteWins = plan(
        [edited(new Date('2026-11-21T10:01:00Z'))],
        [remote('Milch', '3 l')],
        [],
        base,
    );
    assert.deepEqual(remoteWins.local, [
        { type: 'apply', itemId: 'id-Milch', bringName: 'Milch', spec: '3 l' },
    ]);
    assert.equal(remoteWins.conflicts[0].resolution, 'remote');
});

test('notation differing without a change on either side stays quiet', () => {
    const base: Snapshot = { Milch: { state: 'open', spec: '500g' } };
    const result = plan([synced('Milch', '500 g')], [remote('Milch', '500g')], [], base);
    assert.equal(result.remote.length + result.local.length + result.conflicts.length, 0);
    assert.equal(result.snapshot.Milch.spec, '500g');
});

test('first link with different amounts is a logged conflict; an empty side loses silently', () => {
    const both = plan([local('Milch', { spec: '1 l' })], [remote('Milch', '2 l')], [], null);
    assert.equal(both.conflicts.length, 1);
    const one = plan([local('Milch', { spec: '' })], [remote('Milch', '2 l')], [], null);
    assert.equal(one.conflicts.length, 0);
    assert.equal(one.local.length, 1);
});

test('two local items for one Bring! name: the linked one claims it', () => {
    const result = plan(
        [local('Milch'), { ...synced('Milch'), id: 'linked' }],
        [remote('Milch')],
        [],
        { Milch: { state: 'open', spec: '' } },
    );
    assert.equal(result.remote.length + result.local.length, 0);
});
