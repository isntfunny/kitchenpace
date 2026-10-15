import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    repairIngredientMentions,
    removeIngredientReferences,
    bindFlowToExistingIngredients,
} from './recipe-mentions';

const milk = {
    id: 'row-milk',
    ingredientId: 'catalogue-milk',
    name: 'Milch',
    amount: '100',
    unit: 'ml',
};
const water = {
    id: 'row-water',
    ingredientId: 'catalogue-water',
    name: 'Wasser',
    amount: '250',
    unit: 'ml',
};

test('maps source IDs independently of ingredient order and keeps amount overrides', () => {
    const result = repairIngredientMentions(
        [
            {
                id: 'step',
                description: '@[Milch|50 ml](imported_4) und @[Wasser](imported_3)',
                ingredientIds: ['imported_4', 'imported_3'],
            },
        ],
        [water, milk],
        new Map([
            ['imported_4', milk.id],
            ['imported_3', water.id],
        ]),
    );
    assert.equal(result.nodes[0].description, '@[Milch|50 ml](row-milk) und @[Wasser](row-water)');
    assert.deepEqual(result.nodes[0].ingredientIds, ['row-milk', 'row-water']);
    assert.deepEqual(result.issues, []);
});

test('repairs legacy names without trusting shifted imported indexes', () => {
    const result = repairIngredientMentions(
        [{ id: 'step', description: '@[Wasser](imported_4)' }],
        [milk, water],
    );
    assert.equal(result.nodes[0].description, '@[Wasser](row-water)');
});

test('never assigns the dough salt quantity to a second legacy salt reference', () => {
    const result = repairIngredientMentions(
        [
            { id: 'dough', description: '@[Salz](imported_2)' },
            { id: 'cream', description: '@[Salz](imported_11)' },
        ],
        [{ id: 'salt', ingredientId: 'catalogue-salt', name: 'Salz', amount: '2', unit: 'TL' }],
    );
    assert.equal(result.nodes[1].description, '@[Salz](imported_11)');
    assert.ok(result.issues.some((i) => i.reason === 'multiple-source-ids'));
});

test('a later migration cannot reuse dough salt after its reference has already been repaired', () => {
    const result = repairIngredientMentions(
        [
            { id: 'dough', description: '@[Salz](salt)' },
            { id: 'cream', description: '@[Salz](imported_11)' },
        ],
        [{ id: 'salt', ingredientId: 'catalogue-salt', name: 'Salz', amount: '2', unit: 'TL' }],
    );
    assert.equal(result.nodes[1].description, '@[Salz](imported_11)');
    assert.ok(result.issues.some((i) => i.reason === 'multiple-source-ids'));
});

test('keeps two recipe-specific salt occurrences distinct', () => {
    const rows = [
        { id: 'dough-salt', ingredientId: 'salt', name: 'Salz', amount: '2', unit: 'TL' },
        { id: 'cream-salt', ingredientId: 'salt', name: 'Salz', amount: '', unit: 'Stk' },
    ];
    const result = repairIngredientMentions(
        [{ id: 'cream', description: '@[Salz](imported_11)' }],
        rows,
        new Map([['imported_11', 'cream-salt']]),
    );
    assert.equal(result.nodes[0].description, '@[Salz](cream-salt)');
    assert.deepEqual(result.issues, []);
});

test('legacy catalogue references resolve only when their recipe occurrence is unique', () => {
    const result = repairIngredientMentions(
        [{ id: 's', description: '@[Milch](catalogue-milk)' }],
        [milk],
    );
    assert.equal(result.nodes[0].description, '@[Milch](row-milk)');
});

test('adds a missing plain-text mention only for an explicit unambiguous step ingredient', () => {
    const result = repairIngredientMentions(
        [
            {
                id: 's',
                description: 'Milch erwärmen. Wasser bereitstellen.',
                ingredientIds: ['row-milk'],
            },
        ],
        [milk, water],
    );
    assert.equal(result.nodes[0].description, '@[Milch](row-milk) erwärmen. Wasser bereitstellen.');
});

test('ambiguous and missing references are reported without guessing', () => {
    const result = repairIngredientMentions(
        [{ id: 's', description: '@[Salz](unknown) und @[Öl](missing)' }],
        [
            { id: 'a', name: 'Salz' },
            { id: 'b', name: 'Salz' },
        ],
    );
    assert.equal(result.nodes[0].description, '@[Salz](unknown) und @[Öl](missing)');
    assert.equal(result.issues.length, 2);
});

