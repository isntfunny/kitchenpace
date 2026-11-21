// Full re-import: selection, request, evaluation, repair round, report (KUC-115).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    batchCostUsd,
    batchNotEvaluable,
    buildFullRefreshRequest,
    buildFullRepairRequest,
    checkScrapedSource,
    evaluateFullRefreshEntry,
    fullRefreshWhere,
    isFullBackup,
    mergeRepairProposals,
    repairCandidates,
    writableProposals,
    type FullRefreshProposal,
} from './full-refresh';
import {
    applySourceCheck,
    buildFullReport,
    renderFullReportMarkdown,
    SOURCE_MATCH_THRESHOLD,
    sourceSimilarity,
    titleStems,
} from './full-refresh-report';
import { importedFlowProblems } from './import-flow-binding';
import { IMPORT_SYSTEM_PROMPT } from './import-prompt';

const recipe = { id: 'r1', title: 'Pfannkuchen alt', sourceUrl: 'https://x.test/pfannkuchen' };
const context = { availableTags: ['Schnell', 'Vegetarisch'], topIngredients: ['Mehl'] };

const imported = (overrides: Record<string, unknown> = {}) => ({
    ingredients: [
        { id: 'ingredient-0', name: 'Mehl', amount: 200, unit: 'g', notes: null },
        { id: 'ingredient-1', name: 'Milch', amount: 400, unit: 'ml', notes: 'zimmerwarm' },
    ],
    title: 'Pfannkuchen',
    description: 'Dünne Pfannkuchen für jeden Tag.',
    categories: ['Hauptgericht'],
    tags: ['Vegetarisch', 'Schnell'],
    difficulty: 'Einfach',
    prepTime: 10,
    cookTime: 15,
    servings: 2,
    imageUrl: null,
    nodes: [
        {
            id: 'start',
            type: 'start',
            label: "Los geht's!",
            description: 'Pfanne bereitstellen.',
            duration: null,
            ingredientIds: [],
        },
        {
            id: 'step-1',
            type: 'mixen',
            label: 'Teig rühren',
            description: 'Das @[Mehl](ingredient-0) mit der @[Milch|400 ml](ingredient-1) rühren.',
            duration: 5,
            ingredientIds: [],
        },
        {
            id: 'servieren',
            type: 'servieren',
            label: 'Servieren',
            description: 'Warm servieren.',
            duration: null,
            ingredientIds: [],
        },
    ],
    edges: [
        { source: 'start', target: 'step-1' },
        { source: 'step-1', target: 'servieren' },
    ],
    ...overrides,
});

const entry = (customId: string, content: unknown) => ({
    customId,
    body: {
        choices: [{ message: { content: JSON.stringify(content) } }],
        usage: {
            prompt_tokens: 10_000,
            completion_tokens: 2_000,
            prompt_tokens_details: { cached_tokens: 4_000 },
        },
    },
});

test('selection: admin authors, non-empty sourceUrl, optional id filter; edits do not matter', () => {
    assert.deepEqual(fullRefreshWhere({}), {
        sourceUrl: { not: null },
        NOT: { sourceUrl: '' },
        author: { role: 'admin' },
    });
    assert.deepEqual(fullRefreshWhere({ ids: ['a', 'b'] }).id, { in: ['a', 'b'] });
    assert.ok(!('updatedAt' in fullRefreshWhere({})));
});

test('scraped source: too short or missing is a skip reason, never a fallback', () => {
    assert.equal(checkScrapedSource('x'.repeat(300)), null);
    assert.equal(checkScrapedSource('  kurz  '), 'Seite zu kurz (4 Zeichen)');
    assert.equal(checkScrapedSource(undefined), 'Seite zu kurz (0 Zeichen)');
});

test('request: same prompt and context as the URL import', () => {
    const { body, request } = buildFullRefreshRequest(
        recipe,
        { markdown: '# Seite', imageUrl: 'https://x.test/bild.jpg' },
        context,
    );
    assert.equal(body.messages[0].content, IMPORT_SYSTEM_PROMPT);
    assert.match(String(body.messages[1].content), /<tag_liste>[\s\S]*Vegetarisch/);
    assert.match(String(body.messages[2].content), /Quelle: https:\/\/x\.test\/pfannkuchen/);
    assert.deepEqual(request, {
        customId: 'full-r1',
        recipeId: 'r1',
        title: 'Pfannkuchen alt',
        sourceUrl: recipe.sourceUrl,
        scrapedImageUrl: 'https://x.test/bild.jpg',
        markdownLength: 7,
        attempt: 1,
    });
});

