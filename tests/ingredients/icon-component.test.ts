// Renders IngredientIcon to static markup. The component imports Panda's
// generated `styled-system/css` (a directory without package.json), which tsx
// cannot resolve, so the component is bundled with esbuild first.

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { before, test } from 'node:test';

import { build } from 'esbuild';

import { FALLBACK_ICON } from '../../shared/ingredient-icons/names';

let render: (props: Record<string, unknown>) => string;

before(async () => {
    const result = await build({
        stdin: {
            contents: `
                import { createElement } from 'react';
                import { renderToStaticMarkup } from 'react-dom/server';
                import { IngredientIcon } from './src/components/ingredients/IngredientIcon';
                export const render = (props) => renderToStaticMarkup(createElement(IngredientIcon, props));`,
            loader: 'ts',
            resolveDir: process.cwd(),
        },
        alias: {
            'styled-system/css': resolve('styled-system/css/index.mjs'),
            '@app': resolve('src'),
            '@shared': resolve('shared'),
        },
        bundle: true,
        format: 'cjs',
        platform: 'node',
        jsx: 'automatic',
        define: { 'process.env.NODE_ENV': '"production"' },
        write: false,
    });
    const loaded = { exports: {} as { render: typeof render } };
    new Function('module', 'exports', 'require', result.outputFiles[0].text)(
        loaded,
        loaded.exports,
        createRequire(import.meta.url),
    );
    ({ render } = loaded.exports);
});

test('IngredientIcon renders the resolved icon inline in currentColor at the given size', () => {
    const html = render({ ingredient: { categories: [{ slug: 'eier' }] }, size: 32 });
    assert.match(html, /data-icon="egg"/);
    assert.match(html, /width="32"/);
    assert.match(html, /height="32"/);
    assert.match(html, /aria-hidden="true"/);
    assert.ok(html.includes('currentColor'));
    assert.ok(!/(https?:\/\/(?!www\.w3\.org))|href=/.test(html), 'no network reference');
});

test('IngredientIcon prefers an explicit icon over the ingredient chain', () => {
    const html = render({ icon: 'cheese', ingredient: { categories: [{ slug: 'eier' }] } });
    assert.match(html, /data-icon="cheese"/);
});

test('IngredientIcon falls back to the neutral icon and labels when asked', () => {
    const html = render({ label: 'Zutat' });
    assert.match(html, new RegExp(`data-icon="${FALLBACK_ICON}"`));
    assert.match(html, /role="img"/);
    assert.match(html, /aria-label="Zutat"/);
    assert.ok(!html.includes('aria-hidden'));
});

test('IngredientIcon shows the household icon of a free-text item', () => {
    assert.match(render({ text: 'Spülmittel' }), /data-icon="dish-soap"/);
});
