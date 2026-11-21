// Saving an AI import keeps the mention display text the AI wrote (KUC-115).
// Needs a throwaway database with all migrations (MENTION_TEST_DATABASE_URL).
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

import type { ImportedRecipe } from './openai-recipe-schema';

const url = process.env.MENTION_TEST_DATABASE_URL;
if (url) process.env.DATABASE_URL = url;

test(
    'import save maps ids to the recipe rows and keeps display text and partial amounts',
    { skip: !url },
    async () => {
        const { prisma } = await import('../../../shared/prisma');
        const { saveImportedRecipe } = await import('./pipeline');
        const { transformImportedRecipe } = await import('./transform');
        const key = randomUUID().slice(0, 8);
        const user = await prisma.user.create({ data: { email: `${key}@example.invalid` } });
        const onion = `Zwiebel ${key}`;
        const water = `Wasser ${key}`;
        // Existing catalogue entries: a new ingredient would enqueue enrichment (needs Redis)
        for (const name of [onion, water])
            await prisma.ingredient.create({
                data: { name, slug: name.toLowerCase().replace(' ', '-') },
            });
        let recipeId: string | undefined;
        // findOrCreateUnit falls back to "Stk"; create the units an empty test database lacks
        const createdUnits: string[] = [];
        for (const [shortName, longName] of [
            ['Stk', 'Stück'],
            ['ml', 'Milliliter'],
        ]) {
            if (!(await prisma.unit.findUnique({ where: { shortName } })))
                createdUnits.push((await prisma.unit.create({ data: { shortName, longName } })).id);
        }
        try {
            const analyzed = transformImportedRecipe({
                ingredients: [
                    { id: 'ingredient-0', name: onion, amount: 2, unit: null, notes: null },
                    { id: 'ingredient-1', name: water, amount: 200, unit: 'ml', notes: null },
                ],
                title: `Zwiebelsuppe ${key}`,
                description: 'Eine einfache Suppe.',
                categories: ['Vorspeise'],
                tags: [],
                difficulty: 'Einfach',
                prepTime: 10,
                cookTime: 20,
                servings: 2,
                imageUrl: null,
                nodes: [
                    {
                        id: 'start',
                        type: 'start',
                        label: "Los geht's!",
                        description: 'Die @[Zwiebeln](ingredient-0) schälen.',
                        duration: null,
                        ingredientIds: [],
                    },
                    {
                        id: 'step-1',
                        type: 'kochen',
                        label: 'Kochen',
                        description:
                            'Mit @[Wasser|etwas](ingredient-1) andünsten, dann das @[Wasser|150 ml](ingredient-1) zugießen.',
                        duration: 20,
                        ingredientIds: [],
                    },
                    {
                        id: 'servieren',
                        type: 'servieren',
                        label: 'Servieren',
                        description: 'Heiß servieren.',
                        duration: null,
                        ingredientIds: [],
                    },
                ],
                edges: [
                    { source: 'start', target: 'step-1' },
                    { source: 'step-1', target: 'servieren' },
                ],
            } as ImportedRecipe);

            recipeId = (await saveImportedRecipe(prisma, analyzed, user.id)).id;
            const saved = await prisma.recipe.findUniqueOrThrow({
                where: { id: recipeId },
                include: { recipeIngredients: { orderBy: { position: 'asc' } } },
            });
            const [onionRow, waterRow] = saved.recipeIngredients;
            const nodes = saved.flowNodes as { description: string; ingredientIds: string[] }[];
            assert.equal(nodes[0].description, `Die @[Zwiebeln](${onionRow.id}) schälen.`);
            assert.deepEqual(nodes[0].ingredientIds, [onionRow.id]);
            assert.equal(
                nodes[1].description,
                `Mit @[Wasser|etwas](${waterRow.id}) andünsten, dann das @[Wasser|150 ml](${waterRow.id}) zugießen.`,
            );
            assert.deepEqual(nodes[1].ingredientIds, [waterRow.id]);
            assert.deepEqual(nodes[2].ingredientIds, []);
        } finally {
            if (recipeId) await prisma.recipe.delete({ where: { id: recipeId } });
            await prisma.user.delete({ where: { id: user.id } });
            await prisma.ingredient.deleteMany({ where: { name: { in: [onion, water] } } });
            await prisma.unit.deleteMany({ where: { id: { in: createdUnits } } });
            await prisma.$disconnect();
        }
    },
);