test('valid answer: transformed like the import, scraped image as fallback, source kept', () => {
    const { request } = buildFullRefreshRequest(
        recipe,
        { markdown: '# Seite', imageUrl: 'https://x.test/bild.jpg' },
        context,
    );
    const p = evaluateFullRefreshEntry(request, entry('full-r1', imported()));
    assert.equal(p.status, 'ready');
    assert.equal(p.recipe!.title, 'Pfannkuchen');
    assert.equal(p.recipe!.sourceUrl, recipe.sourceUrl);
    assert.equal(p.recipe!.imageUrl, 'https://x.test/bild.jpg');
    assert.deepEqual(p.recipe!.categoryIds, ['hauptgericht']);
    assert.equal(p.recipe!.difficulty, 'EASY');
    assert.equal(p.recipe!.ingredients.length, 2);
    const step = p.recipe!.flowNodes.find((n) => n.id === 'step-1')!;
    assert.deepEqual(step.ingredientIds, [
        p.recipe!.ingredients[0].id,
        p.recipe!.ingredients[1].id,
    ]);
    assert.deepEqual(p.usage, { input: 10_000, cached: 4_000, output: 2_000 });
    assert.ok(!('warnings' in p.recipe!));
});

test('invalid first answer keeps its text for the repair round; second round accepts soft problems', () => {
    const { request, body } = buildFullRefreshRequest(recipe, { markdown: '# Seite' }, context);
    const unknownId = imported({
        nodes: imported().nodes.map((n) =>
            n.id === 'step-1'
                ? {
                      ...n,
                      description:
                          'Das @[Mehl](ingredient-0) mit der @[Milch](ingredient-1) und @[Zucker](ingredient-9) rühren.',
                  }
                : n,
        ),
    });
    const first = evaluateFullRefreshEntry(request, entry('full-r1', unknownId));
    assert.equal(first.status, 'invalid');
    assert.ok(first.content?.includes('ingredient-9'));
    assert.deepEqual(repairCandidates([first]), [first]);

    const repair = buildFullRepairRequest(request, body, first);
    assert.equal(repair.request.customId, 'full-r1-repair');
    assert.equal(repair.request.attempt, 2);
    const last = repair.body.messages.at(-1)!;
    assert.match(String(last.content), /ingredient-9/);
    assert.equal(repair.body.messages.at(-2)!.role, 'assistant');

    // the model repeats the soft problem: accepted, mention becomes text
    const second = evaluateFullRefreshEntry(repair.request, entry('full-r1-repair', unknownId));
    assert.equal(second.status, 'ready');
    assert.ok(second.warnings.length > 0);
    assert.ok(!second.recipe!.flowNodes[1].description.includes('ingredient-9'));

    const merged = mergeRepairProposals([first], [second]);
    assert.equal(merged[0].status, 'ready');
    assert.deepEqual(merged[0].usage, { input: 20_000, cached: 8_000, output: 4_000 });
});

test('hard problems stay invalid after the repair round; missing answers fail', () => {
    const { request } = buildFullRefreshRequest(recipe, { markdown: '# Seite' }, context);
    const broken = imported({ edges: [] });
    const second = evaluateFullRefreshEntry(
        { ...request, attempt: 2 },
        entry('full-r1-repair', broken),
    );
    assert.equal(second.status, 'invalid');
    assert.deepEqual(repairCandidates([second]), []);
    assert.equal(evaluateFullRefreshEntry(request, undefined).status, 'failed');
    assert.equal(
        evaluateFullRefreshEntry(request, { customId: 'full-r1', error: 'HTTP 500' }).status,
        'failed',
    );
});

