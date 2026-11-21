// Resumable apply and targeted rollback of the full re-import (KUC-115).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { FullBackup, FullBackupEntry } from './full-refresh';
import {
    editedSinceApply,
    parseAppliedLog,
    progressLine,
    recipeFingerprint,
    selectRollbackEntries,
} from './full-refresh-progress';

const entry = (id: string) => ({ id }) as FullBackupEntry;
const fingerprint = recipeFingerprint({ title: 'x', ingredientCount: 0, flowEdges: [] });
const backup: FullBackup = {
    kind: 'full',
    createdAt: '2026-11-21T10:00:00.000Z',
    recipes: [entry('a'), entry('b'), entry('c')],
};

test('log: applied lines count, rollback lines undo them, a cut-off last line is ignored', () => {
    const text = [
        progressLine({
            recipeId: 'a',
            at: '2026-11-21T10:01:00.000Z',
            backup: '/x/backup-1.json',
            fingerprint,
        }),
        progressLine({
            recipeId: 'b',
            at: '2026-11-21T10:02:00.000Z',
            backup: '/x/backup-1.json',
            fingerprint,
        }),
        progressLine({ recipeId: 'b', rolledBackAt: '2026-11-21T11:00:00.000Z' }),
        '{"recipeId":"c","at":"2026-11-21T1',
    ].join('');
    const applied = parseAppliedLog(text);
    assert.deepEqual([...applied.keys()], ['a']);
    assert.equal(applied.get('a')!.backup, '/x/backup-1.json');
});

test('rollback: only recipes applied from this backup; without a log all of them', () => {
    const log = parseAppliedLog(
        progressLine({
            recipeId: 'a',
            at: '2026-11-21T10:01:00.000Z',
            backup: '/x/backup-1.json',
            fingerprint,
        }) +
            progressLine({
                recipeId: 'c',
                at: '2026-11-21T12:00:00.000Z',
                backup: '/x/backup-2.json',
                fingerprint,
            }),
    );
    // the same file seen through another directory (e.g. copied off the server)
    const picked = selectRollbackEntries(backup, '/elsewhere/backup-1.json', log);
    assert.deepEqual(
        picked.entries.map((e) => e.id),
        ['a'],
    );
    assert.deepEqual(picked.notApplied, ['b', 'c']);
    assert.deepEqual(
        selectRollbackEntries(backup, '/x/backup-1.json', null).entries.map((e) => e.id),
        ['a', 'b', 'c'],
    );
});

test('fingerprint: title, ingredient count and flow edges; key order does not matter', () => {
    const edges = [{ id: 'e1', source: 'a', target: 'b', type: 'smoothstep' }];
    const fp = recipeFingerprint({ title: 'Suppe', ingredientCount: 3, flowEdges: edges });
    // as read back from jsonb: same content, keys in another order
    const reread = [{ type: 'smoothstep', target: 'b', source: 'a', id: 'e1' }];
    assert.deepEqual(
        recipeFingerprint({ title: 'Suppe', ingredientCount: 3, flowEdges: reread }),
        fp,
    );
    assert.notDeepEqual(
        recipeFingerprint({ title: 'Suppe', ingredientCount: 3, flowEdges: [...edges, edges[0]] }),
        fp,
    );
    assert.equal(fp.flowEdges.length, 16);
});

test('warns about recipes whose title, ingredients or flow changed after the re-import', () => {
    const fp = (title: string, ingredientCount = 3) =>
        recipeFingerprint({ title, ingredientCount, flowEdges: [] });
    const line = (recipeId: string) =>
        progressLine({
            recipeId,
            at: '2026-11-21T10:01:00.000Z',
            backup: 'b.json',
            fingerprint: fp('Suppe'),
        });
    const log = parseAppliedLog(
        line('a') +
            line('b') +
            line('c') +
            // a line of an older run, without fingerprint
            `${JSON.stringify({ recipeId: 'd', at: '2026-11-21T10:01:00.000Z', backup: 'b.json' })}\n`,
    );
    assert.equal(log.get('d')!.fingerprint, undefined);
    assert.deepEqual(
        editedSinceApply(
            log,
            new Map([
                // only viewed or rated since: same fingerprint
                ['a', fp('Suppe')],
                ['b', fp('Suppe mit Speck')],
                ['c', fp('Suppe', 4)],
                ['d', fp('Suppe')],
                ['z', fp('Anderes')],
            ]),
        ),
        { edited: ['b', 'c'], unknown: ['d'] },
    );
});
