// KUC-129: a side shorthand without a colour (`borderTop: '1px solid'`) resets the colour to
// `currentColor`. Panda emits `borderColor` before the side rules, so the line turns black even
// when the same style sets `borderColor`. Set `border{Side}Width` and `border{Side}Style` instead.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';

const ROOT = join(import.meta.dirname, '..', '..');
const SIDE_WITHOUT_COLOR =
    /\bborder(?:Top|Bottom|Left|Right|X|Y|Inline|Block|InlineStart|InlineEnd|BlockStart|BlockEnd)\s*:\s*(['"`])\s*[0-9.]+(?:px|rem|em)?\s+(?:solid|dashed|dotted|double)\s*\1/g;

function* sourceFiles(dir: string): Generator<string> {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) yield* sourceFiles(path);
        else if (/\.(ts|tsx)$/.test(entry.name)) yield path;
    }
}

test('no border side shorthand without a colour in src', () => {
    const found: string[] = [];
    for (const file of sourceFiles(join(ROOT, 'src'))) {
        const text = readFileSync(file, 'utf8');
        for (const match of text.matchAll(SIDE_WITHOUT_COLOR)) {
            const line = text.slice(0, match.index).split('\n').length;
            found.push(`${relative(ROOT, file)}:${line} ${match[0]}`);
        }
    }
    assert.deepEqual(found, []);
});
