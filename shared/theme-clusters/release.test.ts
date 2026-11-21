import assert from 'node:assert/strict';
import { test } from 'node:test';

import { pickInspiration } from '../meal-planning/inspiration';

import {
    canApproveRun,
    canToggleCluster,
    clustersToActivate,
    isThemeActive,
    toggleThemeFilters,
    toInspirationCluster,
    toThemeChip,
    type ReleasedClusterRow,
} from './release';

const row = (patch: Partial<ReleasedClusterRow> = {}): ReleasedClusterRow => ({
    key: 'k1',
    label: 'Pasta & Italienisch',
    centroid: [1, 0],
    size: 12,
    filterTags: ['Pasta', 'Italienisch'],
    filterCategories: ['pasta'],
    ...patch,
});

test('only completed, not yet approved runs can be approved', () => {
    assert.deepEqual(canApproveRun({ status: 'COMPLETED', approvedAt: null }), { ok: true });
    for (const run of [
        { status: 'FAILED', approvedAt: null },
        { status: 'RUNNING', approvedAt: null },
        { status: 'COMPLETED', approvedAt: new Date() },
    ] as const) {
        const decision = canApproveRun(run);
        assert.equal(decision.ok, false);
        assert.ok(!decision.ok && decision.reason.length > 10);
    }
});

test('approval activates exactly the eligible clusters', () => {
    assert.deepEqual(
        clustersToActivate([
            { id: 'a', eligible: true },
            { id: 'b', eligible: false },
            { id: 'c', eligible: true },
        ]),
        ['a', 'c'],
    );
    assert.deepEqual(clustersToActivate([]), []);
});

test('single clusters can be hidden or shown in an approved run, never if not eligible', () => {
    const approved = { approvedAt: new Date() };
    assert.equal(canToggleCluster(approved, { eligible: true }, false).ok, true);
    assert.equal(canToggleCluster(approved, { eligible: true }, true).ok, true);
    assert.equal(canToggleCluster(approved, { eligible: false }, false).ok, true); // hiding is always fine
    assert.equal(canToggleCluster(approved, { eligible: false }, true).ok, false);
    assert.equal(canToggleCluster({ approvedAt: null }, { eligible: true }, true).ok, false);
});

test('toInspirationCluster fits the inspiration strip and skips filterless clusters', () => {
    const cluster = toInspirationCluster(
        row({ members: [{ recipeId: 'r1' }, { recipeId: 'r2' }] }),
    );
    assert.ok(cluster);
    assert.equal(cluster.active, true);
    assert.equal(cluster.href, '/recipes?tags=Pasta&tags=Italienisch&categories=pasta');
    assert.deepEqual(cluster.memberRecipeIds, ['r1', 'r2']);
    assert.equal('memberRecipeIds' in toInspirationCluster(row())!, false);
    assert.equal(toInspirationCluster(row({ filterTags: [], filterCategories: [] })), null);

    const items = pickInspiration({
        today: '2026-11-24',
        filterSets: [],
        clusters: [cluster],
        plannedRecipeIds: ['r1'],
    });
    assert.deepEqual(
        items.map((i) => i.kind),
        ['theme'],
    );
    // all members planned: the theme drops out
    assert.deepEqual(
        pickInspiration({
            today: '2026-11-24',
            filterSets: [],
            clusters: [cluster],
            plannedRecipeIds: ['r1', 'r2'],
        }),
        [],
    );
});

test('theme chips toggle their filters on top of existing ones', () => {
    const chip = toThemeChip(row())!;
    assert.deepEqual(chip, {
        key: 'k1',
        label: 'Pasta & Italienisch',
        tags: ['Pasta', 'Italienisch'],
        categories: ['pasta'],
    });
    assert.equal(toThemeChip(row({ filterTags: [], filterCategories: [] })), null);

    const filters = { tags: ['Schnell'], categories: [] as string[] };
    assert.equal(isThemeActive(filters, chip), false);

    const on = toggleThemeFilters(filters, chip);
    assert.deepEqual(on, { tags: ['Schnell', 'Pasta', 'Italienisch'], categories: ['pasta'] });
    assert.equal(isThemeActive(on, chip), true);

    const off = toggleThemeFilters(on, chip);
    assert.deepEqual(off, { tags: ['Schnell'], categories: [] });
    assert.equal(isThemeActive(off, chip), false);

    // partial overlap is not "active"; toggling completes the set
    assert.equal(isThemeActive({ tags: ['Pasta'], categories: ['pasta'] }, chip), false);
    assert.deepEqual(toggleThemeFilters({ tags: ['Pasta'] }, chip).tags, ['Pasta', 'Italienisch']);
});
