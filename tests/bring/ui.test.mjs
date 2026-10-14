import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { after, before, test } from 'node:test';

import { chromium } from '@playwright/test';
import { build } from 'esbuild';

let browser;
let server;
let baseURL;
before(async () => {
    const result = await build({
        stdin: {
            contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {ShoppingListClient} from './src/components/bring/ShoppingListClient'; import {AddToListButton} from './src/components/bring/AddToListButton'; import {ConnectionCard} from './src/components/bring/ConnectionCard';
        createRoot(document.getElementById('root')).render(new URLSearchParams(location.search).get('mode') === 'shopping' ? <ShoppingListClient/> : new URLSearchParams(location.search).get('mode') === 'connection' ? <ConnectionCard/> : <AddToListButton servings={4} originalServings={2} ingredients={[{name:'Tomaten',rawAmount:'1,5',unit:'kg'},{name:'Salz',rawAmount:'nach Bedarf'}]}/>);`,
            loader: 'tsx',
            resolveDir: process.cwd(),
        },
        alias: { 'styled-system/css': resolve('styled-system/css/index.mjs') },
        bundle: true,
        format: 'esm',
        write: false,
        jsx: 'automatic',
        tsconfig: 'tsconfig.json',
        plugins: [
            {
                name: 'ui-boundaries',
                setup(build) {
                    build.onResolve({ filter: /^@app\/lib\/bring\/actions$/ }, () => ({
                        path: resolve('tests/bring/ui/actions.ts'),
                    }));
                    build.onResolve({ filter: /^next\/(link|navigation)$/ }, ({ path }) => ({
                        path,
                        namespace: 'next-stub',
                    }));
                    build.onLoad({ filter: /.*/, namespace: 'next-stub' }, ({ path }) => ({
                        contents: path.endsWith('/navigation')
                            ? `export const usePathname = () => '/recipe/test';`
                            : `export default function Link(props) { return <a {...props}/>; }`,
                        loader: 'jsx',
                        resolveDir: process.cwd(),
                    }));
                },
            },
        ],
    });
    const javascript = result.outputFiles[0].text;
    const stylesheet = await readFile('.superpowers/bring-ui.css', 'utf8');
    await mkdir('test-results/bring', { recursive: true });
    server = createServer((req, res) => {
        if (req.url === '/app.css') {
            res.setHeader('Content-Type', 'text/css');
            res.end(stylesheet);
        } else if (req.url === '/app.js') {
            res.setHeader('Content-Type', 'application/javascript');
            res.end(javascript);
        } else {
            res.setHeader('Content-Type', 'text/html');
            res.end(
                '<!doctype html><html lang="de"><head><link rel="stylesheet" href="/app.css"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>',
            );
        }
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseURL = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({
        headless: true,
        ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
            ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
            : {}),
    });
});
after(async () => {
    await browser?.close();
    await new Promise((resolve) => server?.close(resolve));
});

async function pageFor(query, width = 1280) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(baseURL + query);
    return page;
}

test('recipe dialog connects inline, preserves scaled selection and transfers chosen items', async () => {
    const page = await pageFor('/?connected=0');
    await page.getByRole('button', { name: 'Auf die Einkaufsliste', exact: true }).click();
    await page.getByLabel('Menge und Details für Tomaten').waitFor();
    assert.equal(await page.getByLabel('Menge und Details für Tomaten').inputValue(), '3 kg');
    await page.getByLabel('Salz', { exact: true }).uncheck();
    await page.getByLabel('E-Mail bei Bring!').fill('test@example.org');
    await page.getByLabel('Bring!-Passwort', { exact: true }).fill('synthetic-test');
    await page.getByRole('button', { name: 'Listen laden', exact: true }).click();
    assert.equal(await page.getByLabel('Standardliste').inputValue(), '');
    await page.getByLabel('Standardliste').selectOption('a');
    await page.getByRole('button', { name: 'Verknüpfung speichern' }).click();
    await page.getByLabel('Bring!-Liste').waitFor();
    await page.screenshot({ path: 'test-results/bring/recipe-desktop.png' });
    assert.equal(await page.getByLabel('Salz', { exact: true }).isChecked(), false);
    await page.getByRole('button', { name: '1 Zutat hinzufügen' }).click();
    await page.getByRole('status').filter({ hasText: '1 hinzugefügt' }).waitFor();
    await page.close();
});

test('automatic list replacement never exposes old rows under the new list', async () => {
    const page = await pageFor('/?mode=shopping');
    await page.getByRole('checkbox', { name: /^Milch/ }).waitFor();
    await page.evaluate(() => {
        window.bringTest.lists = [{ listUuid: 'b', name: 'Wochenende' }];
        window.bringTest.defaultListUuid = 'b';
        window.bringTest.delay = 2500;
    });
    await page.getByRole('button', { name: 'Aktualisieren', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('select')?.value === 'b');
    assert.equal(await page.getByRole('checkbox', { name: /^Milch/ }).count(), 0);
    await page.getByRole('checkbox', { name: /^Brot/ }).waitFor();
    await page.close();
});

test('localized product labels are displayed', async () => {
    const page = await pageFor('/?mode=shopping');
    await page.getByRole('checkbox', { name: /^Milch/ }).waitFor();
    assert.equal(await page.getByRole('checkbox', { name: /^Paprika/ }).count(), 1);
    await page.screenshot({ path: 'test-results/bring/list-desktop.png' });
    await page.close();
});

test('mutation errors remain visible after a failed write', async () => {
    const page = await pageFor('/?mode=shopping');
    await page.getByRole('checkbox', { name: /^Milch/ }).waitFor();
    await page.evaluate(() => {
        window.bringTest.failWrite = true;
    });
    await page.getByLabel('Artikel hinzufügen', { exact: true }).fill('Mehl');
    await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
    await page.waitForTimeout(300);
    assert.match(await page.getByRole('alert').textContent(), /Schreiben fehlgeschlagen/);
    await page.close();
});

test('mobile sign-in return restores the selected draft and opens the dialog', async () => {
    const page = await pageFor('/?signed=0', 390);
    await page.getByRole('button', { name: 'Auf die Einkaufsliste', exact: true }).click();
    await page.getByLabel('Salz', { exact: true }).uncheck();
    await page.getByRole('link', { name: 'Anmelden und fortfahren' }).click();
    await page.goto(baseURL + '/recipe/test?signed=1');
    await page.getByRole('dialog').waitFor();
    assert.equal(await page.getByLabel('Menge und Details für Tomaten').inputValue(), '3 kg');
    assert.equal(await page.getByLabel('Salz', { exact: true }).count(), 0);
    const bounds = await page.getByRole('dialog').boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 391);
    await page.screenshot({ path: 'test-results/bring/recipe-mobile.png' });
    await page.close();
});

test('connected accounts can reload newly created lists without entering credentials again', async () => {
    const page = await pageFor('/?mode=connection&empty=1');
    await page.getByRole('button', { name: 'Erneut laden', exact: true }).waitFor();
    await page.evaluate(() => {
        window.bringTest.lists = [{ listUuid: 'a', name: 'Zuhause' }];
    });
    await page.getByRole('button', { name: 'Erneut laden', exact: true }).click();
    await page.waitForTimeout(200);
    assert.equal(await page.getByLabel('Standardliste').count(), 1);
    await page.close();
});
