import assert from 'node:assert/strict';
import { test } from 'node:test';

import { castRecipeUrl, servingCount } from './cast-recipe';

test('mobile/Cast serving counts reject nonpositive, nonfinite and malformed values', () => {
    assert.equal(servingCount('10', 5), 10);
    for (const x of ['Infinity', '-3', '0', '10junk', '', null, {}, true])
        assert.equal(servingCount(x, 5), 5);
});
test('Cast keeps old recipe messages and carries valid chosen portions', () => {
    assert.equal(castRecipeUrl({ type: 'LOAD_RECIPE', slug: 'langos' }), '/recipe/langos/mobile');
    assert.equal(
        castRecipeUrl({ type: 'LOAD_RECIPE', slug: 'langos', servings: 10 }),
        '/recipe/langos/mobile?servings=10',
    );
    assert.equal(
        castRecipeUrl({ type: 'LOAD_RECIPE', slug: 'langos', servings: -1 }),
        '/recipe/langos/mobile',
    );
    assert.equal(castRecipeUrl(null), null);
    assert.equal(castRecipeUrl({ type: 'LOAD_RECIPE', slug: {} }), null);
});
