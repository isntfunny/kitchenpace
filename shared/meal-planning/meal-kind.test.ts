import assert from 'node:assert/strict';
import test from 'node:test';

import {
    allowedFor,
    mealKindOf,
    mealKindQuery,
    MEAL_KIND_LABELS,
    type MealKind,
} from './meal-kind';

test('fixed slots', () => {
    assert.equal(mealKindOf({ key: 'BREAKFAST', time: '08:00' }), 'breakfast');
    assert.equal(mealKindOf({ key: 'LUNCH', time: '12:30' }), 'main');
    assert.equal(mealKindOf({ key: 'DINNER', time: '19:00' }), 'main');
    assert.equal(mealKindOf({ key: 'SNACK', time: '16:00' }), 'snack');
});

test('custom slot times', () => {
    const kind = (time: string) => mealKindOf({ key: 'c_a', time });
    assert.equal(kind('10:59'), 'breakfast');
    assert.equal(kind('11:00'), 'main');
    assert.equal(kind('14:00'), 'snack');
    assert.equal(kind('16:59'), 'snack');
    assert.equal(kind('17:00'), 'main');
    assert.equal(kind('21:30'), 'main');
});

test('labels', () => {
    assert.equal(MEAL_KIND_LABELS.snack, 'Kaffee & Snack');
});

test('main dish rules', () => {
    assert.equal(allowedFor('main', { categorySlugs: ['hauptgericht'], tags: [] }), true);
    assert.equal(
        allowedFor('main', { categorySlugs: ['beilage', 'hauptgericht'], tags: [] }),
        true,
    );
    assert.equal(allowedFor('main', { categorySlugs: ['beilage'], tags: [] }), false);
    assert.equal(
        allowedFor('main', { categorySlugs: ['hauptgericht'], tags: ['Grundrezept'] }),
        false,
    );
    assert.equal(allowedFor('main', { categorySlugs: ['salat'], tags: [] }), false);
});

test('breakfast', () => {
    assert.equal(allowedFor('breakfast', { categorySlugs: ['fruehstueck'], tags: [] }), true);
    assert.equal(allowedFor('breakfast', { categorySlugs: ['backen'], tags: ['Brunch'] }), true);
    assert.equal(allowedFor('breakfast', { categorySlugs: ['dessert'], tags: [] }), false);
});

test('snack', () => {
    assert.equal(allowedFor('snack', { categorySlugs: ['backen'], tags: [] }), true);
    assert.equal(allowedFor('snack', { categorySlugs: ['dessert'], tags: [] }), true);
    assert.equal(allowedFor('snack', { categorySlugs: [], tags: ['Kaffee & Kuchen'] }), true);
    assert.equal(allowedFor('snack', { categorySlugs: ['dessert', 'getraenk'], tags: [] }), false);
});

type Doc = { categorySlugs: string[]; tags: string[] };

/** Tiny interpreter for the bool/must/should/must_not/filter/term/terms subset we emit. */
function evaluate(q: Record<string, unknown>, doc: Doc): boolean {
    const field = (name: string) => (name === 'categorySlugs' ? doc.categorySlugs : doc.tags);
    if ('bool' in q) {
        const b = q.bool as Record<string, unknown>;
        const list = (key: string) => {
            const v = b[key];
            return v === undefined
                ? []
                : ((Array.isArray(v) ? v : [v]) as Record<string, unknown>[]);
        };
        const must = [...list('must'), ...list('filter')];
        const should = list('should');
        const mustNot = list('must_not');
        if (!must.every((c) => evaluate(c, doc))) return false;
        if (mustNot.some((c) => evaluate(c, doc))) return false;
        if (should.length) {
            const min = typeof b.minimum_should_match === 'number' ? b.minimum_should_match : 1;
            return should.filter((c) => evaluate(c, doc)).length >= min;
        }
        return true;
    }
    if ('term' in q) {
        const [name, value] = Object.entries(q.term as Record<string, unknown>)[0]!;
        return field(name).includes(value as string);
    }
    if ('terms' in q) {
        const [name, values] = Object.entries(q.terms as Record<string, unknown>)[0]!;
        return (values as string[]).some((v) => field(name).includes(v));
    }
    throw new Error(`unsupported clause ${JSON.stringify(q)}`);
}

test('query matches predicate', () => {
    const table: Doc[] = [
        { categorySlugs: ['hauptgericht'], tags: [] },
        { categorySlugs: ['beilage', 'hauptgericht'], tags: [] },
        { categorySlugs: ['beilage'], tags: [] },
        { categorySlugs: ['hauptgericht'], tags: ['Grundrezept'] },
        { categorySlugs: ['salat'], tags: [] },
        { categorySlugs: ['fruehstueck'], tags: [] },
        { categorySlugs: ['backen'], tags: ['Brunch'] },
        { categorySlugs: ['dessert'], tags: [] },
        { categorySlugs: ['backen'], tags: [] },
        { categorySlugs: [], tags: ['Kaffee & Kuchen'] },
        { categorySlugs: ['dessert', 'getraenk'], tags: [] },
        { categorySlugs: ['vorspeise', 'hauptgericht'], tags: ['Vorratshaltung'] },
    ];
    for (const kind of ['main', 'breakfast', 'snack'] as MealKind[]) {
        const query = mealKindQuery(kind);
        for (const doc of table) {
            assert.equal(
                evaluate(query, doc),
                allowedFor(kind, doc),
                `${kind} ${JSON.stringify(doc)}`,
            );
        }
    }
});
