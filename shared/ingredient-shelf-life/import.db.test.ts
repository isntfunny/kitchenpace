// Integration test against a throwaway database with all migrations applied.
// Runs only with SHELF_LIFE_TEST_DATABASE_URL set; never point it at production.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { importShelfLifeResults } from './import';
import type { ShelfLifeItem } from './schema';

const url = process.env.SHELF_LIFE_TEST_DATABASE_URL;
const skip = url ? false : 'SHELF_LIFE_TEST_DATABASE_URL not set';
const prisma = url ? new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) }) : null;

const items: ShelfLifeItem[] = JSON.parse(
    readFileSync(new URL('./fixtures/results-sample.json', import.meta.url), 'utf8'),
).slice(0, 8);
const manualItem = items.find((item) => item.normalizedName === 'Milch')!;
const PREFIX = 'sltest-';
const idOf = (item: ShelfLifeItem) => PREFIX + item.id;
const fileItems = () => [
    ...items.map((item) => ({ ...item, id: idOf(item) })),
    { ...items[0], id: PREFIX + 'unknown-id' },
];

async function cleanup(db: PrismaClient) {
    await db.recipe.deleteMany({ where: { id: { startsWith: PREFIX } } });
    await db.ingredient.deleteMany({ where: { id: { startsWith: PREFIX } } });
    await db.unit.deleteMany({ where: { id: { startsWith: PREFIX } } });
    await db.user.deleteMany({ where: { id: { startsWith: PREFIX } } });
}

before(async () => {
    if (!prisma) return;
    await cleanup(prisma);
    await prisma.user.create({ data: { id: PREFIX + 'user', email: 'sltest@example.invalid' } });
    await prisma.unit.create({
        data: { id: PREFIX + 'g', shortName: 'sltest-g', longName: 'sltest-gramm' },
    });
    await prisma.ingredient.createMany({
        data: [
            ...items.map((item, index) => ({
                id: idOf(item),
                name: `Rohname ${index}`,
                slug: `${PREFIX}${index}`,
                pluralName: index === 0 ? 'Vorhanden' : null,
            })),
            { id: PREFIX + 'missing', name: 'Bärlauch', slug: PREFIX + 'missing' },
        ],
    });
    // Manually maintained shelf life must survive
    await prisma.ingredient.update({
        where: { id: idOf(manualItem) },
        data: {
            shelfLifeSource: 'MANUAL',
            defaultStorage: 'FRIDGE',
            storageLives: { create: [{ storage: 'FRIDGE', days: 5 }] },
        },
    });
    await prisma.recipe.create({
        data: {
            id: PREFIX + 'recipe',
            title: 'Test',
            slug: PREFIX + 'recipe',
            authorId: PREFIX + 'user',
            recipeIngredients: {
                create: [
                    { ingredientId: PREFIX + 'missing', unitId: PREFIX + 'g', amount: '10' },
                    { ingredientId: idOf(items[0]), unitId: PREFIX + 'g', amount: '20' },
                ],
            },
        },
    });
});

after(async () => {
    if (!prisma) return;
    await cleanup(prisma);
    await prisma.$disconnect();
});

test('dry run reports but writes nothing', { skip }, async () => {
    const report = await importShelfLifeResults(prisma!, fileItems());
    assert.equal(report.write, false);
    assert.equal(report.updated, 8);
    assert.deepEqual(report.notFound, [PREFIX + 'unknown-id']);
    assert.ok(report.withoutResult.usedInRecipes.some((row) => row.id === PREFIX + 'missing'));
    const count = await prisma!.ingredient.count({
        where: { id: { startsWith: PREFIX }, shelfLifeSource: 'AI' },
    });
    assert.equal(count, 0);
});

test('write applies the rules and a second run changes nothing', { skip }, async () => {
    const first = await importShelfLifeResults(prisma!, fileItems(), { write: true });
    assert.equal(first.failed.length, 0);
    assert.deepEqual(first.manualKept, [idOf(manualItem)]);

    const gambas = await prisma!.ingredient.findUniqueOrThrow({
        where: { id: idOf(items[0]) },
        include: { storageLives: true },
    });
    assert.equal(gambas.name, 'Rohname 0');
    assert.equal(gambas.pluralName, 'Vorhanden');
    assert.equal(gambas.normalizedName, items[0].normalizedName);
    assert.equal(gambas.shelfLifeSource, 'AI');
    assert.deepEqual(
        gambas.storageLives.map((life) => life.storage).sort(),
        items[0].storageLives.map((life) => life.storage).sort(),
    );

    const manual = await prisma!.ingredient.findUniqueOrThrow({
        where: { id: idOf(manualItem) },
        include: { storageLives: true },
    });
    assert.equal(manual.shelfLifeSource, 'MANUAL');
    assert.deepEqual(
        manual.storageLives.map(({ storage, days }) => ({ storage, days })),
        [{ storage: 'FRIDGE', days: 5 }],
    );

    const notApplicable = items.find((item) => !item.applicable)!;
    const dish = await prisma!.ingredient.findUniqueOrThrow({
        where: { id: idOf(notApplicable) },
        include: { storageLives: true },
    });
    assert.equal(dish.shelfLifeSource, 'AI');
    assert.equal(dish.storageLives.length, 0);

    const second = await importShelfLifeResults(prisma!, fileItems(), { write: true });
    assert.equal(second.updated, 0);
    assert.equal(second.unchanged, 8);
});
