// Full re-import against PostgreSQL (KUC-115): replaceImportedRecipe overwrites
// the import data and keeps identity and user data; a full backup restores the
// old rows byte for byte. Needs a throwaway database with all migrations
// (MENTION_TEST_DATABASE_URL), like the other importer DB tests.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

import { recipeFingerprint } from './full-refresh-progress';
import type { ImportedRecipe } from './openai-recipe-schema';

const url = process.env.MENTION_TEST_DATABASE_URL;
if (url) process.env.DATABASE_URL = url;

const flow = (descriptions: [string, string]) => ({
    nodes: [
        {
            id: 'start',
            type: 'start' as const,
            label: "Los geht's!",
            description: descriptions[0],
            duration: null,
            ingredientIds: [],
        },
        {
            id: 'step-1',
            type: 'kochen' as const,
            label: 'Kochen',
            description: descriptions[1],
            duration: 20,
            ingredientIds: [],
        },
        {
            id: 'servieren',
            type: 'servieren' as const,
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
});

test(
    'full refresh replaces import data, keeps identity and user data, backup restores it',
    { skip: !url },
    async () => {
        const { prisma } = await import('../../../shared/prisma');
        const { setEnrichmentEnqueuerForTests } = await import('../ingredients/enqueue-enrichment');
        const { replaceImportedRecipe, saveImportedRecipe } = await import('./pipeline');
        const { transformImportedRecipe } = await import('./transform');
        const { restoreFullBackupEntry, snapshotRecipes } = await import('./full-refresh-db');
        const { TAG_NAMES_SORTED } = await import('../../../shared/tags/tag-list');

        const enqueued: string[] = [];
        setEnrichmentEnqueuerForTests(async (id) => {
            enqueued.push(id);
        });

        const key = randomUUID().slice(0, 8);
        const admin = await prisma.user.create({
            data: { email: `admin-${key}@example.invalid`, role: 'admin' },
        });
        const fan = await prisma.user.create({ data: { email: `fan-${key}@example.invalid` } });
        const onion = `Zwiebel${key}`;
        const water = `Wasser${key}`;
        const leek = `Lauch${key}`;
        for (const name of [onion, water])
            await prisma.ingredient.create({ data: { name, slug: name.toLowerCase() } });
        const createdUnits: string[] = [];
        for (const [shortName, longName] of [
            ['Stk', 'Stück'],
            ['ml', 'Milliliter'],
            ['g', 'Gramm'],
        ]) {
            if (!(await prisma.unit.findUnique({ where: { shortName } })))
                createdUnits.push((await prisma.unit.create({ data: { shortName, longName } })).id);
        }
        const createdCategories: string[] = [];
        for (const [name, slug] of [
            ['Vorspeise', 'vorspeise'],
            ['Hauptgericht', 'hauptgericht'],
        ]) {
            if (!(await prisma.category.findUnique({ where: { slug } })))
                createdCategories.push((await prisma.category.create({ data: { name, slug } })).id);
        }
        const [tagA, tagB, tagC] = TAG_NAMES_SORTED;

        let recipeId: string | undefined;
        try {
            const oldImport = transformImportedRecipe({
                ingredients: [
                    { id: 'ingredient-0', name: onion, amount: 2, unit: null, notes: null },
                    { id: 'ingredient-1', name: water, amount: 200, unit: 'ml', notes: null },
                ],
                title: `Zwiebelsuppe ${key}`,
                description: 'Eine einfache Suppe.',
                categories: ['Vorspeise'],
                tags: [tagA, tagB],
                difficulty: 'Einfach',
                prepTime: 10,
                cookTime: 20,
                servings: 2,
                imageUrl: null,
                ...flow([
                    'Die @[Zwiebeln](ingredient-0) schälen.',
                    'Mit dem @[Wasser](ingredient-1) aufkochen.',
                ]),
            } as ImportedRecipe);
            const saved = await saveImportedRecipe(
                prisma,
                { ...oldImport, sourceUrl: `https://x.test/${key}` },
                admin.id,
                { publish: true },
            );
            recipeId = saved.id;
            await prisma.recipe.update({
                where: { id: recipeId },
                data: {
                    imageKey: `approved/recipe/${key}.jpg`,
                    cookCount: 7,
                    viewCount: 42,
                    rating: 4.5,
                    ratingCount: 2,
                    caloriesPerServing: 111,
                },
            });
            await prisma.favorite.create({ data: { recipeId, userId: fan.id } });
            await prisma.comment.create({
                data: { recipeId, authorId: fan.id, content: 'Lecker!' },
            });
            const before = await prisma.recipe.findUniqueOrThrow({ where: { id: recipeId } });
            const [backup] = await snapshotRecipes(prisma, [recipeId]);
            assert.equal(backup.recipeIngredients.length, 2);
            assert.equal(backup.recipeTags.length, 2);
            assert.equal(backup.recipeCategories.length, 1);

            // A broken answer fails before anything is written
            const broken = transformImportedRecipe({
                ...(oldImport as unknown as ImportedRecipe),
                ingredients: [
                    { id: 'ingredient-0', name: onion, amount: 1, unit: null, notes: null },
                ],
                title: 'Kaputt',
                description: 'Kaputter Neuimport.',
                categories: ['Hauptgericht'],
                tags: [],
                difficulty: 'Mittel',
                prepTime: 1,
                cookTime: 1,
                servings: 1,
                imageUrl: null,
                ...flow(['Die @[Zwiebeln](ingredient-0) schälen.', 'Aufkochen.']),
            });
            broken.flowNodes[1].description = 'Mit @[Salz](kein-zutaten-eintrag) würzen.';
            let committedBroken = false;
            await assert.rejects(
                replaceImportedRecipe(prisma, recipeId, broken, {
                    onCommitted: () => {
                        committedBroken = true;
                    },
                }),
            );
            assert.equal(committedBroken, false, 'no commit callback for a failed write');
            const [untouched] = await snapshotRecipes(prisma, [recipeId]);
            assert.deepEqual(untouched, backup);

            // The fresh import of the source
            const fresh = transformImportedRecipe({
                ingredients: [
                    { id: 'ingredient-0', name: onion, amount: 3, unit: null, notes: 'rot' },
                    { id: 'ingredient-1', name: leek, amount: 1, unit: null, notes: null },
                    { id: 'ingredient-2', name: water, amount: 1000, unit: 'ml', notes: null },
                ],
                title: `Zwiebel-Lauch-Suppe ${key}`,
                description: 'Kräftige Suppe aus Zwiebeln und Lauch.',
                categories: ['Hauptgericht'],
                tags: [tagC],
                difficulty: 'Mittel',
                prepTime: 15,
                cookTime: 30,
                servings: 4,
                imageUrl: 'https://x.test/bild.jpg',
                ...flow([
                    'Die @[Zwiebeln](ingredient-0) und den @[Lauch](ingredient-1) schneiden.',
                    'Mit @[Wasser|800 ml](ingredient-2) aufgießen, später den Rest @[Wasser|200 ml](ingredient-2).',
                ]),
            } as ImportedRecipe);
            const nutrition: [string, number][] = [];
            const order: string[] = [];
            let written: Parameters<typeof recipeFingerprint>[0] | undefined;
            await replaceImportedRecipe(
                prisma,
                recipeId,
                { ...fresh, sourceUrl: `https://x.test/${key}` },
                {
                    onCommitted: async (state) => {
                        written = state;
                        // already visible outside the transaction
                        const { title } = await prisma.recipe.findUniqueOrThrow({
                            where: { id: recipeId },
                            select: { title: true },
                        });
                        order.push(`committed:${title === fresh.title}`);
                    },
                    updateNutrition: async (id, servings) => {
                        order.push('nutrition');
                        nutrition.push([id, servings]);
                    },
                },
            );
            assert.deepEqual(nutrition, [[recipeId, 4]]);
            assert.deepEqual(order, ['committed:true', 'nutrition']);
            // the fingerprint taken at commit matches the recipe as read back (jsonb)
            const reread = await prisma.recipe.findUniqueOrThrow({
                where: { id: recipeId },
                select: {
                    title: true,
                    flowEdges: true,
                    _count: { select: { recipeIngredients: true } },
                },
            });
            assert.deepEqual(
                recipeFingerprint({
                    title: reread.title,
                    ingredientCount: reread._count.recipeIngredients,
                    flowEdges: reread.flowEdges,
                }),
                recipeFingerprint(written!),
            );

            const after = await prisma.recipe.findUniqueOrThrow({
                where: { id: recipeId },
                include: {
                    recipeIngredients: {
                        orderBy: { position: 'asc' },
                        include: { ingredient: true },
                    },
                    tags: { include: { tag: true } },
                    categories: { include: { category: true } },
                    favorites: true,
                    comments: true,
                },
            });
            // replaced from the source
            assert.equal(after.title, `Zwiebel-Lauch-Suppe ${key}`);
            assert.equal(after.description, 'Kräftige Suppe aus Zwiebeln und Lauch.');
            assert.deepEqual(
                [after.servings, after.prepTime, after.cookTime, after.totalTime, after.difficulty],
                [4, 15, 30, 45, 'MEDIUM'],
            );
            assert.deepEqual(
                after.recipeIngredients.map((ri) => [ri.ingredient.name, ri.amount, ri.notes]),
                [
                    [onion, '3', 'rot'],
                    [leek, '1', null],
                    [water, '1000', null],
                ],
            );
            const oldRowIds = new Set(backup.recipeIngredients.map((ri) => ri.id));
            assert.ok(after.recipeIngredients.every((ri) => !oldRowIds.has(ri.id)));
            const [onionRow, leekRow, waterRow] = after.recipeIngredients;
            const nodes = after.flowNodes as { description: string; ingredientIds: string[] }[];
            assert.equal(
                nodes[0].description,
                `Die @[Zwiebeln](${onionRow.id}) und den @[Lauch](${leekRow.id}) schneiden.`,
            );
            assert.deepEqual(nodes[1].ingredientIds, [waterRow.id]);
            assert.deepEqual(
                after.tags.map((t) => t.tag.name),
                [tagC],
            );
            assert.deepEqual(
                after.categories.map((c) => c.category.slug),
                ['hauptgericht'],
            );
            // kept
            for (const field of [
                'slug',
                'authorId',
                'status',
                'publishedAt',
                'createdAt',
                'sourceUrl',
                'imageKey',
                'moderationStatus',
                'cookCount',
                'viewCount',
                'rating',
                'ratingCount',
            ] as const)
                assert.deepEqual(after[field], before[field], field);
            assert.equal(after.favorites.length, 1);
            assert.equal(after.comments.length, 1);
            // the new catalogue ingredient got its enrichment (KUC-94/114)
            assert.equal(leekRow.ingredient.needsReview, true);
            assert.deepEqual(enqueued, [leekRow.ingredientId]);

            // Rollback: old rows with their old ids, old fields; the new ingredient stays
            await restoreFullBackupEntry(prisma, backup);
            const [restored] = await snapshotRecipes(prisma, [recipeId]);
            assert.deepEqual(restored, backup);
            assert.ok(await prisma.ingredient.findUnique({ where: { id: leekRow.ingredientId } }));
            const back = await prisma.recipe.findUniqueOrThrow({
                where: { id: recipeId },
                include: { favorites: true, comments: true },
            });
            assert.equal(back.slug, before.slug);
            assert.equal(back.favorites.length, 1);
            assert.equal(back.comments.length, 1);
        } finally {
            setEnrichmentEnqueuerForTests();
            if (recipeId) await prisma.recipe.delete({ where: { id: recipeId } });
            await prisma.notification.deleteMany({ where: { userId: { in: [admin.id, fan.id] } } });
            await prisma.user.deleteMany({ where: { id: { in: [admin.id, fan.id] } } });
            await prisma.ingredient.deleteMany({
                where: { OR: [onion, water, leek].map((name) => ({ name: { startsWith: name } })) },
            });
            await prisma.unit.deleteMany({ where: { id: { in: createdUnits } } });
            await prisma.category.deleteMany({ where: { id: { in: createdCategories } } });
            await prisma.$disconnect();
        }
    },
);

test(
    'bulk runs create new ingredients without moderator notifications; the app still notifies',
    { skip: !url },
    async () => {
        const { prisma } = await import('../../../shared/prisma');
        const { setEnrichmentEnqueuerForTests } = await import('../ingredients/enqueue-enrichment');
        const { setNewIngredientNotifications } =
            await import('../ingredients/new-ingredient-notifications');
        const { createIngredient } = await import('../../components/recipe/ingredientActions');
        setEnrichmentEnqueuerForTests(async () => {});
        const key = randomUUID().slice(0, 8);
        const moderator = await prisma.user.create({
            data: { email: `mod-${key}@example.invalid`, role: 'MODERATOR' },
        });
        const notes = () =>
            prisma.notification.count({
                where: { userId: moderator.id, title: 'Neue Zutat erstellt' },
            });
        try {
            setNewIngredientNotifications(false);
            await createIngredient(`Stillzutat${key}`);
            await new Promise((resolve) => setTimeout(resolve, 500));
            assert.equal(await notes(), 0);

            setNewIngredientNotifications(true);
            await createIngredient(`Lautzutat${key}`);
            for (let i = 0; i < 30 && (await notes()) === 0; i++)
                await new Promise((resolve) => setTimeout(resolve, 100));
            assert.equal(await notes(), 1);
        } finally {
            setNewIngredientNotifications(true);
            setEnrichmentEnqueuerForTests();
            await prisma.notification.deleteMany({ where: { userId: moderator.id } });
            await prisma.user.delete({ where: { id: moderator.id } });
            await prisma.ingredient.deleteMany({
                where: { name: { in: [`Stillzutat${key}`, `Lautzutat${key}`] } },
            });
            await prisma.$disconnect();
        }
    },
);
