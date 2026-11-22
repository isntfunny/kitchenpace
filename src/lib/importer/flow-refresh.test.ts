// Flow-only refresh: request building and evaluation of batch answers (KUC-115).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { contentText } from '@shared/prompt-cache';

import {
    buildRefreshRequest,
    evaluateRefreshEntry,
    fallbackMarkdown,
    restoreFlowBackup,
    staleIngredientRefs,
    type RefreshRecipe,
} from './flow-refresh';
import { FLOW_ONLY_SYSTEM_PROMPT } from './import-prompt';

const recipe: RefreshRecipe = {
    id: 'r1',
    title: 'Pfannkuchen',
    description: 'Dünne Pfannkuchen.',
    sourceUrl: 'https://x.test/pfannkuchen',
    ingredients: [
        { id: 'row-flour', name: 'Mehl', amount: '200', unit: 'g', notes: null },
        { id: 'row-milk', name: 'Milch', amount: '400', unit: 'ml', notes: 'zimmerwarm' },
    ],
    flowNodes: [
        {
            id: 'old-1',
            type: 'mixen',
            label: 'Teig rühren',
            description: '@[Mehl|200 g](row-flour) mit @[Milch](row-milk) verrühren.',
            duration: 5,
        },
    ],
};

const answer = (nodes: unknown[], edges: unknown[]) => ({
    customId: 'flow-r1',
    body: {
        choices: [{ message: { content: JSON.stringify({ nodes, edges }) } }],
        usage: {
            prompt_tokens: 3000,
            completion_tokens: 900,
            prompt_tokens_details: { cached_tokens: 1000 },
        },
    },
});

const goodNodes = [
    {
        id: 'start',
        type: 'start',
        label: "Los geht's!",
        description: 'Die Pfanne bereitstellen.',
        duration: null,
        ingredientIds: [],
    },
    {
        id: 'step-1',
        type: 'mixen',
        label: 'Teig rühren',
        description:
            'Das @[Mehl](ingredient-0) mit der @[Milch|400 ml](ingredient-1) glatt rühren.',
        duration: null,
        ingredientIds: ['ingredient-0', 'ingredient-1'],
    },
    {
        id: 'servieren',
        type: 'servieren',
        label: 'Servieren',
        description: 'Warm servieren.',
        duration: null,
        ingredientIds: [],
    },
];
const goodEdges = [
    { source: 'start', target: 'step-1' },
    { source: 'step-1', target: 'servieren' },
];

test('request: flow-only prompt, fixed ingredient list with temporary ids mapped to the rows', () => {
    const { body, request } = buildRefreshRequest(recipe, '# Seite', 'scrape');
    assert.equal(contentText(body.messages[0].content), FLOW_ONLY_SYSTEM_PROMPT);
    assert.match(
        contentText(body.messages[1].content),
        /ingredient-1: 400 ml Milch \(zimmerwarm\)/,
    );
    assert.deepEqual(request.idMap, { 'ingredient-0': 'row-flour', 'ingredient-1': 'row-milk' });
    assert.equal(request.customId, 'flow-r1');
});

test('fallback markdown: ingredient list and the previous flow as plain text', () => {
    const md = fallbackMarkdown(recipe);
    assert.match(md, /- 200 g Mehl\n- 400 ml Milch \(zimmerwarm\)/);
    assert.match(md, /1\. Teig rühren \(5 Minuten\): Mehl \(200 g\) mit Milch verrühren\./);
    assert.ok(!md.includes('@['));
});

test('valid answer: real row ids, derived ingredientIds, positions, changed', () => {
    const { request } = buildRefreshRequest(recipe, '# Seite', 'scrape');
    const proposal = evaluateRefreshEntry(request, answer(goodNodes, goodEdges), {
        flowNodes: recipe.flowNodes,
        flowEdges: [],
    });
    assert.equal(proposal.status, 'changed');
    const step = proposal.flowNodes!.find((n) => n.id === 'step-1')!;
    assert.equal(
        step.description,
        'Das @[Mehl](row-flour) mit der @[Milch|400 ml](row-milk) glatt rühren.',
    );
    assert.deepEqual(step.ingredientIds, ['row-flour', 'row-milk']);
    assert.ok(step.position && typeof step.position.x === 'number');
    assert.deepEqual(
        proposal.flowEdges!.map((e) => e.id),
        ['edge-1', 'edge-2'],
    );
    assert.deepEqual(proposal.usage, { input: 3000, cached: 1000, output: 900 });
    assert.deepEqual(staleIngredientRefs(proposal, new Set(['row-flour', 'row-milk'])), []);
    assert.deepEqual(staleIngredientRefs(proposal, new Set(['row-flour'])), ['row-milk']);

    // the same flow again is reported as unchanged
    const again = evaluateRefreshEntry(request, answer(goodNodes, goodEdges), {
        flowNodes: proposal.flowNodes!,
        flowEdges: proposal.flowEdges!,
    });
    assert.equal(again.status, 'unchanged');
});

