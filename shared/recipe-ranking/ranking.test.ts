import assert from 'node:assert/strict';
import test from 'node:test';

import { RANKING_CONFIG } from './config';
import { dishTypeOf } from './dish-type';
import { meaningfulIngredientIds, type RankingRecipe } from './features';
import { diversify } from './mmr';
import { scoreCandidates, type ScoreContext } from './score';
import { bayesRating, dot, globalMeanRating, normalize, searchVector } from './vector';

const close = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

let seq = 0;
function recipe(over: Partial<RankingRecipe> & { id?: string } = {}): RankingRecipe {
    const id = over.id ?? `r${seq++}`;
    return {
        id,
        title: id,
        categorySlugs: ['hauptgericht'],
        tags: [],
        ingredients: [],
        rating: 4,
        ratingCount: 10,
        totalTime: 30,
        difficulty: 'EASY',
        stepCount: 3,
        embedding: null,
        ...over,
    };
}
const ing = (id: string, name = id) => ({ id, name, root: null, optional: false });

const ctx = (over: Partial<ScoreContext> = {}): ScoreContext => ({
    profile: null,
    picks: [],
    season: 'herbst',
    globalMean: 3.5,
    expiring: [],
    withReasons: false,
    ...over,
});

const byId = (xs: { id: string; relevance: number }[]) =>
    new Map(xs.map((x) => [x.id, x.relevance]));

test('search vector', () => {
    const profile = [2, 0, 0];
    assert.deepEqual(searchVector(profile, []), [1, 0, 0]);

    // 2 picks: b = 0.3
    const picks = [
        [0, 1, 0],
        [0, 1, 0],
    ];
    const v = searchVector([1, 0, 0], picks)!;
    const expected = normalize([0.7, 0.3, 0]);
    expected.forEach((x, i) => close(v[i]!, x));

    // 5 picks: b capped at 0.5
    const five = searchVector([1, 0, 0], Array(5).fill([0, 1, 0]))!;
    const cap = normalize([0.5, 0.5, 0]);
    cap.forEach((x, i) => close(five[i]!, x));

    // no profile, 1 pick: the normalised pick
    assert.deepEqual(searchVector(null, [[0, 2, 0]]), [0, 1, 0]);
    // all-zero profile counts as no profile
    assert.deepEqual(searchVector([0, 0, 0], [[0, 2, 0]]), [0, 1, 0]);
    assert.equal(searchVector(null, []), null);
});

test('bayes damps single ratings', () => {
    assert.ok(bayesRating(5, 1, 3.5, 5) < bayesRating(4.6, 40, 3.5, 5));
    assert.equal(
        globalMeanRating(
            [
                { rating: 5, ratingCount: 2 },
                { rating: 4, ratingCount: 2 },
                { rating: 3, ratingCount: 2 },
                { rating: 0, ratingCount: 0 },
            ],
            20,
        ),
        3.5,
    );
    close(
        globalMeanRating(
            [
                { rating: 5, ratingCount: 1 },
                { rating: 3, ratingCount: 3 },
            ],
            2,
        ),
        3.5,
    );
});

test('weights order', () => {
    // taste differs (1 vs 0), season differs (in season vs other season) — everything else equal
    const tasteHigh = recipe({ id: 'tasteHigh', embedding: [1, 0, 0] });
    const tasteLow = recipe({ id: 'tasteLow', embedding: [0, 1, 0] });
    const seasonHigh = recipe({ id: 'seasonHigh', embedding: [0.6, 0.8, 0], tags: ['Herbst'] });
    const seasonLow = recipe({ id: 'seasonLow', embedding: [0.6, 0.8, 0], tags: ['Sommer'] });

    const taste = byId(scoreCandidates([tasteHigh, tasteLow], ctx({ profile: [1, 0, 0] })));
    const tasteGap = taste.get('tasteHigh')! - taste.get('tasteLow')!;

    const season = byId(scoreCandidates([seasonHigh, seasonLow], ctx({ profile: [1, 0, 0] })));
    const seasonGap = season.get('seasonHigh')! - season.get('seasonLow')!;

    assert.ok(tasteGap > seasonGap, `${tasteGap} > ${seasonGap}`);
    assert.ok(seasonGap > 0);
});

