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

test('reviewed description replacements remove only known temporary overrides before binding occurrences', () => {
    const snapshot = {
        id: 'langos',
        slug: 'langos',
        updatedAt: '2026-10-15T00:00:00.000Z',
        flowNodes: [
            {
                id: 's',
                description: '@[Milch|100 ml](imported_4) und @[Salz|2 TL](salt-catalog)',
                ingredientIds: ['imported_4', 'salt-catalog'],
            },
        ],
        ingredients: [
            {
                id: 'milk-use',
                sourceId: 'milk-source',
                ingredientId: 'milk-catalog',
                unitId: 'ml',
                name: 'Milch',
                amount: '100',
                unit: 'ml',
                notes: null,
                position: 0,
                isOptional: false,
            },
            {
                id: 'salt-dough',
                sourceId: 'salt-source',
                ingredientId: 'salt-catalog',
                unitId: 'tl',
                name: 'Salz',
                amount: '2',
                unit: 'TL',
                notes: 'Teig',
                position: 1,
                isOptional: false,
            },
        ],
    };
    const expected = snapshot.flowNodes[0].description;
    const replacement = '@[Milch](imported_4) und @[Salz|1 TL](salt-catalog)';
    const decisions = {
        sourceIds: { imported_4: 'milk-use', 'salt-catalog': 'salt-dough' },
        descriptionOverrides: { s: { expected, replacement } },
    };
    const repaired = planRecipeRepair(snapshot, decisions);
    assert.equal(
        repaired.after.flowNodes[0].description,
        '@[Milch](milk-use) und @[Salz|1 TL](salt-dough)',
    );
    assert.throws(
        () =>
            planRecipeRepair(snapshot, {
                ...decisions,
                descriptionOverrides: { s: { expected: 'old text', replacement } },
            }),
        /changed|match|stale/i,
    );
    assert.throws(
        () =>
            planRecipeRepair(snapshot, {
                ...decisions,
                descriptionOverrides: { unknown: { expected, replacement } },
            }),
        /node|step|missing|unknown/i,
    );
});

test('reviewed restoration also restores collapsed per-step reference lists', () => {
    const before = {
        ...fixture,
        flowNodes: [
            { id: 's', description: '@[Salz|nach Geschmack](salt)', ingredientIds: ['salt'] },
        ],
    };
    const result = planRecipeRepair(before, {
        sourceIds: { 'cream-source': 'cream-salt' },
        restoreRows: [
            {
                ...fixture.ingredients[0],
                id: 'cream-salt',
                ingredientId: 'salt',
                amount: '',
                notes: 'für die Creme',
            },
        ],
        descriptionOverrides: {
            s: {
                expected: '@[Salz|nach Geschmack](salt)',
                replacement: '@[Salz](cream-source)',
                expectedIngredientIds: ['salt'],
                replacementIngredientIds: ['cream-source'],
            },
        },
    });
    assert.deepEqual(result.after.flowNodes[0].ingredientIds, ['cream-salt']);
    assert.throws(
        () =>
            planRecipeRepair(before, {
                descriptionOverrides: {
                    s: {
                        expected: before.flowNodes[0].description,
                        replacement: 'text',
                        expectedIngredientIds: ['other'],
                        replacementIngredientIds: [],
                    },
                },
            }),
        /changed|match/i,
    );
});

test('restored occurrences cannot silently remain unrelated to the repaired flow', () => {
    assert.throws(
        () =>
            planRecipeRepair(fixture, {
                restoreRows: [{ ...fixture.ingredients[0], id: 'unused-restoration' }],
            }),
        /unused|unreferenced|mapping/i,
    );
});