test('failed or missing first answers are sent once more, unchanged; not a third time', () => {
    const { request, body } = buildFullRefreshRequest(recipe, { markdown: '# Seite' }, context);
    const apiError = evaluateFullRefreshEntry(request, { customId: 'full-r1', error: 'HTTP 500' });
    const missing = evaluateFullRefreshEntry(request, undefined);
    assert.deepEqual(repairCandidates([apiError, missing]), [apiError, missing]);

    const retry = buildFullRepairRequest(request, body, apiError);
    assert.deepEqual(retry.body, body, 'no repair message without an answer');
    assert.equal(retry.request.customId, 'full-r1-repair');
    assert.equal(retry.request.attempt, 2);

    const second = evaluateFullRefreshEntry(retry.request, entry('full-r1-repair', imported()));
    assert.equal(second.status, 'ready');
    assert.equal(mergeRepairProposals([apiError], [second])[0].status, 'ready');

    const failedAgain = evaluateFullRefreshEntry(retry.request, undefined);
    assert.deepEqual(repairCandidates([failedAgain]), []);
});

test('cost at batch price (half): uncached, cached and output tokens', () => {
    // (6000 * 2 + 4000 * 0.1 + 2000 * 10) / 2 / 1e6
    assert.equal(
        batchCostUsd([{ input: 10_000, cached: 4_000, output: 2_000 }, undefined]),
        0.0162,
    );
});

test('report: old → new per recipe, skipped sources, distinct new ingredients, totals', () => {
    const { request } = buildFullRefreshRequest(recipe, { markdown: '# Seite' }, context);
    const ready = evaluateFullRefreshEntry(request, entry('full-r1', imported()));
    const failed: FullRefreshProposal = {
        recipeId: 'r2',
        title: 'Suppe',
        sourceUrl: 'https://x.test/suppe',
        status: 'failed',
        attempt: 1,
        warnings: [],
        errors: ['keine Antwort im Batch'],
    };
    const report = buildFullReport({
        batchId: 'batch_1',
        proposals: [ready, failed],
        skipped: [
            {
                recipeId: 'r3',
                title: 'Kuchen',
                sourceUrl: 'https://x.test/kuchen',
                reason: 'HTTP 403',
            },
        ],
        current: new Map([
            [
                'r1',
                {
                    title: 'Pfannkuchen alt',
                    ingredientCount: 3,
                    ingredientIds: [],
                    nodeCount: 5,
                    tags: ['Alt'],
                },
            ],
            [
                'r3',
                { title: 'Kuchen', ingredientCount: 6, ingredientIds: [], nodeCount: 7, tags: [] },
            ],
        ]),
        newIngredients: new Map([
            ['r1', ['Dinkelmehl', 'Hafermilch']],
            ['r9', ['dinkelmehl']],
        ]),
        now: new Date('2026-11-21T12:00:00Z'),
    });
    assert.deepEqual(
        { ...report.summary, costUsd: Number(report.summary.costUsd.toFixed(4)) },
        {
            recipes: 3,
            ready: 1,
            mismatch: 0,
            invalid: 0,
            failed: 1,
            skipped: 1,
            repairable: 1,
            costUsd: 0.0162,
            newIngredients: ['dinkelmehl', 'Hafermilch'],
        },
    );
    const r1 = report.rows.find((r) => r.recipeId === 'r1')!;
    assert.deepEqual(r1.title, { old: 'Pfannkuchen alt', new: 'Pfannkuchen' });
    assert.deepEqual(r1.ingredients, { old: 3, new: 2 });
    assert.deepEqual(r1.nodes, { old: 5, new: 3 });
    // only tags the save keeps; the dropped one is a note
    assert.deepEqual(r1.tags.new, ['Vegetarisch']);
    assert.ok(r1.notes.includes('Tags verworfen (nicht in der Liste): Schnell'));
    const r3 = report.rows.find((r) => r.recipeId === 'r3')!;
    assert.equal(r3.status, 'skipped');
    assert.deepEqual(r3.notes, ['HTTP 403']);

    const md = renderFullReportMarkdown(report);
    assert.match(
        md,
        /bereit: 1 · Quelle passt nicht: 0 · ungültig: 0 · fehlgeschlagen: 1 · erneut zu senden: 1 · übersprungen: 1/,
    );
    assert.match(md, /Neu anzulegende Zutaten: 2/);
    assert.match(md, /\| r1 \| ready \| .* \| Pfannkuchen alt → Pfannkuchen \| 3 → 2 \| 5 → 3 \|/);
});