test('shared ingredients lift, near duplicates drop', () => {
    const pick = recipe({
        id: 'pick',
        ingredients: [ing('tomate'), ing('feta'), ing('salz', 'Salz'), ing('oel', 'Olivenöl')],
        embedding: [1, 0, 0],
    });
    const withShared = recipe({
        id: 'shared',
        ingredients: [ing('tomate'), ing('feta')],
        embedding: [0.3, 0.954, 0],
    });
    const without = recipe({
        id: 'without',
        ingredients: [ing('kohl')],
        embedding: [0.3, 0.954, 0],
    });
    const onlyBasics = recipe({
        id: 'basics',
        ingredients: [ing('salz', 'Salz'), ing('oel', 'Olivenöl')],
        embedding: [0.3, 0.954, 0],
    });
    const scored = byId(scoreCandidates([withShared, without, onlyBasics], ctx({ picks: [pick] })));
    assert.ok(scored.get('shared')! > scored.get('without')!);
    close(scored.get('basics')!, scored.get('without')!);

    // salt and oil are never "meaningful"
    assert.deepEqual([...meaningfulIngredientIds(pick)].sort(), ['feta', 'tomate']);

    const near = recipe({ id: 'near', embedding: normalize([0.9, 0.436, 0]) });
    const far = recipe({ id: 'far', embedding: normalize([0.3, 0.954, 0]) });
    assert.ok(dot(near.embedding!, pick.embedding!) > 0.8);
    const dup = byId(scoreCandidates([near, far], ctx({ picks: [pick] })));
    assert.ok(dup.get('near')! < dup.get('far')!);
});

test('ranks without profile and picks', () => {
    const inSeason = recipe({ id: 'inSeason', tags: ['Herbst'], rating: 4, ratingCount: 10 });
    const neutral = recipe({ id: 'neutral', rating: 4, ratingCount: 10 });
    const offSeason = recipe({ id: 'offSeason', tags: ['Sommer'], rating: 4, ratingCount: 10 });
    const best = recipe({ id: 'best', rating: 5, ratingCount: 30 });
    const scored = scoreCandidates([offSeason, neutral, best, inSeason], ctx());
    assert.ok(scored.every((s) => s.parts.taste === 0.5));
    assert.ok(scored.every((s) => s.parts.pick === 0.5));
    // sorted by relevance, best first: the order follows season and rating
    assert.deepEqual(
        scored.map((s) => s.id),
        ['inSeason', 'best', 'neutral', 'offSeason'],
    );
});

test('works for candidates without embedding', () => {
    const scored = scoreCandidates(
        [recipe({ id: 'a', embedding: [1, 0, 0] }), recipe({ id: 'b', embedding: null })],
        ctx({ profile: [1, 0, 0], picks: [recipe({ embedding: [1, 0, 0] })] }),
    );
    assert.equal(scored.length, 2);
    assert.ok(scored.every((s) => Number.isFinite(s.relevance)));
});

test('expiring stock counts only when there is stock', () => {
    const cream = recipe({
        id: 'cream',
        ingredients: [ing('sahne', 'Sahne'), ing('lauch', 'Lauch')],
    });
    const other = recipe({ id: 'other', ingredients: [ing('kohl')] });
    const expiring = [{ id: 'sahne', name: 'Sahne' }];
    const none = byId(scoreCandidates([cream, other], ctx()));
    close(none.get('cream')!, none.get('other')!);
    const withStock = scoreCandidates([cream, other], ctx({ expiring, withReasons: true }));
    assert.equal(withStock[0]!.id, 'cream');
    assert.equal(withStock[0]!.reason, 'Verbraucht Sahne');
    assert.ok(withStock[0]!.parts.expiring > 0);
    assert.equal(withStock[1]!.parts.expiring, 0);
});

