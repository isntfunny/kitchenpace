import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { test } from 'node:test';

const url = process.env.MENTION_TEST_DATABASE_URL;
test(
    'PostgreSQL: imports and repeated editor saves preserve separate salt quantities and stable IDs',
    { skip: !url },
    async () => {
        process.env.DATABASE_URL = url!;
        // Moderation is an external boundary; use a local successful response,
        // while exercising actual application save code and PostgreSQL writes.
        const moderation = createServer((_req, res) => {
            res.setHeader('content-type', 'application/json');
            res.end(
                JSON.stringify({
                    id: 'test',
                    model: 'test',
                    results: [{ flagged: false, categories: {}, category_scores: { violence: 0 } }],
                }),
            );
        });
        await new Promise<void>((resolve) => moderation.listen(0, '127.0.0.1', resolve));
        const address = moderation.address();
        assert.ok(address && typeof address !== 'string');
        process.env.OPENAI_API_KEY = 'local-integration-test';
        process.env.OPENAI_BASE_URL = `http://127.0.0.1:${address.port}/v1`;
        const { prisma } = await import('../../../shared/prisma');
        const { saveImportedRecipe } = await import('./pipeline');
        const { updateRecipe, createRecipe } =
            await import('../../components/recipe/recipeMutations');
        const key = randomUUID();
        const user = await prisma.user.create({ data: { email: `${key}@example.invalid` } });
        const salt = await prisma.ingredient.create({ data: { name: 'Salz', slug: 'salz' } });
        const tl = await prisma.unit.create({ data: { shortName: 'TL', longName: 'Teelöffel' } });
        const stk = await prisma.unit.create({ data: { shortName: 'Stk', longName: 'Stück' } });
        const ids: string[] = [];
        try {
            const source = {
                title: `Lángos ${key}`,
                description: '',
                servings: 4,
                prepTime: 10,
                cookTime: 20,
                categoryIds: [],
                tags: [],
                ingredients: [
                    {
                        id: 'imported_dough',
                        name: 'Salz',
                        amount: '2',
                        unit: 'TL',
                        notes: 'für Teig',
                        isOptional: false,
                    },
                    {
                        id: 'imported_cream',
                        name: 'Salz',
                        amount: '',
                        unit: 'Stk',
                        notes: 'zum Abschmecken',
                        isOptional: false,
                    },
                ],
                flowNodes: [
                    {
                        id: 'dough',
                        type: 'mixen',
                        label: 'Teig',
                        description: '@[Salz|1 TL](imported_dough)',
                        ingredientIds: ['imported_dough'],
                    },
                    {
                        id: 'cream',
                        type: 'wuerzen',
                        label: 'Creme',
                        description: '@[Salz](imported_cream)',
                        ingredientIds: ['imported_cream'],
                    },
                ],
                flowEdges: [],
            };
            const imported = await saveImportedRecipe(prisma, source, user.id);
            ids.push(imported.id);
            const first = await prisma.recipe.findUniqueOrThrow({
                where: { id: imported.id },
                include: { recipeIngredients: { orderBy: { position: 'asc' } } },
            });
            assert.equal(first.recipeIngredients.length, 2);
            assert.deepEqual(
                first.recipeIngredients.map((row) => row.amount),
                ['2', ''],
            );
            assert.equal(
                (first.flowNodes as typeof source.flowNodes)[0].description,
                `@[Salz|1 TL](${first.recipeIngredients[0].id})`,
            );
            const payload = {
                ...source,
                categoryIds: [],
                difficulty: 'EASY' as const,
                ingredients: source.ingredients.map((row) => ({
                    referenceId: row.id,
                    ingredientId: salt.id,
                    ingredientName: row.name,
                    amount: row.amount,
                    unit: row.unit,
                    notes: row.notes,
                    isOptional: false,
                })),
                status: 'DRAFT' as const,
            };
            await updateRecipe(imported.id, payload, user.id);
            await updateRecipe(
                imported.id,
                { ...payload, ingredients: [...payload.ingredients].reverse() },
                user.id,
            );
            const twice = await prisma.recipeIngredient.findMany({
                where: { recipeId: imported.id },
                orderBy: { position: 'asc' },
            });
            assert.deepEqual(
                twice.map((row) => row.id),
                [first.recipeIngredients[1].id, first.recipeIngredients[0].id],
            );
            assert.deepEqual(
                twice.map((row) => row.notes),
                ['zum Abschmecken', 'für Teig'],
            );

            const created = await createRecipe({ ...payload, title: 'Editor ' + key }, user.id);
            ids.push(created.id);
            const originalIds = (
                await prisma.recipeIngredient.findMany({ where: { recipeId: created.id } })
            )
                .map((row) => row.id)
                .sort();
            await updateRecipe(created.id, { ...payload, title: 'Editor ' + key }, user.id);
            assert.deepEqual(
                (await prisma.recipeIngredient.findMany({ where: { recipeId: created.id } }))
                    .map((row) => row.id)
                    .sort(),
                originalIds,
            );
        } finally {
            await prisma.moderationQueue.deleteMany({ where: { authorId: user.id } });
            await prisma.recipe.deleteMany({ where: { id: { in: ids } } });
            await prisma.user.delete({ where: { id: user.id } });
            await prisma.ingredient.delete({ where: { id: salt.id } });
            await prisma.unit.deleteMany({ where: { id: { in: [tl.id, stk.id] } } });
            await prisma.$disconnect();
            await new Promise<void>((resolve) => moderation.close(() => resolve()));
        }
    },
);
