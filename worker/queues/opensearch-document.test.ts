// KUC-126: the recipe document carries every category slug and the rating count.
import assert from 'node:assert/strict';
import test from 'node:test';

import { transformToDocument } from './opensearch-processor';

test('document carries all category slugs and rating count', () => {
    const doc = transformToDocument({
        id: 'r1',
        slug: 'gulasch',
        title: 'Gulasch',
        description: null,
        difficulty: 'MEDIUM',
        status: 'PUBLISHED',
        totalTime: 90,
        prepTime: 20,
        cookTime: 70,
        caloriesPerServing: null,
        rating: 4.5,
        ratingCount: 3,
        cookCount: 0,
        imageKey: null,
        publishedAt: null,
        updatedAt: new Date('2026-11-22T00:00:00Z'),
        flowNodes: [],
        tags: [{ tag: { name: 'Herbst' } }],
        recipeIngredients: [{ ingredient: { name: 'Rindfleisch' } }],
        categories: [
            { category: { name: 'Beilage', slug: 'beilage' } },
            { category: { name: 'Hauptgericht', slug: 'hauptgericht' } },
        ],
    });
    assert.deepEqual(doc.categorySlugs, ['beilage', 'hauptgericht']);
    assert.equal(doc.categorySlug, 'beilage');
    assert.equal(doc.ratingCount, 3);
});

test('document carries the derived main ingredients (KUC-131)', () => {
    const line = (name: string, slug: string, amount: string, unit = 'g') => ({
        isOptional: false,
        amount,
        unit: { shortName: unit, gramsDefault: null },
        ingredient: { name, categories: [{ slug, parent: null }], ingredientUnits: [] },
    });
    const doc = transformToDocument({
        id: 'r2',
        slug: 'bolognese',
        title: 'Spaghetti Bolognese',
        description: null,
        difficulty: 'EASY',
        status: 'PUBLISHED',
        totalTime: 40,
        prepTime: 10,
        cookTime: 30,
        caloriesPerServing: null,
        rating: 4,
        ratingCount: 1,
        cookCount: 0,
        imageKey: null,
        publishedAt: null,
        updatedAt: new Date('2026-11-23T00:00:00Z'),
        flowNodes: [],
        tags: [],
        recipeIngredients: [
            line('Rinderhackfleisch', 'fleisch-und-innereien', '500'),
            line('Spaghetti', 'getreideprodukte-huelsenfruechte-und-kartoffeln', '400'),
            line('Karotten', 'gemuese', '150'),
            line('Olivenöl', 'fette-und-oele', '2', 'EL'),
        ],
        categories: [],
    });
    assert.deepEqual(doc.mainIngredients, ['Rinderhackfleisch', 'Spaghetti']);
    assert.deepEqual(doc.ingredients, ['Rinderhackfleisch', 'Spaghetti', 'Karotten', 'Olivenöl']);
});
