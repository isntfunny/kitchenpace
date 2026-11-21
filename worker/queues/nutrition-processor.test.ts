// enrich-ingredient-nutrition fills the shelf-life fields for new ingredients.
// OpenAI is mocked via fetch; needs a throwaway database
// (SHELF_LIFE_TEST_DATABASE_URL), never production.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';

import type { Job } from 'bullmq';

const url = process.env.SHELF_LIFE_TEST_DATABASE_URL;
const skip = url ? false : 'SHELF_LIFE_TEST_DATABASE_URL not set';
const PREFIX = 'slenrich-';
const ID = `${PREFIX}gambas`;
const MANUAL_ID = `${PREFIX}manual`;
const BACKFILL_ID = `${PREFIX}backfill`;
const UNIT_ID = ID;
const CAT_ID = ID;

const [gambas] = JSON.parse(
    readFileSync(
        new URL('../../shared/ingredient-shelf-life/fixtures/results-sample.json', import.meta.url),
        'utf8',
    ),
);

async function load() {
    process.env.DATABASE_URL = url;
    process.env.OPENAI_API_KEY = 'test-key-not-real';
    const { prisma } = await import('./prisma');
    const { processEnrichIngredientNutrition } = await import('./nutrition-processor');
    const { runEnrichmentBackfill } = await import('./enrichment-backfill');
    return { prisma, processEnrichIngredientNutrition, runEnrichmentBackfill };
}

type CapturedRequest = { url: string; body: Record<string, unknown> };

const originalFetch = globalThis.fetch;
let activeRequests: CapturedRequest[] = [];
let activeItemForId: (id: string) => Record<string, unknown> = (id) => ({ ...gambas, id });

if (url) {
    // OpenAI SDK caches globalThis.fetch on singleton construction, so keep a
    // single wrapper installed for the whole test file and swap per-test state.
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
        activeRequests.push({ url: String(input), body });
        const inputText = String(body.input ?? '');
        const match = inputText.match(/"id":"([^"]+)"/);
        const targetId = match ? match[1] : ID;
        const text = JSON.stringify({ items: [activeItemForId(targetId)] });
        return new Response(
            JSON.stringify({
                id: 'resp_test',
                object: 'response',
                status: 'completed',
                output: [
                    {
                        type: 'message',
                        id: 'msg',
                        role: 'assistant',
                        status: 'completed',
                        content: [{ type: 'output_text', text, annotations: [] }],
                    },
                ],
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
        );
    }) as typeof fetch;
}

function useOpenAiMock(
    requests: CapturedRequest[],
    itemForId: (id: string) => Record<string, unknown>,
) {
    activeRequests = requests;
    activeItemForId = itemForId;
}

async function resetFixtures(prisma: Awaited<ReturnType<typeof load>>['prisma']) {
    await prisma.ingredient.deleteMany({ where: { id: { startsWith: PREFIX } } });
    await prisma.ingredientCategory.deleteMany({ where: { id: CAT_ID } });
    await prisma.unit.deleteMany({ where: { id: UNIT_ID } });
    await prisma.unit.create({ data: { id: UNIT_ID, shortName: UNIT_ID, longName: UNIT_ID } });
    await prisma.ingredientCategory.create({ data: { id: CAT_ID, name: CAT_ID, slug: CAT_ID } });
}

after(async () => {
    globalThis.fetch = originalFetch;
    if (!url) return;
    const { prisma } = await load();
    await prisma.ingredient.deleteMany({ where: { id: { startsWith: PREFIX } } });
    await prisma.ingredientCategory.deleteMany({ where: { id: CAT_ID } });
    await prisma.unit.deleteMany({ where: { id: UNIT_ID } });
    await prisma.$disconnect();
});

test('fully enriched but unassessed ingredient gets shelf life and name', { skip }, async () => {
    const { prisma, processEnrichIngredientNutrition } = await load();
    await resetFixtures(prisma);
    await prisma.ingredient.create({
        data: {
            id: ID,
            name: 'Garnelen, roh',
            slug: ID,
            energyKcal: 90,
            ingredientUnits: { create: [{ unitId: UNIT_ID, grams: 1 }] },
            categories: { connect: [{ id: CAT_ID }] },
        },
    });

    const requests: CapturedRequest[] = [];
    useOpenAiMock(requests, (targetId) => ({ ...gambas, id: targetId }));

    const result = await processEnrichIngredientNutrition({
        data: { ingredientId: ID },
    } as Job<{ ingredientId: string }>);
    assert.equal(result.shelfLife?.status, 'updated');
    assert.equal(requests.length, 1);
    assert.match(requests[0].url, /\/responses$/);
    assert.equal(requests[0].body.model, 'gpt-6.2-sol');

    const saved = await prisma.ingredient.findUniqueOrThrow({
        where: { id: ID },
        include: { storageLives: true },
    });
    assert.equal(saved.name, 'Garnelen, roh');
    assert.equal(saved.normalizedName, 'Gambas');
    assert.equal(saved.shelfLifeSource, 'AI');
    assert.equal(saved.defaultStorage, 'FRIDGE');
    assert.equal(saved.storageLives.length, 2);

    // Assessed now: a second run makes no request
    const again = await processEnrichIngredientNutrition({
        data: { ingredientId: ID },
    } as Job<{ ingredientId: string }>);
    assert.equal(again.shelfLife?.status, 'skipped');
    assert.equal(requests.length, 1);
});

