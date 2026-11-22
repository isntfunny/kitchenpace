// KUC-135: a style value that looks like a token name but is none (`'text-muted'`,
// `boxShadow: 'shadow.small'` while shadows were colours) compiles to invalid CSS that the
// browser drops silently. Raw CSS values (12px, rgba(...), 50%) stay allowed; every named
// colour, shadow, radius and font size must exist in the generated Panda tokens.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';

const ROOT = join(import.meta.dirname, '..', '..');

function tokensOf(name: string): Set<string> {
    const source = readFileSync(join(ROOT, 'styled-system/tokens/tokens.d.ts'), 'utf8');
    const line = source.split('\n').find((l) => l.startsWith(`export type ${name} =`));
    assert.ok(line, `${name} missing in styled-system/tokens (run panda codegen)`);
    return new Set([...line.matchAll(/"([^"]+)"/g)].map((m) => m[1]));
}

const CSS_WORDS = new Set([
    'transparent',
    'inherit',
    'initial',
    'unset',
    'currentColor',
    'currentcolor',
    'none',
    'white',
    'black',
    'auto',
    'revert',
]);

const RULES: { kind: string; props: string; tokens: Set<string> }[] = [
    {
        kind: 'colour',
        props: 'color|bg|background|backgroundColor|borderColor|border(?:Top|Bottom|Left|Right|X|Y)Color|outlineColor|fill|stroke|accentColor|caretColor|textDecorationColor',
        tokens: tokensOf('ColorToken'),
    },
    { kind: 'shadow', props: 'boxShadow|shadow', tokens: tokensOf('ShadowToken') },
    { kind: 'radius', props: 'borderRadius|rounded', tokens: tokensOf('RadiusToken') },
    { kind: 'font size', props: 'fontSize', tokens: tokensOf('FontSizeToken') },
];

function* sourceFiles(dir: string, pattern = /\.(ts|tsx)$/): Generator<string> {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) yield* sourceFiles(path, pattern);
        else if (pattern.test(entry.name) && !entry.name.includes('.test.')) yield path;
    }
}

/** CSS variables Panda emits for tokens, e.g. `--colors-text\\.muted` (dots are escaped). */
function tokenVariables(): Set<string> {
    const source = readFileSync(join(ROOT, 'styled-system/tokens/index.mjs'), 'utf8');
    return new Set(
        [...source.matchAll(/"variable": "var\((--[^)]+)\)"/g)].map((m) =>
            m[1].replace(/\\\\/g, '\\'),
        ),
    );
}

test('every named style token exists', () => {
    const found: string[] = [];
    for (const file of sourceFiles(join(ROOT, 'src'))) {
        const text = readFileSync(file, 'utf8');
        if (!text.includes('styled-system')) continue;
        for (const rule of RULES) {
            // The value up to the end of the property; a ternary yields every branch:
            // `color: active ? 'text' : 'text.muted'`
            const property = new RegExp(`\\b(?:${rule.props})\\s*:\\s*([^,\\n{}]+)`, 'g');
            for (const match of text.matchAll(property)) {
                const expression = match[1];
                const values = /^'/.test(expression)
                    ? [expression]
                    : [...expression.matchAll(/[?:]\s*('[^']*')/g)].map((m) => m[1]);
                for (const literal of values) {
                    const value = /^'([a-zA-Z][\w.-]*)(?:\/\d+)?'/.exec(literal)?.[1];
                    if (!value || rule.tokens.has(value) || CSS_WORDS.has(value)) continue;
                    const line = text.slice(0, match.index).split('\n').length;
                    found.push(`${relative(ROOT, file)}:${line} ${rule.kind} '${value}'`);
                }
            }
        }
    }
    assert.deepEqual(found, []);
});

test('every var(--colors-…) points at a Panda token variable', () => {
    const variables = tokenVariables();
    const found: string[] = [];
    for (const file of sourceFiles(join(ROOT, 'src'), /\.(ts|tsx|css)$/)) {
        const text = readFileSync(file, 'utf8');
        for (const match of text.matchAll(/(=")?var\((--colors-[\w\\.-]+)/g)) {
            // JSX attributes (`color="…"`) and CSS take the text as is; in JS strings the
            // escape is doubled: 'var(--colors-text\\.muted)'
            const literal = Boolean(match[1]) || file.endsWith('.css');
            const name = literal ? match[2] : match[2].replace(/\\\\/g, '\\');
            if (variables.has(name)) continue;
            const line = text.slice(0, match.index).split('\n').length;
            found.push(`${relative(ROOT, file)}:${line} ${name}`);
        }
    }
    assert.deepEqual(found, []);
});
