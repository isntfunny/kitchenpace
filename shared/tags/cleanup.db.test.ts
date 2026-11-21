// Needs a throwaway database with all migrations (TAGS_TEST_DATABASE_URL),
// never production: the cleanup works on the whole Tag table.
import assert from 'node:assert/strict';
import { after, test } from 'node:test';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { runTagCleanup } from './cleanup';
import { TAG_LIST } from './tag-list';

const url = process.env.TAGS_TEST_DATABASE_URL;
const skip = url ? false : 'TAGS_TEST_DATABASE_URL not set';
const prisma = url ? new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) }) : null;
const P = 'tagtest-';

async function cleanup(db: PrismaClient) {
    await db.tag.deleteMany({});
    await db.recipe.deleteMany({ where: { id: { startsWith: P } } });
    await db.filterSet.deleteMany({ where: { id: { startsWith: P } } });
    await db.collection.deleteMany({ where: { id: { startsWith: P } } });
    await db.user.deleteMany({ where: { id: { startsWith: P } } });
}

after(async () => {
    if (!prisma) return;
    await cleanup(prisma);
    await prisma.$disconnect();
});

const tagNames = (db: PrismaClient, recipeId: string) =>
    db.recipeTag
        .findMany({ where: { recipeId }, select: { tag: { select: { name: true } } } })
        .then((rows) => rows.map((r) => r.tag.name).sort());

test('cleanup merges, renames and drops tags and moves every link', { skip }, async () => {
    const db = prisma!;
    await cleanup(db);
    await db.user.create({ data: { id: P + 'u', email: 'tagtest@example.invalid' } });
    for (const id of ['r1', 'r2', 'r3']) {
        await db.recipe.create({
            data: { id: P + id, title: id, slug: P + id, authorId: P + 'u' },
        });
    }
    await db.tag.createMany({
        data: [
            { id: P + 'grillen', name: 'Grillen', slug: 'grillen' },
            { id: P + 'bbq', name: 'BBQ', slug: 'bbq' },
            { id: P + 'kuk', name: 'Kaffee und Kuchen', slug: 'kaffee-und-kuchen' },
            { id: P + 'nach', name: 'Nachmittagskaffee', slug: 'nachmittagskaffee' },
            { id: P + 'nachttisch', name: 'Nachttisch', slug: 'nachttisch' },
            { id: P + 'unknown', name: 'Mondküche', slug: 'mondkueche' },
        ],
    });
    await db.recipeTag.createMany({
        data: [
            { recipeId: P + 'r1', tagId: P + 'grillen' },
            { recipeId: P + 'r1', tagId: P + 'bbq' }, // duplicate after merge
            { recipeId: P + 'r2', tagId: P + 'bbq' },
            { recipeId: P + 'r2', tagId: P + 'nach' },
            { recipeId: P + 'r3', tagId: P + 'kuk' },
            { recipeId: P + 'r3', tagId: P + 'nachttisch' },
            { recipeId: P + 'r3', tagId: P + 'unknown' },
        ],
    });
    await db.filterSet.create({
        data: {
            id: P + 'fs',
            type: 'FOOD_PERIOD',
            slug: P + 'fs',
            tags: { create: [{ tagId: P + 'bbq' }, { tagId: P + 'grillen' }] },
        },
    });
    await db.collection.create({
        data: {
            id: P + 'c',
            title: 'c',
            slug: P + 'c',
            authorId: P + 'u',
            tags: { create: [{ tagId: P + 'nach' }] },
        },
    });

    const dry = await runTagCleanup(db, { write: false });
    assert.equal(dry.mode, 'dry-run');
    assert.equal(await db.tag.count(), 6, 'dry run writes nothing');

    const report = await runTagCleanup(db, { write: true });
    assert.deepEqual({ ...report, mode: 'dry-run' }, dry, 'dry run predicts the write');

    assert.deepEqual(await tagNames(db, P + 'r1'), ['Grillen']);
    assert.deepEqual(await tagNames(db, P + 'r2'), ['Grillen', 'Kaffee & Kuchen']);
    assert.deepEqual(await tagNames(db, P + 'r3'), ['Kaffee & Kuchen', 'Mondküche']);

    // Renamed in place: id stays, name and slug follow the list
    const kuk = await db.tag.findUniqueOrThrow({ where: { id: P + 'kuk' } });
    assert.deepEqual([kuk.name, kuk.slug], ['Kaffee & Kuchen', 'kaffee-und-kuchen']);

    const fsTags = await db.filterSetTag.findMany({ where: { filterSetId: P + 'fs' } });
    assert.deepEqual(
        fsTags.map((t) => t.tagId),
        [P + 'grillen'],
    );
    const cTags = await db.collectionTag.findMany({ where: { collectionId: P + 'c' } });
    assert.deepEqual(
        cTags.map((t) => t.tagId),
        [P + 'kuk'],
    );

    // Whole list exists, plus the untouched unknown tag
    assert.equal(await db.tag.count(), TAG_LIST.length + 1);
    assert.deepEqual(
        report.unknown.map((u) => u.name),
        ['Mondküche'],
    );
    assert.deepEqual(
        report.merged.map((m) => [m.from.name, m.to.name, m.recipes, m.alreadyTagged]),
        [
            ['BBQ', 'Grillen', 2, 1],
            ['Nachmittagskaffee', 'Kaffee & Kuchen', 1, 0],
        ],
    );
    assert.deepEqual(
        report.dropped.map((d) => d.name),
        ['Nachttisch'],
    );
    assert.deepEqual(report.affectedRecipeIds, [P + 'r1', P + 'r2', P + 'r3']);

    // Idempotent
    const again = await runTagCleanup(db, { write: true });
    assert.equal(again.created.length + again.renamed.length, 0);
    assert.equal(again.merged.length + again.dropped.length, 0);
    assert.deepEqual(again.affectedRecipeIds, []);
});
