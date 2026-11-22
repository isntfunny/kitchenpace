// KUC-128: no automatic OpenAI calls with AI_AUTOMATION=off, no web search for
// a missing category, no endless retries, cache breakpoints on reused prompts.

import assert from 'node:assert/strict';
import test from 'node:test';

import { buildImportRequestBody } from '@app/lib/importer/import-prompt';
import { AI_SCHEDULED_JOBS, isAiAutomationEnabled } from '@shared/ai-automation';
import { contentText } from '@shared/prompt-cache';

import {
    ATTEMPT_COOLDOWN_MS,
    evaluateAttempts,
    MAX_ATTEMPTS,
    nextAttemptEntry,
    parseAttemptEntry,
} from './enrichment-backfill';
import { buildEnrichmentRequest, needsWebSearch } from './nutrition-processor';
import { buildScheduledJobDefinitions, staleRepeatableKeys } from './schedule-definitions';

test('AI automation is on by default and off only for AI_AUTOMATION=off', () => {
    assert.equal(isAiAutomationEnabled({}), true);
    assert.equal(isAiAutomationEnabled({ AI_AUTOMATION: 'on' }), true);
    assert.equal(isAiAutomationEnabled({ AI_AUTOMATION: 'off' }), false);
    assert.equal(isAiAutomationEnabled({ AI_AUTOMATION: ' OFF ' }), false);
});

const registry = {
    'backfill-ingredient-enrichment': {
        queue: 'scheduled',
        defaultData: {},
        repeat: { pattern: '30 5 * * *' },
    },
    'poll-openai-batches': {
        queue: 'scheduled',
        defaultData: {},
        repeat: { pattern: '*/15 * * * *' },
    },
    'trending-recipes': { queue: 'scheduled', defaultData: {}, repeat: { pattern: '0 6 * * *' } },
    'enrich-ingredient-nutrition': { queue: 'scheduled', defaultData: {} },
};
const repeated = (aiAutomation: boolean) =>
    buildScheduledJobDefinitions(registry, aiAutomation)
        .filter((job) => job.options?.repeat)
        .map((job) => job.name);

test('switched off, the scheduled AI jobs lose their repeat; the other jobs keep it', () => {
    assert.deepEqual(repeated(true), [
        'backfill-ingredient-enrichment',
        'poll-openai-batches',
        'trending-recipes',
    ]);
    assert.deepEqual(repeated(false), ['trending-recipes']);
    // Still in the catalog, so an admin can start them by hand
    assert.equal(buildScheduledJobDefinitions(registry, false).length, 4);
    for (const name of AI_SCHEDULED_JOBS) assert.ok(name in registry);
});

test('repeatables without a repeat definition are removed', () => {
    const keys = staleRepeatableKeys(
        [
            { name: 'backfill-ingredient-enrichment', key: 'a' },
            { name: 'trending-recipes', key: 'b' },
            { name: 'renamed-job', key: 'c' },
        ],
        new Set(repeated(false)),
    );
    assert.deepEqual(keys, ['a', 'c']);
});

const now = new Date('2026-11-23T04:30:00Z');
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 3600_000).toISOString();

test('attempt entries: bare timestamps from before count as one run', () => {
    assert.deepEqual(parseAttemptEntry('2026-11-22T04:40:02.467Z'), {
        at: '2026-11-22T04:40:02.467Z',
        count: 1,
    });
    assert.deepEqual(parseAttemptEntry('{"at":"2026-11-22T04:40:02.467Z","count":2}'), {
        at: '2026-11-22T04:40:02.467Z',
        count: 2,
    });
    assert.equal(parseAttemptEntry('kaputt'), null);
    assert.equal(parseAttemptEntry('{"at":1}'), null);
});

test('cooldown, then one more try, then left out for good', () => {
    assert.ok(ATTEMPT_COOLDOWN_MS === 7 * 24 * 3600_000 && MAX_ATTEMPTS === 2);
    const { excluded, invalid } = evaluateAttempts(
        {
            fresh: daysAgo(1),
            due: daysAgo(8),
            gaveUp: JSON.stringify({ at: daysAgo(100), count: 2 }),
            broken: 'x',
        },
        now,
    );
    assert.deepEqual(excluded.sort(), ['fresh', 'gaveUp']);
    // Past the cooldown it is selectable again but stays stored, so the count goes on
    assert.deepEqual(invalid, ['broken']);
    assert.deepEqual(nextAttemptEntry(daysAgo(8), now), { at: now.toISOString(), count: 2 });
    assert.deepEqual(nextAttemptEntry(null, now), { at: now.toISOString(), count: 1 });
});

const context = {
    units: [{ id: 'u1', shortName: 'g', longName: 'Gramm' }],
    categories: [
        { id: 'c1', slug: 'gemuese', name: 'Gemüse' },
        { id: 'c2', slug: 'backwaren', name: 'Backwaren' },
    ],
};

test('web search only when nutrition values or units are missing', () => {
    assert.equal(needsWebSearch({ energyKcal: null, ingredientUnits: [{}] }), true);
    assert.equal(needsWebSearch({ energyKcal: 20, ingredientUnits: [] }), true);
    assert.equal(needsWebSearch({ energyKcal: 20, ingredientUnits: [{}] }), false);
});

test('nutrition request: web search, instructions as cached developer message', () => {
    const body = buildEnrichmentRequest('Karotte', true, context) as Record<string, any>;
    assert.deepEqual(body.tools, [{ type: 'web_search' }]);
    assert.equal(body.instructions, undefined);
    assert.equal(body.input[0].role, 'developer');
    assert.deepEqual(body.input[0].content[0].prompt_cache_breakpoint, { mode: 'explicit' });
    assert.match(body.input[0].content[0].text, /gemuese → Gemüse/);
    assert.match(body.input[1].content, /"Karotte"/);
    assert.equal(body.text.format.name, 'ingredient_enrichment');
});

test('category-only request: no web search, only the category list, explicit cache', () => {
    const body = buildEnrichmentRequest('Muffinblech', false, context) as Record<string, any>;
    assert.equal(body.tools, undefined);
    assert.deepEqual(body.prompt_cache_options, { mode: 'explicit' });
    assert.equal(body.input[0].role, 'developer');
    assert.match(body.input[1].content, /"Muffinblech"/);
    assert.deepEqual(Object.keys(body.text.format.schema.properties), ['categories']);
    assert.deepEqual(body.text.format.schema.properties.categories.items.enum, [
        'gemuese',
        'backwaren',
    ]);
});

test('import: system prompt and context are cached, the recipe is not', () => {
    const body = buildImportRequestBody({
        markdown: '# Brot',
        sourceUrl: 'https://x.test/brot',
        context: { availableTags: ['Vegan'], topIngredients: ['Mehl'] },
    }) as unknown as Record<string, any>;
    assert.deepEqual(body.prompt_cache_options, { mode: 'explicit' });
    const [system, contextMessage, recipe] = body.messages;
    assert.deepEqual(system.content[0].prompt_cache_breakpoint, { mode: 'explicit' });
    assert.deepEqual(contextMessage.content[0].prompt_cache_breakpoint, { mode: 'explicit' });
    assert.match(contentText(contextMessage.content), /<bekannte_zutaten>\nMehl/);
    assert.equal(typeof recipe.content, 'string');
    assert.match(recipe.content, /<rezept>\n# Brot/);
});
