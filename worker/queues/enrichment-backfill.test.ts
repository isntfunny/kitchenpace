// backfill-ingredient-enrichment on the Batch API. OpenAI is never called: the
// batch API is a fake. Needs a throwaway database
// (SHELF_LIFE_TEST_DATABASE_URL), never production.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';

import type { OpenAIBatchApi } from '@shared/openai-batch';

import type { EnrichmentBatchState, EnrichmentDeps } from './enrichment-backfill';

const url = process.env.SHELF_LIFE_TEST_DATABASE_URL;
const skip = url ? false : 'SHELF_LIFE_TEST_DATABASE_URL not set';
const PREFIX = 'enrbatch-';
const BARE = `${PREFIX}bare`; // nothing enriched yet
const FULL = `${PREFIX}full`; // nutrition, units, categories present; no shelf life
const UNIT_ID = `${PREFIX}unit`;
const CAT_ID = `${PREFIX}cat`;

const [shelfLifeSample] = JSON.parse(
    readFileSync(
        new URL('../../shared/ingredient-shelf-life/fixtures/results-sample.json', import.meta.url),
        'utf8',
    ),
);

async function load() {
    process.env.DATABASE_URL = url;
    process.env.OPENAI_API_KEY = 'test-key-not-real';
    const { prisma } = await import('./prisma');
    const backfill = await import('./enrichment-backfill');
    return { prisma, ...backfill };
}

const responsesLine = (customId: string, answer: unknown, status = 200) =>
    JSON.stringify({
        custom_id: customId,
        response: {
            status_code: status,
            body:
                status === 200
                    ? {
                          output: [
                              { type: 'web_search_call', id: 'ws', status: 'completed' },
                              {
                                  type: 'message',
                                  content: [{ type: 'output_text', text: JSON.stringify(answer) }],
                              },
                          ],
                      }
                    : { error: { message: 'server error' } },
        },
        error: null,
    });

const nutritionAnswer = {
    energyKcal: 41,
    protein: 0.9,
    fat: 0.2,
    carbs: 7.6,
    fiber: 2.8,
    sugar: 4.7,
    salt: 0.1,
    source: 'BLS 4.0',
    relevantUnits: [{ shortName: UNIT_ID, grams: 60 }],
    categories: [CAT_ID],
};

after(async () => {
    if (!url) return;
    const { prisma } = await load();
    await prisma.ingredient.deleteMany({ where: { id: { startsWith: PREFIX } } });
    await prisma.ingredientCategory.deleteMany({ where: { id: CAT_ID } });
    await prisma.unit.deleteMany({ where: { id: UNIT_ID } });
    await prisma.$disconnect();
});

