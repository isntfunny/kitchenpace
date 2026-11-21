import assert from 'node:assert/strict';
import { test } from 'node:test';

import { type DbTagRow, describeTagCleanup, planTagCleanup } from './cleanup';
import { TAG_LIST } from './tag-list';

const row = (id: string, name: string, slug: string, recipeIds: string[] = []): DbTagRow => ({
    id,
    name,
    slug,
    recipeIds,
    filterSetIds: [],
    collectionIds: [],
});

test('plan merges, renames, drops and reports unknown tags', () => {
    const plan = planTagCleanup([
        row('t1', 'Grillen', 'grillen', ['r1']),
        row('t2', 'BBQ', 'bbq', ['r1', 'r2']),
        row('t3', 'Zuckerreduziert', 'zuckerreduziert', ['r3', 'r4']),
        row('t4', 'Zuckerfrei', 'zuckerfrei', ['r4']),
        row('t5', 'Nachttisch', 'nachttisch', ['r5']),
        row('t6', 'Mondküche', 'mondkueche', ['r6']),
        row('t7', 'festlich', 'festlich'),
    ]);
    const report = describeTagCleanup(plan, 'dry-run');

    // Grillen keeps its row, BBQ is merged; r1 already had Grillen
    const bbq = report.merged.find((m) => m.from.id === 't2');
    assert.deepEqual(bbq?.to, { name: 'Grillen', slug: 'grillen' });
    assert.equal(bbq?.recipes, 2);
    assert.equal(bbq?.alreadyTagged, 1);

    // No "Ohne Zucker" row yet: the most used old tag is renamed, the other merged
    assert.deepEqual(
        report.renamed.map((r) => [r.id, r.to.name]),
        [
            ['t7', 'Festlich'],
            ['t3', 'Ohne Zucker'],
        ],
    );
    assert.deepEqual(report.merged.find((m) => m.from.id === 't4')?.to, {
        name: 'Ohne Zucker',
        slug: 'ohne-zucker',
    });

    assert.deepEqual(
        report.dropped.map((d) => [d.name, d.reason]),
        [['Nachttisch', 'Kategorie']],
    );
    assert.deepEqual(
        report.unknown.map((u) => u.name),
        ['Mondküche'],
    );
    // Every list tag without a row is created
    assert.equal(report.created.length, TAG_LIST.length - 3);
    assert.deepEqual(report.affectedRecipeIds, ['r1', 'r2', 'r3', 'r4', 'r5']);
});

test('plan on a clean table changes nothing', () => {
    const rows = TAG_LIST.map((t, i) => row(`id${i}`, t.name, t.slug, [`r${i}`]));
    rows.push(row('x', 'Mondküche', 'mondkueche'));
    const report = describeTagCleanup(planTagCleanup(rows), 'dry-run');
    assert.equal(report.created.length, 0);
    assert.equal(report.renamed.length, 0);
    assert.equal(report.merged.length, 0);
    assert.equal(report.dropped.length, 0);
    assert.equal(report.unknown.length, 1);
    assert.deepEqual(report.affectedRecipeIds, []);
});
