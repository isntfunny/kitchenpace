// enrich-ingredient-nutrition fills the shelf-life fields for new ingredients.
// OpenAI is mocked via fetch; needs a throwaway database
// (SHELF_LIFE_TEST_DATABASE_URL), never production.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';

import type { Job } from 'bullmq';

const url = process.env.SHELF_LIFE_TEST_DATABASE_URL;
const skip = url ? false : 'SHELF_LIFE_TEST_DATABASE_URL not set';
const ID = 'slenrich-gambas';

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
    return { prisma, processEnrichIngredientNutrition };
}

after(async () => {
    if (!url) return;
    const { prisma } = await load();
    await prisma.ingredient.deleteMany({ where: { id: ID } });
    await prisma.ingredientCategory.deleteMany({ where: { id: ID } });
    await prisma.unit.deleteMany({ where: { id: ID } });
    await prisma.$disconnect();
});

test('fully enriched but unassessed ingredient gets shelf life and name', { skip }, async () => {
    const { prisma, processEnrichIngredientNutrition } = await load();
    await prisma.ingredient.deleteMany({ where: { id: ID } });
    await prisma.ingredientCategory.deleteMany({ where: { id: ID } });
    await prisma.unit.deleteMany({ where: { id: ID } });
    await prisma.unit.create({ data: { id: ID, shortName: ID, longName: ID } });
    await prisma.ingredientCategory.create({ data: { id: ID, name: ID, slug: ID } });
    await prisma.ingredient.create({
        data: {
            id: ID,
            name: 'Garnelen, roh',
            slug: ID,
            energyKcal: 90,
            ingredientUnits: { create: [{ unitId: ID, grams: 1 }] },
            categories: { connect: [{ id: ID }] },
        },
    });

    const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body ?? '{}'));
        requests.push({ url: String(input), body });
        const text = JSON.stringify({ items: [{ ...gambas, id: ID }] });
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

    try {
        const result = await processEnrichIngredientNutrition({
            data: { ingredientId: ID },
        } as Job<{ ingredientId: string }>);
        assert.equal(result.shelfLife?.status, 'updated');
        assert.equal(requests.length, 1);
        assert.match(requests[0].url, /\/responses$/);
        assert.equal(requests[0].body.model, 'gpt-5.4');

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
    } finally {
        globalThis.fetch = originalFetch;
    }
});
