// Resumable apply and targeted rollback of the full re-import (KUC-115).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { FullBackup, FullBackupEntry } from './full-refresh';
import {
    editedSinceApply,
    parseAppliedLog,
    progressLine,
    selectRollbackEntries,
} from './full-refresh-progress';

const entry = (id: string) => ({ id }) as FullBackupEntry;
const backup: FullBackup = {
    kind: 'full',
    createdAt: '2026-11-21T10:00:00.000Z',
    recipes: [entry('a'), entry('b'), entry('c')],
};

test('log: applied lines count, rollback lines undo them, a cut-off last line is ignored', () => {
    const text = [
        progressLine({ recipeId: 'a', at: '2026-11-21T10:01:00.000Z', backup: '/x/backup-1.json' }),
        progressLine({ recipeId: 'b', at: '2026-11-21T10:02:00.000Z', backup: '/x/backup-1.json' }),
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
        }) +
            progressLine({
                recipeId: 'c',
                at: '2026-11-21T12:00:00.000Z',
                backup: '/x/backup-2.json',
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

test('warns about recipes edited after their re-import', () => {
    const log = parseAppliedLog(
        progressLine({ recipeId: 'a', at: '2026-11-21T10:01:00.000Z', backup: 'b.json' }) +
            progressLine({ recipeId: 'b', at: '2026-11-21T10:02:00.000Z', backup: 'b.json' }),
    );
    assert.deepEqual(
        editedSinceApply(
            log,
            new Map([
                ['a', new Date('2026-11-21T10:01:00.000Z')],
                ['b', new Date('2026-11-21T15:00:00.000Z')],
                ['z', new Date('2026-11-21T15:00:00.000Z')],
            ]),
        ),
        ['b'],
    );
});
