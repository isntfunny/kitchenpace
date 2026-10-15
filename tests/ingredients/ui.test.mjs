import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { before, after, test } from 'node:test';

import { build } from 'esbuild';
import { chromium } from 'playwright';
let browser, server, url;
before(async () => {
    const result = await build({
        stdin: {
            contents: `import React, {useState} from 'react'; import {createRoot} from 'react-dom/client'; import {RecipeStepsViewer} from './src/components/flow/RecipeStepsViewer'; import {MobileRecipeClient} from './src/app/recipe/[id]/mobile/MobileRecipeClient'; import {IngredientList} from './src/app/recipe/[id]/components/IngredientList';
        const ingredients=[{id:'cream',ingredientId:'dairy',name:'Schmand',amount:'200',unit:'g'}, {id:'water',name:'Wasser',amount:'250',unit:'ml'}, {id:'salt-dough',ingredientId:'salt',name:'Salz',amount:'2',unit:'TL',notes:'für den Teig'}, {id:'salt-cream',ingredientId:'salt',name:'Salz',amount:'',unit:'',notes:'für die Creme'}];
        const nodes=[{id:'start',type:'start',label:'Start',description:'Bereit'}, {id:'s1',type:'mixen',label:'Creme',description:'@[Schmand](cream) und @[Wasser|100 ml](water) mischen. @[Salz](salt-cream) für die Creme.'}, {id:'s2',type:'mixen',label:'Teig',description:'@[Salz](salt-dough) für den Teig.'}, {id:'servieren',type:'servieren',label:'Servieren',description:'Servieren'}]; const edges=nodes.slice(1).map((n,i)=>({id:'e'+i,source:nodes[i].id,target:n.id}));
        function App(){const [servings,setServings]=useState(5);if(new URLSearchParams(location.search).has('standalone'))return <MobileRecipeClient recipe={{servings:5,ingredients:ingredients.map(i=>({...i,rawAmount:i.amount,amount:parseFloat(i.amount)||0})),flow:{nodes,edges}} as any} initialServings={10}/>;return <><label>Testportionen<select aria-label="Testportionen" value={servings} onChange={e=>setServings(Number(e.target.value))}><option>5</option><option>10</option></select></label><IngredientList ingredients={ingredients.map(i=>({...i,rawAmount:i.amount,amount:parseFloat(i.amount)||0})) as any} servings={servings} originalServings={5} onServingsChange={setServings}/><RecipeStepsViewer nodes={nodes} edges={edges} ingredients={ingredients} servings={servings} originalServings={5} recipeSlug="fixture" embedded={!new URLSearchParams(location.search).has('lane')} /></>}; createRoot(document.getElementById('root')).render(<App/>);`,
            loader: 'tsx',
            resolveDir: process.cwd(),
        },
        alias: {
            'styled-system/css': resolve('styled-system/css/index.mjs'),
            'styled-system/patterns': resolve('styled-system/patterns/index.mjs'),
        },
        loader: { '.css': 'empty' },
        bundle: true,
        format: 'esm',
        write: false,
        jsx: 'automatic',
        tsconfig: 'tsconfig.json',
        define: { 'process.env.NODE_ENV': '"test"' },
        plugins: [
            {
                name: 'boundaries',
                setup(b) {
                    b.onLoad({ filter: /\.[jt]sx?$/ }, async ({ path }) => {
                        if (!path.includes('/src/')) return;
                        const source = await readFile(path, 'utf8');
                        if (!/^['"]use server['"];/.test(source)) return;
                        const names = [
                            ...source.matchAll(
                                /export\s+(?:async\s+)?function\s+(\w+)|export\s+const\s+(\w+)/g,
                            ),
                        ].map((m) => m[1] ?? m[2]);
                        return {
                            contents: names
                                .map((n) => `export const ${n}=async()=>({});`)
                                .join('\n'),
                            loader: 'js',
                        };
                    });
                    b.onResolve({ filter: /^next\/(link|image|navigation)$/ }, ({ path }) => ({
                        path,
                        namespace: 'next',
                    }));
                    b.onLoad({ filter: /.*/, namespace: 'next' }, ({ path }) => ({
                        contents: path.endsWith('navigation')
                            ? `export const useRouter=()=>({push(){},refresh(){}}); export const usePathname=()=>'/fixture';`
                            : `import React from 'react'; export default props=>React.createElement('${path.endsWith('link') ? 'a' : 'img'}',props);`,
                        loader: 'jsx',
                        resolveDir: process.cwd(),
                    }));

                    b.onResolve(
                        { filter: /^@app\/components\/providers\/FeatureFlagsProvider$/ },
                        () => ({ path: 'flags', namespace: 'stub' }),
                    );
                    b.onResolve({ filter: /^@app\/hooks\/useCast$/ }, () => ({
                        path: 'cast',
                        namespace: 'stub',
                    }));
                    b.onResolve({ filter: /^@app\/app\/actions\/recipe-progress$/ }, () => ({
                        path: 'progress',
                        namespace: 'stub',
                    }));
                    b.onResolve({ filter: /^next\/dynamic$/ }, () => ({
                        path: 'dynamic',
                        namespace: 'stub',
                    }));
                    b.onLoad({ filter: /.*/, namespace: 'stub' }, ({ path }) => ({
                        contents:
                            path === 'flags'
                                ? `export const useFeatureFlag=()=>new URLSearchParams(location.search).has('lane');`
                                : path === 'cast'
                                  ? `export const useCast=()=>({castState:'connected',startCast(){},stopCast(){},sendMessage(m){window.castMessages??=[];window.castMessages.push(m)}});`
                                  : path === 'progress'
                                    ? `export const saveRecipeProgress=async()=>{}; export const deleteRecipeProgress=async()=>{};`
                                    : `import React,{lazy,Suspense} from 'react'; export default function dynamic(loader){const C=lazy(async()=>({default:await loader()}));return props=><Suspense fallback={null}><C {...props}/></Suspense>}`,
                        loader: 'jsx',
                        resolveDir: process.cwd(),
                    }));
                },
            },
        ],
    });
    server = createServer((req, res) => {
        if (req.url === '/app.js') {
            res.setHeader('Content-Type', 'application/javascript');
            res.end(result.outputFiles[0].text);
        } else
            res.end(
                '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>',
            );
    });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    url = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({
        headless: true,
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    });
});
after(async () => {
    await browser?.close();
    await new Promise((r) => server?.close(r) ?? r());
});
test('viewer portions scale descriptions, partial amounts and portalled details exactly once', async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(url);
    await page.getByRole('button', { name: 'Schmand, 200 g: Zutatendetails anzeigen' }).waitFor();
    await page.getByLabel('Testportionen').selectOption('10');
    const schmand = page.getByRole('button', { name: 'Schmand, 400 g: Zutatendetails anzeigen' });
    await schmand.waitFor({ timeout: 3000 });
    await page.waitForFunction(() => window.castMessages?.at(-1)?.servings === 10);
    await page.getByRole('button', { name: 'Wasser, 200 ml: Zutatendetails anzeigen' }).waitFor();
    await schmand.click();
    await page.getByLabel('Details zu Schmand').getByText('400 g', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Zutatendetails schließen' }).click();
    await page.getByRole('button', { name: 'Salz, 4 TL: Zutatendetails anzeigen' }).waitFor();
    await page.getByRole('button', { name: 'Salz: Zutatendetails anzeigen', exact: true }).click();
    await page.getByLabel('Details zu Salz').getByText('für die Creme', { exact: true }).waitFor();
    await page
        .getByLabel('Details zu Salz')
        .getByText('Menge nach Bedarf', { exact: true })
        .waitFor();
    await page.getByRole('button', { name: 'Zutatendetails schließen' }).click();
    await page.getByLabel('Testportionen').selectOption('5');
    await page.getByRole('button', { name: 'Schmand, 200 g: Zutatendetails anzeigen' }).waitFor();
    assert.ok((await page.locator('body').innerText()).includes('Wasser (100 ml)'));
    await page.close();
});

test('standalone mobile page uses initial servings and changes amounts without changing recipe data', async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(url + '/?standalone');
    await page.getByRole('button', { name: 'Schmand, 400 g: Zutatendetails anzeigen' }).waitFor();
    await page.getByLabel('Portionen', { exact: true }).fill('5');
    await page.getByRole('button', { name: 'Schmand, 200 g: Zutatendetails anzeigen' }).waitFor();
    await page.close();
});
test('lane cooking view shares quantities and details', async () => {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    await page.goto(url + '/?lane');
    await page.getByLabel('Testportionen').selectOption('10');
    await page.getByRole('button', { name: 'Schmand, 400 g: Zutatendetails anzeigen' }).waitFor();
    await page.close();
});
