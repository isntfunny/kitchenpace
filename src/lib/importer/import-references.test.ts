import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ImportedRecipe } from './openai-recipe-schema';
import { transformImportedRecipe } from './transform';

test('each AI conversion has independent ingredient identities and keeps duplicate occurrences', () => {
    const source = {
        title: 'Lángos',
        description: '',
        servings: 4,
        prepTime: 10,
        cookTime: 20,
        difficulty: 'Einfach',
        categories: [],
        tags: [],
        ingredients: [
            { name: 'Salz', amount: 2, unit: 'TL' },
            { name: 'Salz', amount: null, unit: null, notes: 'zum Abschmecken' },
        ],
        flowNodes: [
            {
                id: 'dough',
                type: 'mixen',
                label: 'Teig',
                description: 'Salz hinzufügen',
                ingredientIds: ['ingredient-0'],
            },
            {
                id: 'cream',
                type: 'wuerzen',
                label: 'Creme',
                description: 'Salz hinzufügen',
                ingredientIds: ['ingredient-1'],
            },
        ],
        flowEdges: [],
    } as unknown as ImportedRecipe;
    const one = transformImportedRecipe(source),
        two = transformImportedRecipe(source);
    assert.notEqual(one.ingredients[0].id, two.ingredients[0].id);
    assert.notEqual(one.ingredients[0].id, one.ingredients[1].id);
    assert.equal(one.ingredients[0].amount, '2');
    assert.equal(one.ingredients[1].amount, '');
    assert.equal(one.flowNodes[1].description, `@[Salz](${one.ingredients[1].id}) hinzufügen`);
});
