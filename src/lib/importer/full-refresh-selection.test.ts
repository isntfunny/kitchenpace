// Fixed selection and its parts for the full re-import (KUC-115).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    chunkIds,
    isFullSelection,
    parseChunk,
    parseIdsFile,
    type FullSelection,
} from './full-refresh-selection';

test('--chunk N/M: valid parts only', () => {
    assert.deepEqual(parseChunk('2/5'), { index: 2, total: 5 });
    assert.deepEqual(parseChunk(' 1 / 1 '), { index: 1, total: 1 });
    for (const bad of ['0/3', '4/3', '1/0', '1', 'a/b', '1/2/3'])
        assert.throws(() => parseChunk(bad), /--chunk/, bad);
});

test('parts cover the selection once, in order, sizes differ by at most one', () => {
    const ids = Array.from({ length: 11 }, (_, i) => `r${i}`);
    for (const total of [1, 2, 3, 4, 11, 13]) {
        const parts = Array.from({ length: total }, (_, i) =>
            chunkIds(ids, { index: i + 1, total }),
        );
        assert.deepEqual(parts.flat(), ids, `total ${total}`);
        const sizes = parts.map((p) => p.length);
        assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1, `total ${total}`);
    }
    assert.deepEqual(chunkIds(ids, { index: 1, total: 3 }), ['r0', 'r1', 'r2', 'r3']);
    assert.deepEqual(chunkIds(ids, { index: 3, total: 3 }), ['r8', 'r9', 'r10']);
});

test('--ids-file: selection.json, JSON list or one id per line', () => {
    const selection: FullSelection = {
        kind: 'full-selection',
        createdAt: '2026-11-21T00:00:00.000Z',
        ids: ['a', 'b'],
        recipes: [],
    };
    assert.ok(isFullSelection(selection));
    assert.deepEqual(parseIdsFile(JSON.stringify(selection)), ['a', 'b']);
    assert.deepEqual(parseIdsFile('["a", "b", "a"]'), ['a', 'b']);
    assert.deepEqual(parseIdsFile('a\n\n# Kommentar\n b  # wichtig\na\n'), ['a', 'b']);
    assert.throws(() => parseIdsFile('{"ids": 1}'), /Auswahl/);
    assert.throws(() => parseIdsFile('[1, "a"]'), /nicht leerer Text/);
});
