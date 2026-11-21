import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ImportedRecipe } from './openai-recipe-schema';
import { transformImportedRecipe } from './transform';

const base = {
    title: 'Lángos',
    description: 'Frittierte Teigfladen',
    servings: 4,
    prepTime: 10,
    cookTime: 20,
    difficulty: 'Einfach',
    categories: ['Hauptgericht'],
    tags: [],
    imageUrl: null,
} as const;

test('each AI conversion has independent ingredient identities and keeps duplicate occurrences', () => {
    const source = {
        ...base,
        ingredients: [
            { id: 'ingredient-0', name: 'Salz', amount: 2, unit: 'TL', notes: null },
            {
                id: 'ingredient-1',
                name: 'Salz',
                amount: null,
                unit: null,
                notes: 'zum Abschmecken',
            },
        ],
        nodes: [
            {
                id: 'dough',
                type: 'mixen',
                label: 'Teig',
                description: '@[Salz](ingredient-0) hinzufügen',
                duration: null,
                ingredientIds: ['ingredient-0'],
            },
            {
                id: 'cream',
                type: 'wuerzen',
                label: 'Creme',
                description: '@[Salz](ingredient-1) hinzufügen',
                duration: null,
                ingredientIds: ['ingredient-1'],
            },
        ],
        edges: [],
    } as unknown as ImportedRecipe;
    const one = transformImportedRecipe(source),
        two = transformImportedRecipe(source);
    assert.notEqual(one.ingredients[0].id, two.ingredients[0].id);
    assert.notEqual(one.ingredients[0].id, one.ingredients[1].id);
    assert.equal(one.ingredients[0].amount, '2');
    assert.equal(one.ingredients[1].amount, '');
    assert.equal(one.flowNodes[1].description, `@[Salz](${one.ingredients[1].id}) hinzufügen`);
});

test('mentions keep display text and partial amount; ingredientIds come from the mentions', () => {
    const source = {
        ...base,
        ingredients: [
            { id: 'ingredient-0', name: 'Zwiebel', amount: 2, unit: null, notes: null },
            { id: 'ingredient-1', name: 'Öl', amount: 3, unit: 'EL', notes: null },
            { id: 'ingredient-2', name: 'Wasser', amount: 200, unit: 'ml', notes: null },
        ],
        nodes: [
            {
                id: 'start',
                type: 'start',
                label: "Los geht's!",
                description: 'Die @[Zwiebeln](ingredient-0) schälen.',
                duration: null,
                // the model's own list is ignored, mentions decide
                ingredientIds: ['ingredient-2'],
            },
            {
                id: 'step-1',
                type: 'braten',
                label: 'Anbraten',
                description:
                    'Das @[Öl|1 EL](ingredient-1) erhitzen, @[Wasser|etwas](ingredient-2) und den Rest @[Öl|2 EL](ingredient-1) dazugeben.',
                duration: 5,
                ingredientIds: [],
            },
            {
                id: 'servieren',
                type: 'servieren',
                label: 'Servieren',
                description: 'Mit dem @[Wasser|Rest](ingredient-2) servieren.',
                duration: null,
                ingredientIds: [],
            },
        ],
        edges: [
            { source: 'start', target: 'step-1' },
            { source: 'step-1', target: 'servieren' },
        ],
    } as unknown as ImportedRecipe;
    const result = transformImportedRecipe(source);
    const [onion, oil, water] = result.ingredients.map((i) => i.id);

    assert.equal(result.flowNodes[0].description, `Die @[Zwiebeln](${onion}) schälen.`);
    assert.deepEqual(result.flowNodes[0].ingredientIds, [onion]);
    assert.equal(
        result.flowNodes[1].description,
        `Das @[Öl|1 EL](${oil}) erhitzen, @[Wasser|etwas](${water}) und den Rest @[Öl|2 EL](${oil}) dazugeben.`,
    );
    assert.deepEqual(result.flowNodes[1].ingredientIds, [oil, water]);
    assert.equal(result.flowNodes[2].description, `Mit dem @[Wasser|Rest](${water}) servieren.`);
    assert.deepEqual(
        result.flowEdges.map((e) => e.id),
        ['edge-1', 'edge-2'],
    );
    assert.equal(result.warnings, undefined);
});

test('a mention with an unknown id becomes plain text with a warning', () => {
    const source = {
        ...base,
        ingredients: [{ id: 'ingredient-0', name: 'Mehl', amount: 500, unit: 'g', notes: null }],
        nodes: [
            {
                id: 'start',
                type: 'start',
                label: "Los geht's!",
                description: '@[Mehl](ingredient-0) mit @[Zucker|1 EL](ingredient-7) mischen.',
                duration: null,
                ingredientIds: [],
            },
        ],
        edges: [],
    } as unknown as ImportedRecipe;
    const result = transformImportedRecipe(source);
    const flour = result.ingredients[0].id;
    assert.equal(result.flowNodes[0].description, `@[Mehl](${flour}) mit Zucker (1 EL) mischen.`);
    assert.deepEqual(result.flowNodes[0].ingredientIds, [flour]);
    assert.equal(result.warnings?.length, 1);
    assert.match(result.warnings![0], /ingredient-7/);
});
