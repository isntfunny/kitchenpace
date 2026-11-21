// Validation and the single repair round of the import (KUC-115). OpenAI is a fake.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type OpenAI from 'openai';

import {
    buildFlowOnlyRequestBody,
    buildImportRequestBody,
    FLOW_ONLY_SYSTEM_PROMPT,
    IMPORT_SYSTEM_PROMPT,
    type ChatRequestBody,
} from './import-prompt';
import { evaluateFlowOnlyContent, evaluateImportContent } from './import-validation';
import { runImportWithRepair, describeParseError, type ModelCall } from './openai-client';

const usage = { prompt_tokens: 1000, completion_tokens: 200, total_tokens: 1200 };

function recipe(overrides: Record<string, unknown> = {}) {
    return {
        ingredients: [
            { id: 'ingredient-0', name: 'Mehl', amount: 500, unit: 'g', notes: null },
            { id: 'ingredient-1', name: 'Wasser', amount: 300, unit: 'ml', notes: null },
        ],
        title: 'Brot',
        description: 'Ein einfaches Brot aus Mehl und Wasser.',
        categories: ['Backen'],
        tags: ['Vegan'],
        difficulty: 'Einfach',
        prepTime: 15,
        cookTime: 40,
        servings: 1,
        imageUrl: null,
        nodes: [
            {
                id: 'start',
                type: 'start',
                label: "Los geht's!",
                description: 'Den Ofen vorheizen.',
                duration: null,
                ingredientIds: [],
            },
            {
                id: 'step-1',
                type: 'mixen',
                label: 'Teig kneten',
                description: 'Das @[Mehl](ingredient-0) mit dem @[Wasser](ingredient-1) verkneten.',
                duration: null,
                ingredientIds: ['ingredient-0', 'ingredient-1'],
            },
            {
                id: 'servieren',
                type: 'servieren',
                label: 'Servieren',
                description: 'Das Brot backen und servieren.',
                duration: 40,
                ingredientIds: [],
            },
        ],
        edges: [
            { source: 'start', target: 'step-1' },
            { source: 'step-1', target: 'servieren' },
        ],
        ...overrides,
    };
}

function fakeCalls(answers: string[]) {
    const bodies: ChatRequestBody[] = [];
    const call: ModelCall = async (body) => {
        bodies.push(body);
        const content = answers[bodies.length - 1];
        return { content, usage: usage as OpenAI.CompletionUsage, raw: { content } };
    };
    return { call, bodies };
}

const body = buildImportRequestBody({ markdown: '# Brot', sourceUrl: 'https://x.test' });

