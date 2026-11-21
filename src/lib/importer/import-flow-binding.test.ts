// Flow binding shared by the import save and the full re-import dry run (KUC-115).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bindImportedFlow, importedFlowProblems } from './import-flow-binding';

const ingredients = [
    { id: 'imp-0', name: 'Zwiebel', amount: '2', unit: 'Stk', isOptional: false },
    { id: 'imp-1', name: 'Wasser', amount: '1', unit: 'l', isOptional: false },
];
const node = (id: string, description: string) => ({
    id,
    type: 'kochen',
    label: 'Schritt',
    description,
    ingredientIds: [],
});

test('binds import ids to row ids, keeps display text and partial amounts', () => {
    const bound = bindImportedFlow(
        {
            ingredients,
            flowNodes: [node('a', 'Die @[Zwiebeln](imp-0) mit @[Wasser|500 ml](imp-1) kochen.')],
        },
        new Map([
            ['imp-0', 'row-a'],
            ['imp-1', 'row-b'],
        ]),
    );
    assert.deepEqual(bound.issues, []);
    assert.equal(
        bound.nodes[0].description,
        'Die @[Zwiebeln](row-a) mit @[Wasser|500 ml](row-b) kochen.',
    );
    assert.deepEqual(bound.nodes[0].ingredientIds, ['row-a', 'row-b']);
});

test('dry-run check: a mention without a matching ingredient is a problem', () => {
    assert.deepEqual(
        importedFlowProblems({
            ingredients,
            flowNodes: [node('a', 'Die @[Zwiebeln](imp-0) und @[Wasser](imp-1) kochen.')],
        }),
        [],
    );
    const problems = importedFlowProblems({
        ingredients,
        flowNodes: [node('a', 'Mit @[Salz](imp-9) würzen, @[Zwiebeln](imp-0), @[Wasser](imp-1).')],
    });
    assert.equal(problems.length, 1);
    assert.match(problems[0], /^nodes\.a: Erwähnung "Salz"/);
    assert.deepEqual(
        importedFlowProblems({ ingredients: [ingredients[0], ingredients[0]], flowNodes: [] }),
        ['Doppelte Import-Zutaten-ID'],
    );
});
