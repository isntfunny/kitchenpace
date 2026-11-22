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