test('repair is idempotent and leaves unrelated step data intact', () => {
    const once = repairIngredientMentions(
        [{ id: 's', description: '@[Milch](imported_4)', photoKey: 'photo', duration: 3 }],
        [milk],
    );
    assert.deepEqual(repairIngredientMentions(once.nodes, [milk]).nodes, once.nodes);
    assert.equal(once.nodes[0].photoKey, 'photo');
});

test('save mode cannot silently reassign a removed source occurrence by name', () => {
    const result = repairIngredientMentions(
        [{ id: 's', description: '@[Milch](removed)' }],
        [milk],
        new Map(),
        { allowNameFallback: false },
    );
    assert.equal(result.nodes[0].description, '@[Milch](removed)');
    assert.equal(result.issues[0].reason, 'missing');
});

test('explicit removal preserves prose and partial amounts but removes only that occurrence', () => {
    const result = removeIngredientReferences(
        [
            {
                id: 's',
                description: '@[Milch|50 ml](removed) und @[Milch](keep)',
                ingredientIds: ['removed', 'keep'],
            },
        ],
        new Set(['removed']),
    );
    assert.equal(result[0].description, 'Milch (50 ml) und @[Milch](keep)');
    assert.deepEqual(result[0].ingredientIds, ['keep']);
});

test('flow-only conversion maps unique existing ingredients and leaves unmatched names readable', () => {
    const result = bindFlowToExistingIngredients(
        [
            {
                id: 's',
                description: '@[Milch](ai-milk) und @[Salz](ai-salt)',
                ingredientIds: ['ai-milk', 'ai-salt'],
            },
        ],
        [
            { id: 'ai-milk', name: 'Milch' },
            { id: 'ai-salt', name: 'Salz' },
        ],
        [milk],
    );
    assert.equal(result[0].description, '@[Milch](row-milk) und Salz');
    assert.deepEqual(result[0].ingredientIds, ['row-milk']);
});

test('flow-only conversion cannot collapse two AI salt portions into one existing quantity', () => {
    const result = bindFlowToExistingIngredients(
        [{ id: 's', description: '@[Salz](ai-dough) und @[Salz](ai-cream)' }],
        [
            { id: 'ai-dough', name: 'Salz' },
            { id: 'ai-cream', name: 'Salz' },
        ],
        [{ id: 'salt', name: 'Salz', amount: '2', unit: 'TL' }],
    );
    assert.equal(result[0].description, 'Salz und Salz');
});

test('editor initialization canonicalizes unique legacy IDs before removal or replacement', () => {
    const initial = repairIngredientMentions(
        [
            {
                id: 's',
                description: '@[Milch|50 ml](catalogue-milk)',
                ingredientIds: ['catalogue-milk'],
            },
        ],
        [milk],
        new Map(),
        { allowNameFallback: false },
    ).nodes;
    assert.equal(initial[0].description, '@[Milch|50 ml](row-milk)');
    assert.deepEqual(removeIngredientReferences(initial, new Set([milk.id]))[0].ingredientIds, []);
    assert.equal(
        removeIngredientReferences(initial, new Set([milk.id]))[0].description,
        'Milch (50 ml)',
    );
    const replacement = repairIngredientMentions(
        initial,
        [{ ...milk, name: 'Hafermilch', ingredientId: 'catalogue-oat' }],
        new Map([[milk.id, milk.id]]),
        { allowNameFallback: false },
    );
    assert.equal(replacement.nodes[0].description, '@[Hafermilch|50 ml](row-milk)');
    assert.deepEqual(replacement.issues, []);
});

test('legacy aliases cannot hide two collapsed occurrences with different source IDs', () => {
    const result = repairIngredientMentions(
        [
            { id: 'dough', description: '@[Salz](imported_2)' },
            { id: 'cream', description: '@[Meersalz](imported_11)' },
        ],
        [{ id: 'salt', name: 'Salz', aliases: ['Meersalz'], amount: '2' }],
    );
    assert.equal(result.nodes[0].description, '@[Salz](imported_2)');
    assert.equal(result.nodes[1].description, '@[Meersalz](imported_11)');
    assert.equal(result.issues.length, 2);
});
