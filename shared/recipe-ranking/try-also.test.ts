import assert from 'node:assert/strict';
import test from 'node:test';

import type { RankingRecipe } from './features';
import { pickTryAlso } from './try-also';
import { normalize } from './vector';

let seq = 0;
function recipe(over: Partial<RankingRecipe> = {}): RankingRecipe {
    const id = over.id ?? `r${seq++}`;
    return {
        id,
        title: over.title ?? id,
        categorySlugs: ['hauptgericht'],
        tags: [],
        ingredients: [],
        rating: 4.5,
        ratingCount: 20,
        totalTime: 30,
        difficulty: 'EASY',
        stepCount: 3,
        embedding: null,
        ...over,
    };
}

const base = { profile: null, picks: [], globalMean: 3.5, seed: 's1', need: 5, minBayes: 3.8 };

test('picks the farthest from the profile', () => {
    const profile = [1, 0, 0];
    const near = recipe({ id: 'near', title: 'Nudeln A', embedding: [1, 0, 0] });
    const mid = recipe({ id: 'mid', title: 'Reis B', embedding: normalize([1, 1, 0]) });
    const far = recipe({ id: 'far', title: 'Suppe C', embedding: [0, 0, 1] });
    const out = pickTryAlso([near, mid, far], { ...base, profile, need: 2 });
    assert.deepEqual(
        out.map((o) => o.id),
        ['far', 'mid'],
    );
    assert.equal(out[0]!.reason, 'Mal was anderes: Suppe/Eintopf');
});

test('uses the mean of the picks without profile', () => {
    const pick = recipe({ id: 'pick', embedding: [1, 0, 0] });
    const near = recipe({ id: 'near', title: 'Nudeln A', embedding: [1, 0, 0] });
    const far = recipe({ id: 'far', title: 'Suppe C', embedding: [0, 1, 0] });
    const out = pickTryAlso([pick, near, far], { ...base, picks: [pick], need: 1 });
    assert.deepEqual(
        out.map((o) => o.id),
        ['far'],
    );
});

test('one per dish type and style', () => {
    const pool = [
        recipe({ id: 'n1', title: 'Nudelpfanne', embedding: [0, 1, 0] }),
        recipe({ id: 'n2', title: 'Nudelauflauf', embedding: [0, 0.9, 0.1] }),
        recipe({ id: 'a1', title: 'Wok Gemüse', tags: ['Asiatisch'], embedding: [0, 0, 1] }),
        recipe({
            id: 'a2',
            title: 'Ofentofu',
            tags: ['Asiatisch', 'Ofengericht'],
            embedding: [0.1, 0, 0.9],
        }),
        recipe({ id: 'o1', title: 'Ofenfisch', tags: ['Ofengericht'], embedding: [0.2, 0, 0.8] }),
    ];
    const out = pickTryAlso(pool, { ...base, profile: [1, 0, 0] });
    const ids = out.map((o) => o.id);
    assert.equal(ids.filter((id) => id.startsWith('n')).length, 1);
    // a2 shares "Asiatisch" with a1, o1 shares "Ofengericht" with a2: only a1 and the unrelated one
    assert.ok(ids.includes('a1'));
    assert.ok(!ids.includes('a2'));
});

test('nothing from the list', () => {
    const pick = recipe({ id: 'pick', embedding: [1, 0, 0] });
    const other = recipe({ id: 'other', title: 'Suppe', embedding: [0, 1, 0] });
    const out = pickTryAlso([pick, other], { ...base, picks: [pick] });
    assert.deepEqual(
        out.map((o) => o.id),
        ['other'],
    );
});

test('below the rating bar only fills up', () => {
    const good = recipe({ id: 'good', title: 'Suppe', rating: 4.8, ratingCount: 30 });
    const weak = recipe({ id: 'weak', title: 'Reis', rating: 2.5, ratingCount: 30 });
    const out = pickTryAlso([weak, good], { ...base, need: 2 });
    assert.deepEqual(
        out.map((o) => o.id),
        ['good', 'weak'],
    );
    assert.deepEqual(
        pickTryAlso([weak, good], { ...base, need: 1 }).map((o) => o.id),
        ['good'],
    );
});

test('refill keeps need', () => {
    const pool = ['Suppe', 'Nudeln', 'Reis'].map((title) => recipe({ title, id: title }));
    assert.equal(pickTryAlso(pool, { ...base, need: 1 }).length, 1);
    assert.equal(pickTryAlso(pool, { ...base, need: 2 }).length, 2);
});

test('returns empty without candidates', () => {
    assert.deepEqual(pickTryAlso([], base), []);
    const pick = recipe({ id: 'p' });
    assert.deepEqual(pickTryAlso([pick], { ...base, picks: [pick] }), []);
});

test('seeded spread is stable', () => {
    const pool = [
        'Suppe',
        'Nudelpfanne',
        'Reisauflauf',
        'Linsenpfanne',
        'Fischpfanne',
        'Brotsalat',
    ].map((title) => recipe({ title, id: title }));
    const run = (seed: string) => pickTryAlso(pool, { ...base, seed, need: 3 }).map((o) => o.id);
    assert.deepEqual(run('a'), run('a'));
    assert.notDeepEqual(run('a'), run('b'));
});
