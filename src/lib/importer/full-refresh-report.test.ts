// Full re-import dry run (KUC-115): is the source still the same recipe, and
// the report section of the cases to check.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { FullRefreshProposal, FullRefreshStatus } from './full-refresh';
import {
    applySourceCheck,
    buildFullReport,
    isStapleIngredient,
    judgeSource,
    renderFullReportMarkdown,
    SOURCE_MATCH_THRESHOLD,
    sourceSimilarity,
    titleStems,
} from './full-refresh-report';
import type { AnalyzedRecipe } from './transform';

const proposal = (recipeId: string, status: FullRefreshStatus): FullRefreshProposal => ({
    recipeId,
    title: 'Lauchsuppe',
    sourceUrl: `https://x.test/${recipeId}`,
    status,
    attempt: 1,
    recipe: {
        title: 'Lauchsuppe',
        ingredients: [],
        flowNodes: [],
        tags: [],
    } as unknown as AnalyzedRecipe,
    warnings: [],
    errors: [],
});

const ing = (id: string | null, name: string) => ({ id, name });

test('basic ingredients do not count for the source check', () => {
    for (const name of [
        'Salz',
        'Pfeffer',
        'Olivenöl',
        'Öl',
        'Zwiebel',
        'Knoblauchzehe',
        'Butter',
        'Zucker',
        'Wasser',
        'Mehl',
        'Ei',
        'Eier (Größe M)',
        'Milch',
    ])
        assert.ok(isStapleIngredient(name), name);
    for (const name of ['Lauch', 'Frühlingszwiebel', 'Zuckerschoten', 'Speck', 'Eisbergsalat'])
        assert.ok(!isStapleIngredient(name), name);
});

test('source check: title stems and distinctive ingredients decide same, review or mismatch', () => {
    assert.deepEqual(
        [...titleStems('Omas einfache Zwiebel-Lauch-Suppe mit Speck')],
        ['omas', 'zwieb', 'lauch', 'suppe', 'speck'],
    );
    assert.equal(SOURCE_MATCH_THRESHOLD, 0.3);
    const soup = [ing('leek', 'Lauch'), ing('bacon', 'Speck'), ing('salt', 'Salz')];
    const same = sourceSimilarity(
        { title: 'Lauchsuppe', ingredients: soup },
        { title: 'Französische Lauchsuppe', ingredients: [...soup, ing(null, 'Thymian')] },
    );
    assert.equal(same.ingredients, 1);
    assert.equal(judgeSource(same), 'same');

    // Shared basics alone do not make two recipes alike
    const basicsOnly = sourceSimilarity(
        { title: 'Lauchsuppe', ingredients: [...soup, ing('onion', 'Zwiebel'), ing('oil', 'Öl')] },
        {
            title: 'Schokoladenkuchen',
            ingredients: [ing('salt', 'Salz'), ing('onion', 'Zwiebel'), ing('oil', 'Öl')],
        },
    );
    assert.deepEqual(basicsOnly, { title: 0, ingredients: 0 });
    assert.equal(judgeSource(basicsOnly), 'mismatch');
    // only basics stored: nothing to compare, the title decides
    assert.equal(
        sourceSimilarity(
            { title: 'Pfannkuchen', ingredients: [ing('flour', 'Mehl'), ing('egg', 'Ei')] },
            { title: 'Pfannkuchen', ingredients: [] },
        ).ingredients,
        null,
    );

    const proposal = (title: string): FullRefreshProposal => ({
        recipeId: 'r1',
        title: 'Lauchsuppe',
        sourceUrl: 'https://x.test/a',
        status: 'ready',
        attempt: 1,
        recipe: { title } as AnalyzedRecipe,
        warnings: [],
        errors: [],
    });
    const before = new Map([['r1', { title: 'Lauchsuppe', ingredients: soup }]]);
    // a 404 / start page parsed as some other recipe
    const [other] = applySourceCheck(
        [proposal('Schokoladenkuchen')],
        before,
        new Map([['r1', [ing('sugar', 'Zucker'), ing('choc', 'Schokolade'), ing(null, 'Kakao')]]]),
    );
    assert.equal(other.status, 'mismatch');
    assert.deepEqual(other.sourceCheck, { title: 0, ingredients: 0 });
    assert.match(
        other.warnings[0],
        /Quelle passt nicht mehr: Titel 0 %, Zutaten 0 % gemeinsam \(ohne Grundzutaten, Schwelle 30 %\)/,
    );
    // title changed, ingredients still match: written only after a look
    const [renamed] = applySourceCheck(
        [proposal('Gratinierte Wintersuppe')],
        before,
        new Map([['r1', soup]]),
    );
    assert.equal(renamed.status, 'review');
    assert.match(renamed.warnings[0], /^Titel weicht ab, bitte prüfen: Titel 0 %, Zutaten 100 %/);
    // similar title: ready, the similarity is kept for the report
    const [kept] = applySourceCheck(
        [proposal('Lauchsuppe mit Speck')],
        before,
        new Map([['r1', soup]]),
    );
    assert.equal(kept.status, 'ready');
    assert.deepEqual(kept.sourceCheck, { title: 1, ingredients: 1 });
    // no stored ingredients: the title decides
    const [noIngredients] = applySourceCheck(
        [proposal('Schokoladenkuchen')],
        new Map([['r1', { title: 'Lauchsuppe', ingredients: [] }]]),
        new Map(),
    );
    assert.equal(noIngredients.status, 'mismatch');
});

test('report: review and mismatch cases in their own section, least similar title first', () => {
    const base = proposal('ok', 'ready');
    const flagged = (
        recipeId: string,
        status: 'review' | 'mismatch',
        title: number,
    ): FullRefreshProposal => ({
        ...base,
        recipeId,
        status,
        sourceCheck: { title, ingredients: status === 'review' ? 0.8 : 0 },
    });
    const report = buildFullReport({
        batchId: 'b',
        proposals: [
            { ...base, recipeId: 'ok', sourceCheck: { title: 1, ingredients: 1 } },
            flagged('rev', 'review', 0.25),
            flagged('mis', 'mismatch', 0),
            flagged('rev0', 'review', 0.1),
        ],
        skipped: [],
        current: new Map(),
        newIngredients: new Map(),
    });
    assert.equal(report.summary.review, 2);
    assert.equal(report.summary.mismatch, 1);
    const md = renderFullReportMarkdown(report);
    const section = md.slice(md.indexOf('## Quelle prüfen (3)'), md.indexOf('## Alle Rezepte'));
    const order = [...section.matchAll(/^\| (\w+) \| (review|mismatch) \| (\d+ %)/gm)].map(
        (m) => `${m[1]}:${m[3]}`,
    );
    assert.deepEqual(order, ['mis:0 %', 'rev0:10 %', 'rev:25 %']);
    assert.match(section, /\| rev \| review \| 25 % \| 80 % \|/);
});
