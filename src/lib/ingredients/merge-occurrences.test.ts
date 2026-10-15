import assert from 'node:assert/strict';
import { test } from 'node:test';

import { mergeRecipeIngredientOccurrences } from './merge-occurrences';

test('catalogue merge resolves both old source and target references before identities overlap', async () => {
    let nodes: any[] = [
        {
            id: 's',
            description: '@[Salz](source) und @[Salz](target)',
            ingredientIds: ['source', 'target'],
        },
    ];
    const rows = [
        { id: 'source-use', recipeId: 'r', ingredientId: 'source', ingredient: { name: 'Salz' } },
        { id: 'target-use', recipeId: 'r', ingredientId: 'target', ingredient: { name: 'Salz' } },
    ];
    const tx = {
        ingredient: { findUniqueOrThrow: async () => ({ name: 'Salz' }) },
        recipeIngredient: {
            findMany: async ({ where }: any) =>
                rows
                    .filter((r) =>
                        where.recipeId
                            ? r.recipeId === where.recipeId
                            : r.ingredientId === where.ingredientId,
                    )
                    .map((r) => ({ ...r })),
            updateMany: async () => {
                rows[0].ingredientId = 'target';
            },
        },
        recipe: {
            findUniqueOrThrow: async () => ({ flowNodes: nodes }),
            update: async ({ data }: any) => {
                nodes = data.flowNodes;
            },
        },
    };
    await mergeRecipeIngredientOccurrences(tx as any, 'source', 'target');
    assert.equal(nodes[0].description, '@[Salz](source-use) und @[Salz](target-use)');
    assert.deepEqual(nodes[0].ingredientIds, ['source-use', 'target-use']);
});