test(
    'flow: one batch for nutrition and shelf life, import, retry failed nutrition',
    { skip },
    async () => {
        const { prisma, runEnrichmentBackfill } = await load();
        await prisma.ingredient.deleteMany({ where: { id: { startsWith: PREFIX } } });
        await prisma.ingredientCategory.deleteMany({ where: { id: CAT_ID } });
        await prisma.unit.deleteMany({ where: { id: UNIT_ID } });
        await prisma.unit.create({ data: { id: UNIT_ID, shortName: UNIT_ID, longName: 'Stück' } });
        await prisma.ingredientCategory.create({
            data: { id: CAT_ID, name: 'Gemüse', slug: CAT_ID },
        });
        await prisma.ingredient.create({ data: { id: BARE, name: 'Karotte', slug: BARE } });
        await prisma.ingredient.create({
            data: {
                id: FULL,
                name: 'Garnelen, roh',
                slug: FULL,
                energyKcal: 90,
                ingredientUnits: { create: [{ unitId: UNIT_ID, grams: 1 }] },
                categories: { connect: [{ id: CAT_ID }] },
            },
        });

        let state = null as EnrichmentBatchState | null;
        const uploads: string[] = [];
        const batch = { status: 'in_progress', output: '' };
        const polls: number[] = [];
        let clock = new Date('2026-11-21T05:30:00Z');
        const api: OpenAIBatchApi = {
            uploadJsonl: async (content) => {
                uploads.push(content);
                return `file-${uploads.length}`;
            },
            createBatch: async (_file, endpoint) => {
                assert.equal(endpoint, '/v1/responses');
                return { id: `batch-${uploads.length}` };
            },
            retrieveBatch: async () => ({ status: batch.status, output_file_id: 'out' }),
            fileText: async () => batch.output,
        };
        const deps: EnrichmentDeps = {
            prisma,
            api,
            store: {
                get: async () => state,
                set: async (next) => {
                    state = next;
                },
                clear: async () => {
                    state = null;
                },
                lock: async () => true,
                unlock: async () => {},
            },
            schedulePoll: async (delay) => {
                polls.push(delay);
            },
            now: () => clock,
        };

        // ── Submit ──
        const submitted = await runEnrichmentBackfill(deps, { batchSize: 500 });
        assert.equal(submitted.step, 'submitted');
        assert.equal(polls.length, 1);
        const lines = uploads[0]
            .trim()
            .split('\n')
            .map((line) => JSON.parse(line));
        const nutritionLines = lines.filter((line) => line.custom_id.startsWith('nutrition-'));
        const shelfLifeLines = lines.filter((line) => line.custom_id.startsWith('shelf-life-'));
        // Only the bare ingredient needs nutrition; both need shelf life
        assert.deepEqual(
            Object.values(state!.nutrition).filter((id) => id.startsWith(PREFIX)),
            [BARE],
        );
        const ourNutrition = nutritionLines.find(
            (line) => state!.nutrition[line.custom_id] === BARE,
        );
        assert.deepEqual(ourNutrition.body.tools, [{ type: 'web_search' }]);
        assert.equal(ourNutrition.body.model, 'gpt-6.2-sol');
        assert.equal(ourNutrition.body.temperature, undefined);
        assert.match(ourNutrition.body.input, /"Karotte"/);
        assert.equal(ourNutrition.body.text.format.name, 'ingredient_enrichment');
        const shelfLifeIds = Object.values(state!.shelfLife).flat();
        assert.ok(shelfLifeIds.includes(BARE) && shelfLifeIds.includes(FULL));
        for (const line of shelfLifeLines) assert.equal(line.body.tools, undefined);

        // ── A second run (cron) while it runs: no new batch, no second poll ──
        clock = new Date('2026-11-21T05:31:00Z');
        assert.equal((await runEnrichmentBackfill(deps, {})).step, 'waiting');
        assert.equal(uploads.length, 1);
        assert.equal(polls.length, 1);

        // ── Completed: nutrition for BARE failed, shelf life fine ──
        batch.status = 'completed';
        const shelfLifeOutput = Object.entries(state!.shelfLife).map(([customId, ids]) =>
            responsesLine(customId, {
                items: ids
                    .filter((id) => id.startsWith(PREFIX))
                    .map((id) => ({ ...shelfLifeSample, id })),
            }),
        );
        batch.output = [
            ...Object.keys(state!.nutrition).map((customId) => responsesLine(customId, null, 500)),
            ...shelfLifeOutput,
        ].join('\n');
        const imported = await runEnrichmentBackfill(deps, {});
        assert.equal(imported.step, 'imported');
        assert.ok(imported.retryBatchId);
        for (const id of [BARE, FULL]) {
            const row = await prisma.ingredient.findUniqueOrThrow({ where: { id } });
            assert.equal(row.shelfLifeSource, 'AI');
            assert.ok(row.normalizedName);
        }
        assert.equal(
            (await prisma.ingredient.findUniqueOrThrow({ where: { id: BARE } })).energyKcal,
            null,
        );

        // Retry round: only the nutrition request of BARE, no shelf life
        assert.equal(state!.round, 1);
        assert.deepEqual(
            Object.values(state!.nutrition).filter((id) => id.startsWith(PREFIX)),
            [BARE],
        );
        assert.equal(
            Object.values(state!.shelfLife)
                .flat()
                .filter((id) => id.startsWith(PREFIX)).length,
            0,
        );

        // ── Retry completes ──
        batch.output = Object.entries(state!.nutrition)
            .map(([customId, id]) =>
                responsesLine(
                    customId,
                    id === BARE ? nutritionAnswer : null,
                    id === BARE ? 200 : 500,
                ),
            )
            .join('\n');
        const retried = await runEnrichmentBackfill(deps, {});
        assert.equal(retried.step, 'imported');
        const bare = await prisma.ingredient.findUniqueOrThrow({
            where: { id: BARE },
            include: { ingredientUnits: true, categories: true },
        });
        assert.equal(bare.energyKcal, 41);
        assert.equal(bare.ingredientUnits[0]?.grams, 60);
        assert.deepEqual(
            bare.categories.map((category) => category.id),
            [CAT_ID],
        );

        // Everything of ours is done: the dry run lists none of them
        const dry = await runEnrichmentBackfill(
            { ...deps, store: { ...deps.store, get: async () => null } },
            {
                dryRun: true,
                batchSize: 500,
            },
        );
        assert.equal(dry.step, 'dry-run');
        const remaining = await prisma.ingredient.count({
            where: {
                id: { startsWith: PREFIX },
                OR: [{ energyKcal: null }, { shelfLifeSource: null }],
            },
        });
        assert.equal(remaining, 0);
    },
);

