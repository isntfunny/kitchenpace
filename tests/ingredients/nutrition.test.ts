import assert from 'node:assert/strict';
import { test } from 'node:test';

import { calculateRecipeNutrition } from '../../src/lib/nutrition/calculate';

test('nutrition counts each known occurrence once and reports an unknown occurrence', () => {
    const row = {
        name: 'Salz',
        amount: '2',
        unitShortName: 'g',
        energyKcal: 100,
        protein: 0,
        fat: 0,
        carbs: 0,
        fiber: 0,
        ingredientUnitGrams: 1,
        unitGramsDefault: 1,
    };
    const result = calculateRecipeNutrition([row, { ...row, amount: '3' }, { ...row, amount: '' }]);
    assert.equal(result.calories, 5);
    assert.deepEqual(result.missingIngredients, ['Salz']);
});
