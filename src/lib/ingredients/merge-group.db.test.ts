// Needs a throwaway database with all migrations (SHELF_LIFE_TEST_DATABASE_URL),
// never production.
import assert from 'node:assert/strict';
import { after, test } from 'node:test';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { mergeIngredientGroup, previewIngredientGroupMerge } from './merge-group';

const url = process.env.SHELF_LIFE_TEST_DATABASE_URL;
const skip = url ? false : 'SHELF_LIFE_TEST_DATABASE_URL not set';
const prisma = url ? new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) }) : null;
const P = 'mgtest-';

async function cleanup(db: PrismaClient) {
    await db.recipe.deleteMany({ where: { id: { startsWith: P } } });
    await db.shoppingList.deleteMany({ where: { id: { startsWith: P } } });
    await db.filterSet.deleteMany({ where: { id: { startsWith: P } } });
    await db.ingredient.deleteMany({ where: { id: { startsWith: P } } });
    await db.unit.deleteMany({ where: { id: { startsWith: P } } });
    await db.user.deleteMany({ where: { id: { startsWith: P } } });
}

after(async () => {
    if (!prisma) return;
    await cleanup(prisma);
    await prisma.$disconnect();
});

test('merge moves every reference and keeps amounts and mentions', { skip }, async () => {
    const db = prisma!;
    await cleanup(db);
    await db.user.create({ data: { id: P + 'u', email: 'mgtest@example.invalid' } });
    await db.unit.create({ data: { id: P + 'g', shortName: P + 'g', longName: P + 'gramm' } });
    await db.ingredient.createMany({
        data: [
            {
                id: P + 'keep',
                name: 'Ei',
                slug: P + 'keep',
                normalizedName: 'Ei',
                aliases: ['eier'],
                energyKcal: 140,
            },
            {
                id: P + 'dup',
                name: 'Hühnerei, ganz',
                slug: P + 'dup',
                normalizedName: 'ei',
                aliases: [],
            },
            { id: P + 'other', name: 'Eiweiß', slug: P + 'other', normalizedName: 'Eiweiß' },
        ],
    });
    await db.recipe.create({
        data: {
            id: P + 'r',
            title: 'Rührei',
            slug: P + 'r',
            authorId: P + 'u',
            flowNodes: [
                {
                    id: 's1',
                    description: 'Mit @[Hühnerei, ganz](' + P + 'row-dup) verquirlen',
                    ingredientIds: [P + 'row-dup'],
                },
            ],
            recipeIngredients: {
                create: [
                    {
                        id: P + 'row-keep',
                        sourceId: P + 'row-keep',
                        ingredientId: P + 'keep',
                        unitId: P + 'g',
                        amount: '1',
                    },
                    {
                        id: P + 'row-dup',
                        sourceId: P + 'row-dup',
                        ingredientId: P + 'dup',
                        unitId: P + 'g',
                        amount: '2-3',
                        position: 1,
                    },
                ],
            },
        },
    });
    await db.shoppingList.create({
        data: {
            id: P + 'sl',
            userId: P + 'u',
            items: { create: [{ id: P + 'si', name: 'Hühnerei', ingredientId: P + 'dup' }] },
        },
    });
    await db.filterSet.create({
        data: {
            id: P + 'fs',
            type: 'FOOD_PERIOD',
            ingredients: { create: [{ ingredientId: P + 'dup' }] },
        },
    });

    const preview = await db.$transaction((tx) =>
        previewIngredientGroupMerge(tx, P + 'keep', [P + 'dup']),
    );
    assert.deepEqual(preview.affectedRecipeIds, [P + 'r']);
    assert.equal(preview.merge[0].recipeIngredients, 1);
    assert.equal(preview.merge[0].shoppingItems, 1);
    assert.equal(preview.merge[0].filterSets, 1);

    await assert.rejects(
        db.$transaction((tx) => mergeIngredientGroup(tx, P + 'keep', [P + 'other'])),
        /gehört nicht mehr zu dieser Gruppe/,
    );

    const result = await db.$transaction((tx) => mergeIngredientGroup(tx, P + 'keep', [P + 'dup']));
    assert.deepEqual(result.merged[0].recipeIngredientIds, [P + 'row-dup']);

    const rows = await db.recipeIngredient.findMany({
        where: { recipeId: P + 'r' },
        orderBy: { position: 'asc' },
    });
    assert.deepEqual(
        rows.map((r) => [r.id, r.ingredientId, r.amount]),
        [
            [P + 'row-keep', P + 'keep', '1'],
            [P + 'row-dup', P + 'keep', '2-3'],
        ],
    );
    const recipe = await db.recipe.findUniqueOrThrow({ where: { id: P + 'r' } });
    const node = (recipe.flowNodes as Array<{ description: string; ingredientIds: string[] }>)[0];
    assert.deepEqual(node.ingredientIds, [P + 'row-dup']);
    assert.match(node.description, new RegExp(`\\(${P}row-dup\\)`));

    assert.equal(
        (await db.shoppingItem.findUniqueOrThrow({ where: { id: P + 'si' } })).ingredientId,
        P + 'keep',
    );
    assert.equal(
        await db.filterSetIngredient.count({
            where: { filterSetId: P + 'fs', ingredientId: P + 'keep' },
        }),
        1,
    );
    assert.equal(await db.ingredient.count({ where: { id: P + 'dup' } }), 0);

    const keep = await db.ingredient.findUniqueOrThrow({ where: { id: P + 'keep' } });
    assert.equal(keep.name, 'Ei');
    assert.equal(keep.energyKcal, 140);
    assert.deepEqual(keep.aliases, ['eier', 'hühnerei, ganz']);
});