test('findPendingSingleJobs: only waiting, active or delayed single jobs count', async () => {
    const { findPendingSingleJobs } = await load();
    const states: Record<string, string> = {
        'enrich-nutrition-a': 'waiting',
        'enrich-nutrition-b': 'active',
        'enrich-nutrition-c': 'delayed',
        'enrich-nutrition-d': 'failed',
        'enrich-nutrition-e': 'completed',
    };
    const asked: string[] = [];
    const pending = await findPendingSingleJobs(['a', 'b', 'c', 'd', 'e', 'f'], async (jobId) => {
        asked.push(jobId);
        return states[jobId] ? { getState: async () => states[jobId] } : null;
    });
    assert.deepEqual([...pending], ['a', 'b', 'c']);
    assert.equal(asked.length, 6);
});

test(
    'pending single job is not batched; still incomplete ingredients wait for the cooldown',
    { skip },
    async () => {
        const { prisma, runEnrichmentBackfill, ATTEMPT_COOLDOWN_MS } = await load();
        await prisma.ingredient.deleteMany({ where: { id: { startsWith: PREFIX } } });
        await prisma.ingredientCategory.deleteMany({ where: { id: CAT_ID } });
        await prisma.unit.deleteMany({ where: { id: UNIT_ID } });
        await prisma.unit.create({ data: { id: UNIT_ID, shortName: UNIT_ID, longName: 'Stück' } });
        await prisma.ingredientCategory.create({
            data: { id: CAT_ID, name: 'Gemüse', slug: CAT_ID },
        });
        const QUEUED = `${PREFIX}queued`;
        const STUCK = `${PREFIX}stuck`;
        const OLD = `${PREFIX}old`;
        const later = (minutes: number) => new Date(Date.now() + minutes * 60_000);
        // STUCK is the newest and will stay incomplete; OLD is older
        await prisma.ingredient.create({
            data: { id: QUEUED, name: 'Neu', slug: QUEUED, createdAt: later(30) },
        });
        await prisma.ingredient.create({
            data: { id: STUCK, name: 'Unklar', slug: STUCK, createdAt: later(20) },
        });
        await prisma.ingredient.create({
            data: { id: OLD, name: 'Alt', slug: OLD, createdAt: later(10) },
        });

        let state = null as EnrichmentBatchState | null;
        const uploads: string[] = [];
        const batch = { output: '' };
        const marks = new Map<string, Date>();
        const clock = new Date('2026-11-21T05:30:00Z');
        const deps: EnrichmentDeps = {
            prisma,
            api: {
                uploadJsonl: async (content) => {
                    uploads.push(content);
                    return `file-${uploads.length}`;
                },
                createBatch: async () => ({ id: `batch-${uploads.length}` }),
                retrieveBatch: async () => ({ status: 'completed', output_file_id: 'out' }),
                fileText: async () => batch.output,
            },
            store: {
                get: async () => state,
                set: async (next) => {
                    state = next;
                },
                clear: async () => {
                    state = null;
                },
                lock: async () => true,
                unlock: async () => {},
            },
            schedulePoll: async () => {},
            pendingSingleJobs: async (ids) => new Set(ids.filter((id) => id === QUEUED)),
            attempts: {
                recent: async (now) =>
                    [...marks]
                        .filter(([, at]) => now.getTime() - at.getTime() <= ATTEMPT_COOLDOWN_MS)
                        .map(([id]) => id),
                mark: async (ids, now) => {
                    for (const id of ids) marks.set(id, now);
                },
            },
            now: () => clock,
        };

        // The newest three minus the one with a pending single job
        const submitted = await runEnrichmentBackfill(deps, { batchSize: 3 });
        assert.equal(submitted.skippedPendingJobs, 1);
        const asked = () => [
            ...new Set([
                ...Object.values(state!.nutrition),
                ...Object.values(state!.shelfLife).flat(),
            ]),
        ];
        assert.deepEqual(asked().sort(), [OLD, STUCK].sort());

        // All rounds fail for STUCK and OLD: after the last round both are marked
        for (let round = 0; round <= 2; round += 1) {
            batch.output = '';
            const result = await runEnrichmentBackfill(deps, {});
            assert.equal(result.step, 'imported');
        }
        assert.equal(state, null);
        assert.deepEqual([...marks.keys()].sort(), [OLD, STUCK].sort());

        // Next day: marked ones wait, the rest goes first
        const dry = await runEnrichmentBackfill(deps, { dryRun: true, batchSize: 500 });
        assert.equal(dry.skippedRecentlyTried, 2);
        await prisma.ingredient.deleteMany({ where: { id: { startsWith: PREFIX } } });
    },
);