test('reasons', () => {
    const pick = recipe({ id: 'pick', ingredients: [ing('a'), ing('b'), ing('c')] });
    const cand = recipe({
        id: 'cand',
        ingredients: [ing('a'), ing('b'), ing('z')],
        ratingCount: 1,
    });
    const on = scoreCandidates([cand], ctx({ picks: [pick], withReasons: true }));
    assert.equal(on[0]!.reason, 'Teilt 2 Zutaten mit deiner Auswahl');
    const off = scoreCandidates([cand], ctx({ picks: [pick] }));
    assert.equal(off[0]!.reason, undefined);

    const seasonal = recipe({ tags: ['Herbst'], ratingCount: 1 });
    assert.equal(
        scoreCandidates([seasonal], ctx({ withReasons: true }))[0]!.reason,
        'Passt zum Herbst',
    );
    const plain = recipe({ ratingCount: 1 });
    assert.equal(
        scoreCandidates([plain], ctx({ withReasons: true }))[0]!.reason,
        'Gut für die Woche',
    );
    // "Gut bewertet" needs at least 3 ratings
    const rated = recipe({ rating: 5, ratingCount: 40 });
    assert.equal(scoreCandidates([rated], ctx({ withReasons: true }))[0]!.reason, 'Gut bewertet');
});

test('mmr caps dish types', () => {
    // 10 pasta dishes, slightly more relevant and alike, plus 14 others of different kinds
    const pasta = Array.from({ length: 10 }, (_, i) =>
        recipe({
            id: `pasta${i}`,
            title: `Nudelpfanne ${i}`,
            rating: 5,
            ratingCount: 30,
            embedding: normalize([1, 0.1 * i, 0, 0, 0]),
        }),
    );
    const dims = 14;
    const others = Array.from({ length: dims }, (_, i) =>
        recipe({
            id: `other${i}`,
            title: ['Suppe', 'Salat', 'Reis', 'Brot', 'Kartoffel', 'Linsen'][i % 6]! + ` ${i}`,
            rating: 4.2,
            ratingCount: 30,
            embedding: normalize([
                0,
                0,
                ...Array.from({ length: dims }, (_, j) => (i === j ? 1 : 0)),
            ]),
        }),
    );
    const padded = pasta.map((p) => ({
        ...p,
        embedding: [...p.embedding!, ...Array(dims - 3).fill(0)],
    }));
    const pool = [...padded, ...others];
    const scored = scoreCandidates(pool, ctx());
    const ordered = diversify(scored, new Map(pool.map((r) => [r.id, r])), []);
    assert.equal(ordered.length, pool.length);
    assert.equal(new Set(ordered.map((o) => o.id)).size, pool.length);
    const top = ordered.slice(0, RANKING_CONFIG.listSize);
    assert.ok(
        top.filter((o) => dishTypeOf(pool.find((r) => r.id === o.id)!) === 'Nudeln').length <= 3,
    );
    // without diversity all pasta would come first
    assert.ok(scored.slice(0, 10).every((s) => s.dishType === 'Nudeln'));
});

test('mmr pushes away from picks', () => {
    const pick = recipe({ id: 'pick', embedding: [1, 0, 0] });
    const alike = recipe({ id: 'alike', embedding: normalize([0.95, 0.31, 0]), rating: 4.6 });
    const different = recipe({ id: 'different', embedding: [0, 1, 0], rating: 4.5 });
    const pool = new Map([alike, different].map((r) => [r.id, r]));
    const ordered = diversify(scoreCandidates([alike, different], ctx({ picks: [pick] })), pool, [
        pick,
    ]);
    assert.equal(ordered[0]!.id, 'different');
});
