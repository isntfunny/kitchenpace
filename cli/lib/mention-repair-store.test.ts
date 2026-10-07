import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { planRecipeRepair } from '../../src/lib/ingredients/mention-migration';
import { mergeRecipeIngredientOccurrences } from '../../src/lib/ingredients/merge-occurrences';

import { readMentionSnapshot, replaceMentionSnapshot } from './mention-repair-store';

const url = process.env.MENTION_TEST_DATABASE_URL;
test(
    'PostgreSQL: dry run, apply, resume, restoration, conflict and rollback through the real CLI',
    { skip: !url },
    async () => {
        // This suite creates fixtures only in an explicitly provided test database.
        const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url! }) });
        const key = randomUUID();
        const dir = await mkdtemp(join(tmpdir(), 'kuc88-'));
        const user = await db.user.create({ data: { email: `${key}@example.invalid` } });
        const ingredient = await db.ingredient.create({ data: { name: 'Milch', slug: key } });
        const unit = await db.unit.create({ data: { shortName: key, longName: key } });
        const recipe = await db.recipe.create({
            data: {
                title: 'Lángos test',
                slug: key,
                authorId: user.id,
                flowNodes: [
                    { id: 's', description: '@[Milch](imported_4)', ingredientIds: ['imported_4'] },
                ],
                recipeIngredients: {
                    create: {
                        ingredientId: ingredient.id,
                        unitId: unit.id,
                        amount: '1/2',
                        notes: 'lauwarm',
                    },
                },
            },
        });
        const cli = (...args: string[]) =>
            spawnSync(
                process.execPath,
                ['--import', 'tsx', 'scripts/repair-ingredient-mentions.ts', ...args],
                {
                    cwd: process.cwd(),
                    encoding: 'utf8',
                    env: {
                        ...process.env,
                        DATABASE_URL: url!,
                        DOTENV_CONFIG_PATH: join(dir, 'no-env-file'),
                    },
                    timeout: 30000,
                },
            );
        try {
            const before = await readMentionSnapshot(db, recipe.id);
            const report = join(dir, 'plan.json'),
                journal = join(dir, 'journal.json');
            const dry = cli('--recipe', key, '--report', report);
            assert.equal(dry.status, 0, dry.stderr);
            assert.deepEqual(await readMentionSnapshot(db, recipe.id), before);
            const plan = JSON.parse(await readFile(report, 'utf8'));
            assert.equal(
                plan.entries[0].after.flowNodes[0].description,
                `@[Milch](${before.ingredients[0].id})`,
            );
            const apply = cli('--apply', report, '--journal', journal);
            assert.equal(apply.status, 0, apply.stderr);
            const after = await readMentionSnapshot(db, recipe.id);
            assert.equal(after.ingredients[0].amount, '1/2');
            assert.equal(cli('--resume', journal).status, 0);
            assert.equal(cli('--rollback', journal).status, 0);
            assert.deepEqual(await readMentionSnapshot(db, recipe.id), before);
            assert.equal(cli('--rollback', journal).status, 0);
            // Refuse overwriting the only undo journal, before touching the database.
            assert.notEqual(cli('--apply', report, '--journal', journal).status, 0);
            assert.deepEqual(await readMentionSnapshot(db, recipe.id), before);

            const restoration = planRecipeRepair(before, {
                sourceIds: { imported_4: 'second-' + key },
                restoreRows: [
                    {
                        ...before.ingredients[0],
                        id: 'second-' + key,
                        amount: '',
                        notes: 'für Creme',
                        position: 1,
                    },
                ],
            });
            const restoreReport = join(dir, 'restore-plan.json'),
                restoreJournal = join(dir, 'restore-journal.json');
            await writeFile(
                restoreReport,
                JSON.stringify({ version: 1, kind: 'plan', entries: [restoration] }),
            );
            const restored = cli('--apply', restoreReport, '--journal', restoreJournal);
            assert.equal(restored.status, 0, restored.stderr);
            const occurrences = (await readMentionSnapshot(db, recipe.id)).ingredients;
            assert.equal(occurrences.length, 2);
            assert.equal(occurrences[1].amount, '');
            assert.equal(cli('--rollback', restoreJournal).status, 0);
            assert.deepEqual(await readMentionSnapshot(db, recipe.id), before);

            // Ingredient edits do not update Recipe.updatedAt; the fingerprint must catch them.
            await db.recipeIngredient.update({
                where: { id: before.ingredients[0].id },
                data: { amount: '200' },
            });
            await assert.rejects(
                () => replaceMentionSnapshot(db, before, planRecipeRepair(before).after),
                /changed/,
            );
            assert.equal((await readMentionSnapshot(db, recipe.id)).ingredients[0].amount, '200');
            assert.notEqual(
                cli('--apply', report, '--journal', join(dir, 'conflict-journal.json')).status,
                0,
            );
            const source = await db.ingredient.create({
                data: { name: 'Meersalz', slug: 'source-' + key },
            });
            try {
                const second = await db.recipeIngredient.create({
                    data: {
                        recipeId: recipe.id,
                        ingredientId: source.id,
                        unitId: unit.id,
                        amount: '2',
                        notes: 'für Teig',
                        position: 1,
                    },
                });
                await db.recipe.update({
                    where: { id: recipe.id },
                    data: {
                        flowNodes: [
                            {
                                id: 's',
                                description: `@[Meersalz](${source.id}) und @[Milch](${before.ingredients[0].id})`,
                            },
                        ],
                    },
                });
                await db.$transaction((tx) =>
                    mergeRecipeIngredientOccurrences(tx, source.id, ingredient.id),
                );
                const merged = await readMentionSnapshot(db, recipe.id);
                assert.equal(merged.ingredients.length, 2);
                assert.deepEqual(
                    merged.ingredients.map((row) => [row.id, row.amount, row.notes]),
                    [
                        [before.ingredients[0].id, '200', 'lauwarm'],
                        [second.id, '2', 'für Teig'],
                    ],
                );
                assert.equal(
                    merged.flowNodes[0].description,
                    `@[Milch](${second.id}) und @[Milch](${before.ingredients[0].id})`,
                );
            } finally {
                await db.recipeIngredient.deleteMany({
                    where: { recipeId: recipe.id, position: 1 },
                });
                await db.ingredient.delete({ where: { id: source.id } });
            }
        } finally {
            await db.recipe.delete({ where: { id: recipe.id } });
            await db.user.delete({ where: { id: user.id } });
            await db.ingredient.delete({ where: { id: ingredient.id } });
            await db.unit.delete({ where: { id: unit.id } });
            await db.$disconnect();
            await rm(dir, { recursive: true, force: true });
        }
    },
);
