import assert from 'node:assert/strict';
import test from 'node:test';

import type { RankingRecipe } from '../recipe-ranking/features';

import { isSauceTitle, pickSide, sideNeedOf } from './side-dish';

let seq = 0;
function recipe(
    title: string,
    categorySlugs: string[],
    ingredients: [string, string | null][] = [],
    over: Partial<RankingRecipe> = {},
): RankingRecipe {
    const id = over.id ?? `r${seq++}`;
    return {
        id,
        title,
        categorySlugs,
        tags: [],
        ingredients: ingredients.map(([name, root], i) => ({
            id: `${id}-${i}`,
            name,
            root,
            optional: false,
        })),
        rating: 4.2,
        ratingCount: 10,
        totalTime: 30,
        difficulty: 'EASY',
        stepCount: 3,
        embedding: null,
        ...over,
    };
}

const goulash = recipe(
    'Gulasch',
    ['hauptgericht'],
    [
        ['Rindfleisch', 'fleisch-und-innereien'],
        ['Paprika', 'gemuese'],
    ],
);
const carbonara = recipe(
    'Spaghetti Carbonara',
    ['hauptgericht'],
    [
        ['Spaghetti', null],
        ['Speck', null],
    ],
);
const complete = recipe(
    'Nudelpfanne',
    ['hauptgericht'],
    [
        ['Penne', null],
        ['Zucchini', null],
    ],
);
const bare = recipe('Rührei', ['hauptgericht'], [['Eier', 'eier']]);

test('starch missing → Beilage', () => {
    assert.equal(sideNeedOf(goulash), 'starch');
    const mash = recipe('Kartoffelpüree', ['beilage'], [['Kartoffeln', null]]);
    const salad = recipe('Gurkensalat', ['salat'], [['Gurke', null]]);
    assert.deepEqual(pickSide(goulash, [salad, mash]), { id: mash.id, need: 'starch' });
});

test('veg missing → Salat', () => {
    assert.equal(sideNeedOf(carbonara), 'veg');
    const mash = recipe('Kartoffelpüree', ['beilage'], [['Kartoffeln', null]]);
    const salad = recipe('Gurkensalat', ['salat'], [['Gurke', null]]);
    assert.deepEqual(pickSide(carbonara, [mash, salad]), { id: salad.id, need: 'veg' });
});

test('both missing → starch wins', () => {
    assert.equal(sideNeedOf(bare), 'starch');
});

test('nothing missing → null', () => {
    assert.equal(sideNeedOf(complete), null);
    assert.equal(pickSide(complete, [recipe('Kartoffelpüree', ['beilage'])]), null);
});

test('roots count as well as names', () => {
    const viaRoot = recipe(
        'Pfanne',
        ['hauptgericht'],
        [
            ['Etwas', 'getreideprodukte-huelsenfruechte-und-kartoffeln'],
            ['Mix', 'gemuese'],
        ],
    );
    assert.equal(sideNeedOf(viaRoot), null);
});

test('optional ingredients do not count', () => {
    const main = recipe('Gulasch', ['hauptgericht'], [['Rindfleisch', 'fleisch-und-innereien']]);
    main.ingredients.push({ id: 'opt', name: 'Kartoffeln', root: null, optional: true });
    assert.equal(sideNeedOf(main), 'starch');
});

test('sauce is never a side', () => {
    assert.equal(isSauceTitle('Bratensoße'), true);
    assert.equal(isSauceTitle('Tomatensauce'), true);
    assert.equal(isSauceTitle('Kartoffelpüree'), false);
    const sauce = recipe('Bratensoße', ['beilage'], [['Fond', null]], {
        rating: 5,
        ratingCount: 50,
    });
    assert.equal(pickSide(goulash, [sauce]), null);
});

test('never a main dish', () => {
    const both = recipe('Reispfanne', ['beilage', 'hauptgericht'], [['Reis', null]]);
    assert.equal(pickSide(goulash, [both]), null);
});

test('only the right category', () => {
    const salad = recipe('Gurkensalat', ['salat']);
    assert.equal(pickSide(goulash, [salad]), null);
});

test('filters apply', () => {
    // The caller filters candidates ("ohne Kartoffeln"): nothing left, no Ofenkartoffeln
    const candidates: RankingRecipe[] = [];
    assert.equal(pickSide(goulash, candidates), null);
});

test('ranks by similarity to the main and rating', () => {
    const main = recipe('Gulasch', ['hauptgericht'], [['Rindfleisch', 'fleisch-und-innereien']], {
        embedding: [1, 0],
    });
    const alike = recipe('Spätzle', ['beilage'], [], {
        embedding: [1, 0],
        rating: 4,
        ratingCount: 10,
    });
    const unlike = recipe('Reis', ['beilage'], [], {
        embedding: [0, 1],
        rating: 4,
        ratingCount: 10,
    });
    assert.equal(pickSide(main, [unlike, alike])?.id, alike.id);
});

test('no duplicate when the caller removes the taken side', () => {
    const pool = [
        recipe('Kartoffelpüree', ['beilage'], [], { rating: 4.8, ratingCount: 30 }),
        recipe('Spätzle', ['beilage'], [], { rating: 4.0, ratingCount: 30 }),
    ];
    const other = recipe('Schnitzel', ['hauptgericht'], [['Schwein', 'fleisch-und-wurstwaren']]);
    const first = pickSide(goulash, pool)!;
    const second = pickSide(
        other,
        pool.filter((c) => c.id !== first.id),
    )!;
    assert.notEqual(first.id, second.id);
});