test(
    'MANUAL shelf life is never overwritten when filling missing normalizedName',
    { skip },
    async () => {
        const { prisma, processEnrichIngredientNutrition } = await load();
        await resetFixtures(prisma);
        await prisma.ingredient.create({
            data: {
                id: MANUAL_ID,
                name: 'Garnelen, getrocknet',
                slug: MANUAL_ID,
                energyKcal: 90,
                ingredientUnits: { create: [{ unitId: UNIT_ID, grams: 1 }] },
                categories: { connect: [{ id: CAT_ID }] },
                shelfLifeSource: 'MANUAL',
                defaultStorage: 'PANTRY',
                normalizedName: null,
                pluralName: null,
                storageLives: { create: [{ storage: 'PANTRY', days: 30 }] },
            },
        });

        const requests: CapturedRequest[] = [];
        useOpenAiMock(requests, (targetId) => ({
            ...gambas,
            id: targetId,
        }));

        const first = await processEnrichIngredientNutrition({
            data: { ingredientId: MANUAL_ID },
        } as Job<{ ingredientId: string }>);
        assert.equal(first.shelfLife?.status, 'updated');
        assert.equal(requests.length, 1);
        assert.equal(requests[0].body.model, 'gpt-6.2-sol');

        const saved = await prisma.ingredient.findUniqueOrThrow({
            where: { id: MANUAL_ID },
            include: { storageLives: true },
        });
        assert.equal(saved.normalizedName, 'Gambas');
        assert.equal(saved.pluralName, 'Gambas');
        assert.equal(saved.shelfLifeSource, 'MANUAL');
        assert.equal(saved.defaultStorage, 'PANTRY');
        assert.deepEqual(
            saved.storageLives.map(({ storage, days }) => ({ storage, days })),
            [{ storage: 'PANTRY', days: 30 }],
        );

        const second = await processEnrichIngredientNutrition({
            data: { ingredientId: MANUAL_ID },
        } as Job<{ ingredientId: string }>);
        assert.equal(second.shelfLife?.status, 'skipped');
        assert.equal(requests.length, 1);
    },
);

test(
    'missing nutrition: direct request with web_search, then shelf life without tools',
    { skip },
    async () => {
        const { prisma, processEnrichIngredientNutrition } = await load();
        await resetFixtures(prisma);
        await prisma.ingredient.create({
            data: { id: ID, name: 'Garnelen, roh', slug: ID },
        });

        const requests: CapturedRequest[] = [];
        useOpenAiMock(requests, (targetId) => ({ ...gambas, id: targetId }));

        await processEnrichIngredientNutrition({
            data: { ingredientId: ID },
        } as Job<{ ingredientId: string }>);
        assert.equal(requests.length, 2);
        assert.deepEqual(requests[0].body.tools, [{ type: 'web_search' }]);
        assert.equal(requests[0].body.model, 'gpt-6.2-sol');
        assert.equal(requests[0].body.temperature, undefined);
        assert.equal(requests[1].body.tools, undefined);
    },
);

test(
    'backfill finds ingredient with nutrition, units and categories when shelfLifeSource is null',
    { skip },
    async () => {
        const { prisma, runEnrichmentBackfill } = await load();
        await resetFixtures(prisma);
        await prisma.ingredient.create({
            data: {
                id: BACKFILL_ID,
                name: 'Backfill-Zutat-Ohne-Haltbarkeit',
                slug: BACKFILL_ID,
                energyKcal: 90,
                ingredientUnits: { create: [{ unitId: UNIT_ID, grams: 1 }] },
                categories: { connect: [{ id: CAT_ID }] },
                shelfLifeSource: null,
                normalizedName: 'Backfill-Zutat',
                normalizedNameManual: true,
                // Sort newest-first puts this test ingredient at position 0 even
                // if other test suites run concurrently against the same DB.
                createdAt: new Date(Date.now() + 60_000),
            },
        });

        const unused = async () => {
            throw new Error('a dry run must not call the batch API');
        };
        const deps = {
            prisma,
            api: {
                uploadJsonl: unused,
                createBatch: unused,
                retrieveBatch: unused,
                fileText: unused,
            },
            store: {
                get: async () => null,
                set: unused,
                clear: unused,
                lock: async () => true,
                unlock: async () => {},
            },
            schedulePoll: unused,
        };

        const logs: string[] = [];
        const originalLog = console.log;
        console.log = (...args: unknown[]) => {
            logs.push(args.map((arg) => String(arg)).join(' '));
        };

        try {
            const foundRun = await runEnrichmentBackfill(deps, { batchSize: 1, dryRun: true });
            assert.equal(foundRun.step, 'dry-run');
            assert.equal(foundRun.total, 1);
            assert.equal(foundRun.nutrition, 0);
            assert.equal(foundRun.shelfLife, 1);
            assert.ok(
                logs.some((line) =>
                    line.includes('[DRY RUN] Would submit: Backfill-Zutat-Ohne-Haltbarkeit'),
                ),
            );

            await prisma.ingredient.update({
                where: { id: BACKFILL_ID },
                data: { shelfLifeSource: 'AI' },
            });

            logs.length = 0;
            await runEnrichmentBackfill(deps, { batchSize: 50, dryRun: true });
            assert.equal(
                logs.some((line) =>
                    line.includes('[DRY RUN] Would submit: Backfill-Zutat-Ohne-Haltbarkeit'),
                ),
                false,
            );
        } finally {
            console.log = originalLog;
        }
    },
);
