import assert from 'node:assert/strict';
import test from 'node:test';

import { dishTypeOf } from './dish-type';
import type { RankingRecipe } from './features';

function recipe(title: string, ingredients: [string, string | null][] = []): RankingRecipe {
    return {
        id: title,
        title,
        categorySlugs: ['hauptgericht'],
        tags: [],
        ingredients: ingredients.map(([name, root], i) => ({
            id: `${title}-${i}`,
            name,
            root,
            optional: false,
        })),
        rating: 0,
        ratingCount: 0,
        totalTime: 30,
        difficulty: 'EASY',
        stepCount: 3,
        embedding: null,
    };
}

test('title keywords decide', () => {
    assert.equal(dishTypeOf(recipe('Spaghetti Carbonara')), 'Nudeln');
    assert.equal(dishTypeOf(recipe('Linsensuppe')), 'Suppe/Eintopf');
});

test('falls back to the protein root', () => {
    assert.equal(dishTypeOf(recipe('Ofenlachs', [['Lachsfilet', 'fisch']])), 'Fisch');
    assert.equal(
        dishTypeOf(recipe('Rinderschmorbraten', [['Rindfleisch', 'fleisch-und-innereien']])),
        'Fleisch',
    );
    assert.equal(dishTypeOf(recipe('Ratatouille', [['Zucchini', 'gemuese']])), 'Gemüse/Sonstiges');
});

test('title hits tie by list order', () => {
    // "Salat" and "Nudeln" score 3 each: the earlier entry (Salat) wins
    assert.equal(dishTypeOf(recipe('Nudelsalat')), 'Salat');
});

test('ingredient hits count only above ingMin', () => {
    assert.equal(dishTypeOf(recipe('Auflauf', [['Kartoffeln', null]])), 'Gemüse/Sonstiges');
    assert.equal(
        dishTypeOf(
            recipe('Auflauf', [
                ['Kartoffeln', null],
                ['Süßkartoffeln', null],
            ]),
        ),
        'Kartoffel',
    );
    assert.equal(dishTypeOf(recipe('Auflauf', [['Penne', null]])), 'Nudeln');
});
