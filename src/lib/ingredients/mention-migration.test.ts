import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    planRecipeRepair,
    snapshotFingerprint,
    assertSnapshotMatches,
    extractImportEvidence,
} from './mention-migration';

const fixture = {
    id: 'recipe',
    slug: 'langos',
    updatedAt: '2026-10-07T00:00:00.000Z',
    flowNodes: [
        {
            id: 's',
            description: '@[Milch](imported_4)',
            ingredientIds: ['imported_4'],
            photoKey: 'photo',
        },
    ],
    ingredients: [
        {
            id: 'milk',
            ingredientId: 'catalogue',
            unitId: 'ml',
            name: 'Milch',
            amount: '100',
            unit: 'ml',
            notes: 'lauwarm',
            position: 0,
            isOptional: false,
        },
    ],
};

test('migration proposes quantity-preserving changes without mutating its input', () => {
    const before = structuredClone(fixture);
    const plan = planRecipeRepair(fixture);
    assert.equal(plan.after.flowNodes[0].description, '@[Milch](milk)');
    assert.equal(plan.after.ingredients[0].amount, '100');
    assert.deepEqual(fixture, before);
    assert.equal(plan.changed, true);
    assert.equal(planRecipeRepair(plan.after).changed, false);
});

test('manual decisions can restore a reviewed duplicate without borrowing the dough quantity', () => {
    const snapshot = { ...fixture, flowNodes: [{ id: 's', description: '@[Milch](imported_9)' }] };
    const plan = planRecipeRepair(snapshot, {
        sourceIds: { imported_9: 'second-milk' },
        restoreRows: [
            {
                ...fixture.ingredients[0],
                id: 'second-milk',
                amount: '',
                notes: 'zum Abschmecken',
                position: 1,
            },
        ],
    });
    assert.equal(plan.after.flowNodes[0].description, '@[Milch](second-milk)');
    assert.equal(plan.after.ingredients[1].amount, '');
    assert.deepEqual(plan.issues, []);
});

test('optimistic checks reject ingredient edits even when the recipe timestamp is unchanged', () => {
    const edited = structuredClone(fixture);
    edited.ingredients[0].amount = '200';
    assert.throws(() => assertSnapshotMatches(fixture, edited), /changed/);
    assert.notEqual(snapshotFingerprint(fixture), snapshotFingerprint(edited));
});

test('rollback checks reject changed prose, metadata or step photos', () => {
    const after = planRecipeRepair(fixture).after;
    const edited = structuredClone(after);
    edited.flowNodes[0].photoKey = 'new-photo';
    assert.throws(() => assertSnapshotMatches(after, edited), /changed/);
    assert.throws(
        () => assertSnapshotMatches(after, { ...after, updatedAt: '2026-10-08T00:00:00.000Z' }),
        /changed/,
    );
});

test('original import data is evidence for review, never an index-based automatic repair', () => {
    const evidence = extractImportEvidence({
        choices: [
            {
                message: {
                    content: JSON.stringify({
                        ingredients: [
                            { name: 'Milch', amount: 50, unit: 'ml', notes: 'für die Creme' },
                        ],
                    }),
                },
            },
        ],
    });
    assert.equal(evidence?.[0].sourceId, 'imported_0');
    assert.equal(evidence?.[0].amount, '50');
    assert.equal(extractImportEvidence({ choices: [] }), undefined);
});
