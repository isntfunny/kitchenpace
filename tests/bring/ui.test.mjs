import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { basename, resolve } from 'node:path';
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
                    build.onResolve({ filter: /^@app\/components\/recipe\/actions$/ }, () => ({
                        path: resolve('tests/bring/ui/ingredients.ts'),
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
    // Optional compiled app fonts for visual review; no network or build dependency in CI.
    const fontCSS = process.env.BRING_UI_FONT_CSS
        ? (
              (await readFile(process.env.BRING_UI_FONT_CSS, 'utf8')).match(
                  /@font-face\{[^}]+\}/g,
              ) ?? []
          )
              .join('\n')
              .replaceAll('../media/', '/fonts/')
        : '';
    const fontFiles = new Map();
    for (const match of fontCSS.matchAll(/url\(\/fonts\/([^)]+)\)/g)) {
        fontFiles.set(
            '/fonts/' + match[1],
            await readFile(resolve('.next/static/media', basename(match[1]))),
        );
    }
    await mkdir('test-results/bring', { recursive: true });
    server = createServer((req, res) => {
        if (fontFiles.has(req.url)) {
            res.setHeader('Content-Type', 'font/woff2');
            res.end(fontFiles.get(req.url));
        } else if (req.url === '/app.css') {
            res.setHeader('Content-Type', 'text/css');
            res.end(fontCSS + stylesheet);
        } else if (req.url === '/app.js') {
            res.setHeader('Content-Type', 'application/javascript');
            res.end(javascript);
        } else {
            res.setHeader('Content-Type', 'text/html');
            res.end(
                '<!doctype html><html lang="de"><head><style>:root{--font-inter:Inter,system-ui,sans-serif;--font-playfair:"Playfair Display",Georgia,serif}body{font-family:var(--font-inter)}#root{max-width:800px;margin:24px auto;padding:0 16px}</style><link rel="stylesheet" href="/app.css"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>',
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
    page.setDefaultTimeout(10000);
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
    await page.getByRole('combobox', { name: 'Standardliste' }).click();
    await page.getByRole('option', { name: 'Zuhause', exact: true }).click();
    await page.getByRole('button', { name: 'Verknüpfung speichern' }).click();
    await page.getByLabel('Bring!-Liste').waitFor();
    await page.screenshot({
        animations: 'disabled',
        path: 'test-results/bring/recipe-desktop.png',
    });
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
    await page
        .getByRole('combobox', { name: 'Liste', exact: true })
        .filter({ hasText: 'Wochenende' })
        .waitFor();
    assert.equal(await page.getByRole('checkbox', { name: /^Milch/ }).count(), 0);
    await page.screenshot({ animations: 'disabled', path: 'test-results/bring/loading.png' });
    await page.getByRole('checkbox', { name: /^Brot/ }).waitFor();
    await page.close();
});

test('localized product labels are displayed', async () => {
    const page = await pageFor('/?mode=shopping');
    await page.getByRole('checkbox', { name: /^Milch/ }).waitFor();
    assert.equal(await page.getByRole('checkbox', { name: /^Paprika/ }).count(), 1);
    await page.screenshot({ animations: 'disabled', path: 'test-results/bring/list-desktop.png' });
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
    await page.screenshot({
        animations: 'disabled',
        path: 'test-results/bring/error.png',
        fullPage: true,
    });
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
    await page.screenshot({ animations: 'disabled', path: 'test-results/bring/recipe-mobile.png' });
    await page.close();
});

test('connected accounts can reload newly created lists without entering credentials again', async () => {
    const page = await pageFor('/?mode=connection&empty=1');
    await page.getByRole('button', { name: 'Erneut laden', exact: true }).waitFor();
    assert.equal(
        await page.getByRole('button', { name: 'Standardliste speichern' }).isDisabled(),
        true,
    );
    await page.screenshot({
        animations: 'disabled',
        path: 'test-results/bring/empty.png',
        fullPage: true,
    });
    await page.evaluate(() => {
        window.bringTest.lists = [{ listUuid: 'a', name: 'Zuhause' }];
    });
    await page.getByRole('button', { name: 'Erneut laden', exact: true }).click();
    await page.waitForTimeout(200);
    assert.equal(await page.getByLabel('Standardliste').count(), 1);
    await page.close();
});

// Catches clipped/covered list menus and lost keyboard focus when closing nested overlays.
test('dialog list picker supports keyboard selection and returns focus on close', async () => {
    const page = await pageFor('/');
    const trigger = page.getByRole('button', { name: 'Auf die Einkaufsliste', exact: true });
    await trigger.click();
    const select = page.getByRole('combobox', { name: 'Bring!-Liste' });
    await select.focus();
    await page.keyboard.press('ArrowDown');
    await page.getByRole('option', { name: 'Wochenende', exact: true }).waitFor();
    await page.keyboard.press('End');
    await page.waitForFunction(() => document.activeElement?.textContent === 'Wochenende');
    await page.keyboard.press('Enter');
    await select.filter({ hasText: 'Wochenende' }).waitFor();
    assert.match(await select.textContent(), /Wochenende/);
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.waitForFunction(
        () =>
            document.activeElement?.tagName === 'BUTTON' &&
            document.activeElement.textContent?.trim() === 'Auf die Einkaufsliste',
        null,
        { timeout: 5000 },
    );
    assert.equal(await trigger.evaluate((el) => el === document.activeElement), true);
    await page.close();
});

for (const theme of ['light', 'dark']) {
    for (const width of [390, 1280]) {
        test(`Bring surfaces fit ${width}px in ${theme} mode`, async () => {
            const page = await pageFor('/?mode=shopping&full=1', width);
            await page.evaluate((theme) => (document.documentElement.dataset.theme = theme), theme);
            await page.getByRole('checkbox', { name: /^Milch/ }).waitFor();
            await page.evaluate(() => document.fonts.ready);
            assert.ok(
                await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            );
            await page.screenshot({
                animations: 'disabled',
                path: `test-results/bring/list-${theme}-${width}.png`,
                fullPage: true,
            });
            await page.goto(baseURL + '/?mode=connection&connected=0');
            await page.evaluate((theme) => (document.documentElement.dataset.theme = theme), theme);
            await page.getByLabel('E-Mail bei Bring!').waitFor();
            await page.screenshot({
                animations: 'disabled',
                path: `test-results/bring/connect-${theme}-${width}.png`,
                fullPage: true,
            });
            await page.goto(baseURL + '/');
            await page.evaluate((theme) => (document.documentElement.dataset.theme = theme), theme);
            await page.getByRole('button', { name: 'Auf die Einkaufsliste', exact: true }).click();
            await page.getByRole('combobox', { name: 'Bring!-Liste' }).click();
            const option = page.getByRole('option', { name: 'Wochenende', exact: true });
            const bounds = await option.boundingBox();
            assert.ok(
                bounds &&
                    bounds.x >= 0 &&
                    bounds.x + bounds.width <= width &&
                    bounds.y + bounds.height <= 900,
            );
            await page.screenshot({
                animations: 'disabled',
                path: `test-results/bring/dialog-select-${theme}-${width}.png`,
            });
            await option.click();
            await page.screenshot({
                animations: 'disabled',
                path: `test-results/bring/dialog-${theme}-${width}.png`,
            });
            await page.close();
        });
    }
}

// Real household list names can be much longer than the short fixture labels.
test('long list names stay readable inside a mobile dialog menu', async () => {
    const page = await pageFor('/', 390);
    const name = 'Einkaufsliste für den gemeinsamen Familienurlaub im kommenden Sommer';
    await page.evaluate((name) => {
        window.bringTest.lists[0].name = name;
    }, name);
    await page.getByRole('button', { name: 'Auf die Einkaufsliste', exact: true }).click();
    await page.getByRole('combobox', { name: 'Bring!-Liste' }).click();
    const option = page.getByRole('option', { name, exact: true });
    const bounds = await option.boundingBox();
    assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 390, JSON.stringify(bounds));
    await option.click();
    assert.match(
        await page.getByRole('combobox', { name: 'Bring!-Liste' }).textContent(),
        /Familienurlaub/,
    );
    await page.close();
});

test('shopping autocomplete selects an ingredient with parsed quantity before adding', async () => {
    const page = await pageFor('/?mode=shopping', 390);
    const input = page.getByRole('combobox', { name: 'Artikel hinzufügen' });
    await input.fill('200g Tom');
    await page.getByRole('option', { name: /Tomate/ }).waitFor();
    await page.screenshot({
        animations: 'disabled',
        path: 'test-results/bring/autocomplete-mobile.png',
    });
    await input.press('ArrowDown');
    await input.press('Enter');
    await page.waitForFunction(
        () => document.querySelector('[aria-label="Artikel hinzufügen"]')?.value === 'Tomate',
    );
    assert.equal(await input.inputValue(), 'Tomate');
    assert.equal(await page.getByLabel('Menge oder Details').inputValue(), '200 g');
    assert.equal(await page.getByRole('checkbox', { name: /^Tomate/ }).count(), 0);
    await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
    await page.getByRole('checkbox', { name: /Tomate.*200 g/ }).waitFor();
    assert.equal(await input.inputValue(), '');
    await page.close();
});

test('shopping autocomplete ignores older responses and preserves free text on failure', async () => {
    const page = await pageFor('/?mode=shopping');
    const input = page.getByRole('combobox', { name: 'Artikel hinzufügen' });
    await input.fill('To');
    await page.waitForTimeout(250);
    await input.fill('Min');
    await page.getByRole('option', { name: /Minze/ }).waitFor();
    await page.waitForTimeout(700);
    assert.equal(await page.getByRole('option', { name: /Tomate/ }).count(), 0);
    await input.fill('Fehler');
    await page
        .getByText('Vorschläge gerade nicht verfügbar. Du kannst den Artikel trotzdem hinzufügen.')
        .waitFor();
    await input.fill('Küchenrolle');
    await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
    await page.getByRole('checkbox', { name: /^Küchenrolle/ }).waitFor();
    await page.close();
});

test('compact shopping rows expose editing in an accessible menu without losing an add draft', async () => {
    const page = await pageFor('/?mode=shopping', 390);
    await page.getByRole('checkbox', { name: /^Milch/ }).waitFor();
    const input = page.getByRole('combobox', { name: 'Artikel hinzufügen' });
    await input.fill('Küchenrolle');
    await input.press('Escape');
    await page.getByRole('button', { name: 'Aktionen für Milch' }).click();
    await page.getByRole('menuitem', { name: 'Menge bearbeiten' }).click();
    await page.getByLabel('Menge / Details für Milch').fill('2 L');
    await page.getByRole('button', { name: 'Änderung speichern' }).click();
    await page.getByRole('checkbox', { name: /Milch.*2 L/ }).waitFor();
    assert.equal(await input.inputValue(), 'Küchenrolle');
    const bounds = await page
        .getByRole('checkbox', { name: /^Paprika/ })
        .locator('xpath=ancestor::li')
        .boundingBox();
    assert.ok(bounds.height < 100, JSON.stringify(bounds));
    await page.close();
});

test('quantity edits retain their original conflict baseline across a background refresh', async () => {
    const page = await pageFor('/?mode=shopping');
    await page.getByRole('button', { name: 'Aktionen für Milch' }).click();
    await page.getByRole('menuitem', { name: 'Menge bearbeiten' }).click();
    await page.getByLabel('Menge / Details für Milch').fill('2 L');
    await page.evaluate(() => {
        window.bringTest.items.a.purchase[0].specification = '3 L';
        window.dispatchEvent(new Event('focus'));
    });
    await page.getByRole('checkbox', { name: /Milch.*3 L/ }).waitFor();
    await page.getByRole('button', { name: 'Änderung speichern' }).click();
    await page.getByRole('alert').filter({ hasText: 'zwischenzeitlich geändert' }).waitFor();
    assert.equal(await page.getByLabel('Menge / Details für Milch').inputValue(), '2 L');
    await page.close();
});

test('shopping rows can be completed, restored and removed through the new menu', async () => {
    const page = await pageFor('/?mode=shopping');
    await page.getByRole('checkbox', { name: /^Milch/ }).click();
    await page.getByText('Gekauft (1)', { exact: true }).click();
    await page.getByRole('checkbox', { name: /^Milch/ }).click();
    await page.getByText('Gekauft (0)', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Aktionen für Milch' }).click();
    await page.getByRole('menuitem', { name: 'Entfernen', exact: true }).click();
    await page.getByRole('checkbox', { name: /^Milch/ }).waitFor({ state: 'hidden' });
    await page.close();
});

test('new lists can be created from the switcher and opened without changing the default', async () => {
    const page = await pageFor('/?mode=shopping', 390);
    await page.getByRole('button', { name: 'Neue Liste', exact: true }).click();
    const submit = page.getByRole('button', { name: 'Liste erstellen', exact: true });
    assert.equal(await submit.isDisabled(), true);
    await page.getByLabel('Listenname').fill('Ausflug & Picknick');
    await page.screenshot({
        path: 'test-results/bring/create-list-mobile.png',
        animations: 'disabled',
    });
    await submit.click();
    await page.getByText('Liste „Ausflug & Picknick“ erstellt.').waitFor();
    assert.equal(
        await page
            .getByRole('button', { name: 'Neue Liste', exact: true })
            .evaluate((el) => el === document.activeElement),
        true,
    );
    await page.getByText('Alles erledigt!', { exact: false }).waitFor();
    assert.equal(await page.evaluate(() => window.bringTest.defaultListUuid), 'a');
    await page.getByRole('combobox', { name: 'Artikel hinzufügen' }).fill('Servietten');
    await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
    await page.getByRole('checkbox', { name: /Servietten/ }).waitFor();
    await page.close();
});

test('failed list creation preserves the entered name', async () => {
    const page = await pageFor('/?mode=shopping', 390);
    await page.getByRole('button', { name: 'Neue Liste', exact: true }).click();
    await page.evaluate(() => {
        window.bringTest.failWrite = true;
    });
    await page.getByLabel('Listenname').fill('Ausflug');
    await page.getByRole('button', { name: 'Liste erstellen', exact: true }).click();
    await page.getByText(/Test: Erstellen fehlgeschlagen/).waitFor();
    assert.equal(await page.getByLabel('Listenname').inputValue(), 'Ausflug');
    await page.close();
});