test('invalid, unmentioned and failed answers are reported, not written', () => {
    const { request } = buildRefreshRequest(recipe, '# Seite', 'fallback');
    const broken = evaluateRefreshEntry(request, answer(goodNodes, goodEdges.slice(0, 1)), null);
    assert.equal(broken.status, 'invalid');
    assert.ok(broken.errors.some((e) => e.includes('keine ausgehende Kante')));

    const noMilk = goodNodes.map((n) =>
        n.id === 'step-1' ? { ...n, description: 'Das @[Mehl](ingredient-0) rühren.' } : n,
    );
    const unmentioned = evaluateRefreshEntry(request, answer(noMilk, goodEdges), null);
    assert.equal(unmentioned.status, 'invalid');
    assert.ok(unmentioned.errors.some((e) => e.includes('"Milch"')));

    assert.equal(
        evaluateRefreshEntry(request, { customId: 'flow-r1', error: 'HTTP 500' }, null).status,
        'failed',
    );
    assert.equal(evaluateRefreshEntry(request, undefined, null).status, 'failed');
});

test('unknown mention id: accepted, becomes plain text with a warning', () => {
    const { request } = buildRefreshRequest(recipe, '# Seite', 'scrape');
    const extra = goodNodes.map((n) =>
        n.id === 'servieren' ? { ...n, description: 'Mit @[Zucker](ingredient-5) servieren.' } : n,
    );
    const proposal = evaluateRefreshEntry(request, answer(extra, goodEdges), null);
    assert.equal(proposal.status, 'changed');
    assert.equal(
        proposal.flowNodes!.find((n) => n.id === 'servieren')!.description,
        'Mit Zucker servieren.',
    );
    assert.ok(proposal.warnings.length >= 1);
});

test('ingredient added since the batch: proposal is stale', () => {
    const { request } = buildRefreshRequest(recipe, '# Seite', 'scrape');
    const proposal = evaluateRefreshEntry(request, answer(goodNodes, goodEdges), null);
    assert.deepEqual(proposal.ingredientRowIds, ['row-flour', 'row-milk']);
    assert.deepEqual(
        staleIngredientRefs(proposal, new Set(['row-flour', 'row-milk', 'row-sugar'])),
        ['row-sugar'],
    );
});

test('incomplete mention without id after the last attempt: becomes plain text', () => {
    const { request } = buildRefreshRequest(recipe, '# Seite', 'scrape');
    const nodes = goodNodes.map((n) =>
        n.id === 'servieren'
            ? { ...n, description: 'Mit @[Butter] und @[Zucker|1 TL] servieren.' }
            : n,
    );
    const proposal = evaluateRefreshEntry(request, answer(nodes, goodEdges), null);
    assert.equal(proposal.status, 'changed');
    const serve = proposal.flowNodes!.find((n) => n.id === 'servieren')!;
    assert.equal(serve.description, 'Mit Butter und Zucker (1 TL) servieren.');
    assert.deepEqual(serve.ingredientIds, []);
    assert.ok(proposal.warnings.some((w) => w.includes('@[Butter]')));
});

test('rollback: recipes without a flow get null back, a failing recipe does not stop the rest', async () => {
    const written: unknown[] = [];
    const result = await restoreFlowBackup(
        [
            { id: 'a', flowNodes: [{ id: 'n' }], flowEdges: [] },
            { id: 'b', flowNodes: null, flowEdges: null },
            { id: 'c', flowNodes: [], flowEdges: [] },
        ],
        async (entry) => {
            if (entry.id === 'a') throw new Error('Datensatz fehlt');
            written.push(entry);
        },
    );
    assert.deepEqual(result.restored, ['b', 'c']);
    assert.deepEqual(result.failed, [{ id: 'a', error: 'Datensatz fehlt' }]);
    assert.deepEqual(written[0], { id: 'b', flowNodes: null, flowEdges: null });
});