test('import body: system prompt, tag list and known ingredients as context, strict schema', () => {
    const withContext = buildImportRequestBody({
        markdown: '# Brot',
        sourceUrl: 'https://x.test',
        context: { availableTags: ['Vegan', 'Winter'], topIngredients: ['Mehl'] },
    });
    assert.equal(withContext.messages[0].content, IMPORT_SYSTEM_PROMPT);
    assert.match(String(withContext.messages[1].content), /<tag_liste>[\s\S]*Vegan\nWinter/);
    assert.match(String(withContext.messages[1].content), /<bekannte_zutaten>\nMehl/);
    assert.match(String(withContext.messages[2].content), /<rezept>\n# Brot\n<\/rezept>/);
    const format = withContext.response_format as unknown as {
        json_schema: { strict: boolean; schema: { required: string[] } };
    };
    assert.equal(format.json_schema.strict, true);
    assert.equal(format.json_schema.schema.required[0], 'ingredients');
    for (const rule of [
        'Infinitiv',
        '@[Butter|30 g](ingredient-2)',
        '"Backen" beschreibt eine Technik',
        'Ruhe-, Kühl-',
    ])
        assert.ok(IMPORT_SYSTEM_PROMPT.includes(rule), rule);
});

test('flow-only body shares the flow rules and lists the fixed ingredients', () => {
    const flow = buildFlowOnlyRequestBody({
        markdown: 'Text',
        ingredients: [
            { id: 'ingredient-0', name: 'Butter', amount: '30', unit: 'g', notes: 'weich' },
        ],
    });
    assert.equal(flow.messages[0].content, FLOW_ONLY_SYSTEM_PROMPT);
    assert.equal(
        flow.messages[1].content,
        '<zutaten>\ningredient-0: 30 g Butter (weich)\n</zutaten>\n\n<rezept>\nText\n</rezept>',
    );
    const rulesStart = IMPORT_SYSTEM_PROMPT.indexOf('# Wofür der Ablauf da ist');
    assert.ok(FLOW_ONLY_SYSTEM_PROMPT.endsWith(IMPORT_SYSTEM_PROMPT.slice(rulesStart)));
    assert.ok(!FLOW_ONLY_SYSTEM_PROMPT.includes('# Tags'));
});

test('valid answer: one call, no repair', async () => {
    const { call, bodies } = fakeCalls([JSON.stringify(recipe())]);
    const result = await runImportWithRepair(body, call, 'https://x.test');
    assert.equal(result.success, true);
    assert.equal(bodies.length, 1);
    assert.equal(result.success && result.metadata.attempts, 1);
});

test('structure error goes back to the model once; the corrected answer is used', async () => {
    const broken = recipe({ edges: [{ source: 'start', target: 'step-1' }] });
    const { call, bodies } = fakeCalls([JSON.stringify(broken), JSON.stringify(recipe())]);
    const repairs: string[][] = [];
    const result = await runImportWithRepair(body, call, 'https://x.test', (p) => repairs.push(p));
    assert.equal(result.success, true);
    assert.equal(bodies.length, 2);
    const messages = bodies[1].messages;
    assert.equal(messages.at(-2)?.role, 'assistant');
    assert.equal(messages.at(-2)?.content, JSON.stringify(broken));
    assert.match(String(messages.at(-1)?.content), /keine ausgehende Kante/);
    assert.equal(repairs.length, 1);
    if (result.success) {
        assert.equal(result.metadata.attempts, 2);
        assert.equal(result.metadata.inputTokens, 2000);
        assert.equal(result.metadata.outputTokens, 400);
    }
});

test('still invalid after the repair round: FAILED with Zod details, no third call', async () => {
    const { call, bodies } = fakeCalls(['{"title": 1}', '{"title": 2}', 'never']);
    const result = await runImportWithRepair(body, call, 'https://x.test');
    assert.equal(bodies.length, 2);
    assert.equal(result.success, false);
    if (!result.success) {
        assert.equal(result.error.type, 'VALIDATION_ERROR');
        const message = describeParseError(result.error);
        assert.match(message, /Korrekturrunde/);
        assert.match(message, /ingredients: /);
        assert.equal(result.metadata?.attempts, 2);
    }
});

test('an ingredient that is never mentioned is an error after the repair round', async () => {
    const unmentioned = recipe();
    unmentioned.nodes[1].description = 'Das @[Mehl](ingredient-0) verkneten.';
    const { call } = fakeCalls([JSON.stringify(unmentioned), JSON.stringify(unmentioned)]);
    const result = await runImportWithRepair(body, call, 'https://x.test');
    assert.equal(result.success, false);
    if (!result.success) {
        assert.equal(result.error.type, 'MENTION_VALIDATION_ERROR');
        assert.match(
            describeParseError(result.error),
            /Zutat "Wasser" \(ingredient-1\) wird in keinem Schritt erwähnt/,
        );
    }
});

test('an unknown mention id triggers the repair round, then is accepted as a warning', async () => {
    const unknown = recipe();
    unknown.nodes[1].description =
        'Das @[Mehl](ingredient-0) mit dem @[Wasser](ingredient-1) und @[Salz](ingredient-9) verkneten.';
    const { call, bodies } = fakeCalls([JSON.stringify(unknown), JSON.stringify(unknown)]);
    const result = await runImportWithRepair(body, call, 'https://x.test');
    assert.equal(bodies.length, 2);
    assert.equal(result.success, true);
    if (result.success) assert.match(result.metadata.warnings[0], /ingredient-9/);
});

test('flow-only evaluation checks mentions against the fixed ingredient list', () => {
    const { nodes, edges } = recipe();
    const fixed = [
        { id: 'ingredient-0', name: 'Mehl' },
        { id: 'ingredient-1', name: 'Wasser' },
        { id: 'ingredient-2', name: 'Hefe' },
    ];
    const result = evaluateFlowOnlyContent(JSON.stringify({ nodes, edges }), fixed);
    assert.equal(result.ok, false);
    assert.ok(!result.ok && result.details.some((d) => d.message.includes('"Hefe"')));
    assert.equal(
        evaluateFlowOnlyContent(JSON.stringify({ nodes, edges }), fixed.slice(0, 2)).ok,
        true,
    );
    assert.equal(evaluateImportContent('').ok, false);
});