test('backup kind: full backups are recognised, flow-only ones are not', () => {
    assert.ok(isFullBackup({ kind: 'full', createdAt: 'x', recipes: [] }));
    assert.ok(!isFullBackup({ createdAt: 'x', recipes: [] }));
    assert.ok(!isFullBackup(null));
});

test('ready proposals are saveable: their flow binds without problems', () => {
    // The evaluation runs the save's mention binding with placeholder row ids
    // (import-flow-binding.test.ts covers the problems it reports).
    const p = evaluateReady();
    assert.equal(p.status, 'ready');
    assert.deepEqual(importedFlowProblems(p.recipe!), []);
});

test('source check: title stems and catalogue ingredients, both below the threshold = mismatch', () => {
    assert.deepEqual(
        [...titleStems('Omas einfache Zwiebel-Lauch-Suppe mit Speck')],
        ['omas', 'zwieb', 'lauch', 'suppe', 'speck'],
    );
    assert.equal(SOURCE_MATCH_THRESHOLD, 0.3);
    const same = sourceSimilarity(
        { title: 'Zwiebelsuppe', ingredientIds: ['onion', 'water'] },
        { title: 'Französische Zwiebelsuppe', ingredientIds: ['onion', 'water', null] },
    );
    assert.equal(same.ingredients, 1);

    const proposal = (title: string): FullRefreshProposal => ({
        recipeId: 'r1',
        title: 'Zwiebelsuppe',
        sourceUrl: 'https://x.test/a',
        status: 'ready',
        attempt: 1,
        recipe: { ...evaluateReady().recipe!, title },
        warnings: [],
        errors: [],
    });
    const before = new Map([['r1', { title: 'Zwiebelsuppe', ingredientIds: ['onion', 'water'] }]]);
    // a 404 / start page parsed as some other recipe
    const [other] = applySourceCheck(
        [proposal('Schokoladenkuchen')],
        before,
        new Map([['r1', ['sugar', 'chocolate', null]]]),
    );
    assert.equal(other.status, 'mismatch');
    assert.match(other.warnings[0], /Titel 0 %, Zutaten 0 % gemeinsam \(Schwelle 30 %\)/);
    // title changed, ingredients still match: not a mismatch
    const [renamed] = applySourceCheck(
        [proposal('Gratinierte Suppe')],
        before,
        new Map([['r1', ['onion', 'water']]]),
    );
    assert.equal(renamed.status, 'ready');
    // no stored ingredients: the title decides
    const [noIngredients] = applySourceCheck(
        [proposal('Schokoladenkuchen')],
        new Map([['r1', { title: 'Zwiebelsuppe', ingredientIds: [] }]]),
        new Map(),
    );
    assert.equal(noIngredients.status, 'mismatch');
});

test('apply writes mismatches only with --include-mismatch or explicit --ids', () => {
    const ready = { ...evaluateReady(), recipeId: 'a' };
    const mismatch: FullRefreshProposal = { ...evaluateReady(), recipeId: 'b', status: 'mismatch' };
    const invalid: FullRefreshProposal = { ...evaluateReady(), recipeId: 'c', status: 'invalid' };
    const all = [ready, mismatch, invalid];
    const ids = (list: FullRefreshProposal[]) => list.map((p) => p.recipeId);
    assert.deepEqual(ids(writableProposals(all, {})), ['a']);
    assert.deepEqual(ids(writableProposals(all, { includeMismatch: true })), ['a', 'b']);
    assert.deepEqual(ids(writableProposals(all, { ids: ['b', 'c'] })), ['b']);
});

function evaluateReady(): FullRefreshProposal {
    const { request } = buildFullRefreshRequest(recipe, { markdown: '# Seite' }, context);
    return evaluateFullRefreshEntry(request, entry('full-r1', imported()));
}

test('batches: running ones wait; finished ones with a file are evaluated even if expired', () => {
    assert.equal(batchNotEvaluable({ status: 'in_progress' }), 'läuft noch (in_progress)');
    assert.equal(batchNotEvaluable({ status: 'completed', output_file_id: 'f' }), null);
    assert.equal(batchNotEvaluable({ status: 'expired', output_file_id: 'f' }), null);
    assert.equal(batchNotEvaluable({ status: 'cancelled', error_file_id: 'e' }), null);
    assert.equal(
        batchNotEvaluable({ status: 'failed', output_file_id: null }),
        'endete mit failed ohne Ausgabedatei',
    );
});
