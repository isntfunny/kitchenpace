import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    inspirationCacheKey,
    isoWeekOf,
    pickInspiration,
    type InspirationCluster,
    type InspirationFilterSet,
    type InspirationInput,
} from './inspiration';

const TODAY = '2026-11-24'; // autumn

const set = (id: string, patch: Partial<InspirationFilterSet> = {}): InspirationFilterSet => ({
    id,
    type: 'TIME_SEASON',
    season: 'herbst',
    timeSlot: 'abend',
    label: `Set ${id}`,
    ...patch,
});

const cluster = (key: string, centroid: number[], patch: Partial<InspirationCluster> = {}) => ({
    key,
    label: `Thema ${key}`,
    centroid,
    size: 10,
    active: true,
    href: `/recipes?tags=${key}`,
    ...patch,
});

const base = (patch: Partial<InspirationInput> = {}): InspirationInput => ({
    today: TODAY,
    filterSets: [],
    ...patch,
});

test('at most two season chips of the current season, linking to the FilterSet', () => {
    const items = pickInspiration(
        base({
            filterSets: [
                set('a', { timeSlot: 'fruehstueck', sortOrder: 1 }),
                set('b', { timeSlot: 'mittag', sortOrder: 5 }),
                set('c', { timeSlot: 'abend', sortOrder: 4 }),
                set('summer', { season: 'sommer', timeSlot: 'abend' }),
                set('period', { type: 'FOOD_PERIOD', season: null }),
                set('wild', { season: '*' }),
            ],
        }),
    );
    const seasons = items.filter((item) => item.kind === 'season');
    // lunch/dinner sets first (by sortOrder), other seasons and FOOD_PERIOD never
    assert.deepEqual(
        seasons.map((s) => s.key),
        ['season:c', 'season:b'],
    );
    assert.equal(seasons[0].href, '/recipes?filterSetId=c');
    assert.ok(!items.some((item) => item.key === 'season:summer'));
});

test('season follows the date', () => {
    const sets = [set('winter', { season: 'winter' }), set('autumn')];
    assert.deepEqual(
        pickInspiration(base({ filterSets: sets, today: '2026-12-24' })).map((i) => i.key),
        ['season:winter'],
    );
});

test('themes are ranked by similarity to the taste profile, max three, only active ones', () => {
    const items = pickInspiration(
        base({
            tasteEmbedding: [1, 0],
            clusters: [
                cluster('far', [0, 1], { size: 99 }),
                cluster('near', [1, 0.1]),
                cluster('mid', [1, 1]),
                cluster('same', [1, 0]),
                cluster('hidden', [1, 0], { active: false }),
                cluster('also-far', [-1, 0]),
            ],
        }),
    );
    assert.deepEqual(
        items.filter((i) => i.kind === 'theme').map((i) => i.key),
        ['theme:same', 'theme:near', 'theme:mid'],
    );
});

test('without a taste profile clusters are ranked by size', () => {
    const clusters = [
        cluster('small', [1, 0], { size: 5 }),
        cluster('big', [0, 1], { size: 50 }),
        cluster('medium', [1, 1], { size: 20 }),
        cluster('tiny', [1, 1], { size: 2 }),
    ];
    for (const tasteEmbedding of [undefined, null, [], [0, 0]]) {
        assert.deepEqual(
            pickInspiration(base({ clusters, tasteEmbedding })).map((i) => i.key),
            ['theme:big', 'theme:medium', 'theme:small'],
        );
    }
});

test('themes whose recipes are all planned drop out; unknown members keep the theme', () => {
    const items = pickInspiration(
        base({
            plannedRecipeIds: ['r1', 'r2'],
            clusters: [
                cluster('done', [1, 0], { memberRecipeIds: ['r1', 'r2'], size: 50 }),
                cluster('partly', [1, 0], { memberRecipeIds: ['r1', 'r3'], size: 40 }),
                cluster('unknown', [1, 0], { size: 30 }),
                cluster('empty', [1, 0], { memberRecipeIds: [], size: 20 }),
            ],
        }),
    );
    assert.deepEqual(
        items.map((i) => i.key),
        ['theme:partly', 'theme:unknown', 'theme:empty'],
    );
});

