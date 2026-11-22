import assert from 'node:assert/strict';
import { test } from 'node:test';

import { leftoverCookServings } from '../../shared/meal-planning/distribute';

test('cooking for two meals doubles the servings like the server', () => {
    assert.equal(leftoverCookServings(2), 4);
    assert.equal(leftoverCookServings(3), 6);
});

test('cooking for two meals stays within 100 servings', () => {
    assert.equal(leftoverCookServings(50), 100);
    assert.equal(leftoverCookServings(60), 100);
});

test('cooking for two meals counts at least one eater', () => {
    assert.equal(leftoverCookServings(0), 2);
});
