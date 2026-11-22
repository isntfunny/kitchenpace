import assert from 'node:assert/strict';
import { test } from 'node:test';

import { clusterSearchHref } from './href';
import {
    deriveClusterFilter,
    matchesClusterFilter,
    profileClusters,
    type ClusterMemberMeta,
} from './profile';

const pasta = { slug: 'pasta', name: 'Pasta' };
const dessert = { slug: 'dessert', name: 'Dessert' };
const main = { slug: 'hauptgericht', name: 'Hauptgericht' };

function member(id: string, tags: string[], categories = [main]): ClusterMemberMeta {
    return { recipeId: id, tags, categories };
}

const pastaCluster = [
    member('p1', ['Italienisch', 'Pasta', 'Schnell'], [pasta]),
    member('p2', ['Italienisch', 'Pasta'], [pasta]),
    member('p3', ['Italienisch', 'Pasta', 'Vegetarisch'], [pasta]),
    member('p4', ['Italienisch', 'Schnell'], [pasta]),
    member('p5', ['Italienisch', 'Pasta'], [pasta]),
];
const dessertCluster = [
    member('d1', ['Süß', 'Backen', 'Schnell'], [dessert]),
    member('d2', ['Süß', 'Backen'], [dessert]),
    member('d3', ['Süß', 'Backen'], [dessert]),
    member('d4', ['Süß', 'Schokolade'], [dessert]),
    member('d5', ['Süß', 'Backen', 'Vegetarisch'], [dessert]),
];

test('labels come from dominant tags and categories, not from generic terms', () => {
    const [a, b] = profileClusters([pastaCluster, dessertCluster]);
    assert.ok(a.label.includes('Italienisch') || a.label.includes('Pasta'), a.label);
    assert.ok(b.label.includes('Süß') || b.label.includes('Backen'), b.label);
    // "Schnell" and "Vegetarisch" appear in both clusters: low idf, never the lead term
    assert.notEqual(a.tags[0].name, 'Schnell');
    assert.equal(a.size, 5);
    assert.equal(a.eligible, true);
});

test('profiling is deterministic and independent of member order', () => {
    const first = profileClusters([pastaCluster, dessertCluster]);
    const second = profileClusters([[...pastaCluster].reverse(), [...dessertCluster].reverse()]);
    assert.deepEqual(
        first.map((p) => [p.label, p.filter]),
        second.map((p) => [p.label, p.filter]),
    );
});

test('duplicate labels are made unique', () => {
    const profiles = profileClusters([pastaCluster, pastaCluster.map((m) => ({ ...m }))]);
    assert.notEqual(profiles[0].label, profiles[1].label);
});

test('tiny or undescribable clusters are not eligible', () => {
    const [tiny, noTerms] = profileClusters([
        pastaCluster.slice(0, 2),
        [
            member('x1', [], []),
            member('x2', [], []),
            member('x3', [], []),
            member('x4', [], []),
            member('x5', [], []),
        ],
    ]);
    assert.equal(tiny.eligible, false);
    assert.equal(noTerms.eligible, false);
    assert.equal(noTerms.label, 'Gemischte Rezepte');
});

test('derived filter is small, matches most members and never empty for describable clusters', () => {
    const [a] = profileClusters([pastaCluster, dessertCluster]);
    assert.ok(a.filter.tags.length <= 2);
    assert.ok(a.filter.tags.length + a.filter.categories.length > 0);
    assert.ok(a.filterCoverage >= 0.6, String(a.filterCoverage));
});

test('deriveClusterFilter falls back to the strongest term when nothing passes the thresholds', () => {
    const weak = [{ key: 'A', name: 'A', count: 2, share: 0.2, score: 1 }];
    assert.deepEqual(deriveClusterFilter(weak, []), { tags: ['A'], categories: [] });
    assert.deepEqual(deriveClusterFilter([], []), { tags: [], categories: [] });
});

test('matchesClusterFilter ANDs tags and requires one of the categories', () => {
    const m = member('m', ['A', 'B'], [pasta]);
    assert.equal(matchesClusterFilter(m, { tags: ['A', 'B'], categories: ['pasta'] }), true);
    assert.equal(matchesClusterFilter(m, { tags: ['A', 'C'], categories: [] }), false);
    assert.equal(matchesClusterFilter(m, { tags: [], categories: ['dessert'] }), false);
    assert.equal(matchesClusterFilter(m, { tags: [], categories: [] }), false);
});

test('clusterSearchHref prefills the recipe search like a FilterSet', () => {
    assert.equal(
        clusterSearchHref({ tags: ['Italienisch', 'Pasta'], categories: ['pasta'] }),
        '/recipes?tags=Italienisch&tags=Pasta&categories=pasta',
    );
    assert.equal(clusterSearchHref({ tags: [], categories: [] }), '/recipes');
});