test('themes without a usable link are skipped, the link can come from the filter', () => {
    const items = pickInspiration(
        base({
            clusters: [
                cluster('nolink', [1, 0], { href: undefined, size: 90 }),
                cluster('emptyfilter', [1, 0], {
                    href: undefined,
                    filter: { tags: [], categories: [] },
                    size: 80,
                }),
                cluster('fromfilter', [1, 0], {
                    href: undefined,
                    filter: { tags: ['Pasta', 'Italienisch'], categories: ['pasta'] },
                }),
            ],
        }),
    );
    assert.deepEqual(
        items.map((i) => i.key),
        ['theme:fromfilter'],
    );
    assert.equal(items[0].href, '/recipes?tags=Pasta&tags=Italienisch&categories=pasta');
});

test('without clusters popular tags fill the strip; with too few clusters they top it up', () => {
    const popularTags = [
        { name: 'Schnell', count: 40 },
        { name: 'Vegetarisch', count: 90 },
        { name: 'Pasta', count: 40 },
        { name: 'Backen', count: 10 },
    ];
    const none = pickInspiration(base({ popularTags }));
    assert.deepEqual(
        none.map((i) => [i.kind, i.label]),
        [
            ['tag', 'Vegetarisch'],
            ['tag', 'Pasta'],
            ['tag', 'Schnell'],
        ],
    );
    assert.equal(none[0].href, '/recipes?tags=Vegetarisch');

    const one = pickInspiration(
        base({ popularTags, clusters: [cluster('only', [1, 0], { label: 'Pasta' })] }),
    );
    assert.deepEqual(
        one.map((i) => i.label),
        ['Pasta', 'Vegetarisch', 'Schnell'],
    ); // no duplicate "Pasta"
});

test('the strip is never empty while any source exists, and empty only without sources', () => {
    assert.equal(pickInspiration(base({ filterSets: [set('a')] })).length, 1);
    assert.equal(pickInspiration(base({ popularTags: [{ name: 'X', count: 1 }] })).length, 1);
    assert.equal(pickInspiration(base({ clusters: [cluster('c', [1])] })).length, 1);
    assert.deepEqual(pickInspiration(base()), []);
    // a fully planned cluster does not count as a source, but tags still do
    assert.equal(
        pickInspiration(
            base({
                plannedRecipeIds: ['r1'],
                clusters: [cluster('c', [1], { memberRecipeIds: ['r1'] })],
                popularTags: [{ name: 'X', count: 1 }],
            }),
        )[0].kind,
        'tag',
    );
});

test('full strip: two seasons then three themes, deterministic', () => {
    const input = base({
        filterSets: [set('a'), set('b'), set('c')],
        tasteEmbedding: [1, 0],
        clusters: ['x', 'y', 'z', 'w'].map((key, i) => cluster(key, [1, i])),
        popularTags: [{ name: 'Tag', count: 5 }],
    });
    const items = pickInspiration(input);
    assert.deepEqual(
        items.map((i) => i.kind),
        ['season', 'season', 'theme', 'theme', 'theme'],
    );
    assert.deepEqual(pickInspiration(input), items);
    assert.ok(items.every((i) => i.label && i.href.startsWith('/recipes')));
});

test('isoWeekOf handles year boundaries', () => {
    assert.equal(isoWeekOf('2026-11-24'), '2026-W48');
    assert.equal(isoWeekOf('2026-01-01'), '2026-W01');
    assert.equal(isoWeekOf('2027-01-01'), '2026-W53'); // Friday, belongs to 2026's last week
    assert.equal(isoWeekOf('2024-12-30'), '2025-W01'); // Monday of 2025-W01
    assert.equal(isoWeekOf('2026-11-29'), '2026-W48'); // Sunday
});

test('inspirationCacheKey is per user and week and validates its input', () => {
    assert.equal(inspirationCacheKey('u1', '2026-W48'), 'inspiration:v1:u1:2026-W48');
    assert.notEqual(inspirationCacheKey('u1', '2026-W48'), inspirationCacheKey('u2', '2026-W48'));
    assert.notEqual(inspirationCacheKey('u1', '2026-W48'), inspirationCacheKey('u1', '2026-W49'));
    assert.equal(inspirationCacheKey('u1', isoWeekOf('2026-11-24')), 'inspiration:v1:u1:2026-W48');
    assert.throws(() => inspirationCacheKey('', '2026-W48'), /userId/);
    assert.throws(() => inspirationCacheKey('u1', '2026-48'), /invalid ISO week/);
});
