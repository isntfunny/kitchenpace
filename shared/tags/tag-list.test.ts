import assert from 'node:assert/strict';
import { test } from 'node:test';

import { slugify } from '../slug';

import {
    DROPPED_TAGS,
    findListedTag,
    mergedTagSlugTarget,
    pickListedTags,
    resolveTag,
    TAG_LIST,
    TAG_NAMES_SORTED,
    tagSlug,
} from './tag-list';

const lower = (s: string) => s.toLowerCase();

test('list tags have unique names and slugs', () => {
    const names = TAG_LIST.map((t) => lower(t.name));
    const slugs = TAG_LIST.map((t) => t.slug);
    assert.equal(new Set(names).size, names.length);
    assert.equal(new Set(slugs).size, slugs.length);
    assert.ok(slugs.every(Boolean));
});

test('tag slugs follow the app slug rules', () => {
    for (const tag of TAG_LIST) assert.equal(tag.slug, slugify(tag.name), tag.name);
    assert.equal(tagSlug('Kaffee & Kuchen'), 'kaffee-und-kuchen');
});

test('every old name has exactly one place: merge target or drop reason', () => {
    const listNames = new Set(TAG_LIST.map((t) => lower(t.name)));
    const seen = new Map<string, string>();
    const mark = (name: string, where: string) => {
        assert.ok(!seen.has(lower(name)), `${name}: ${seen.get(lower(name))} und ${where}`);
        seen.set(lower(name), where);
    };
    for (const tag of TAG_LIST) {
        for (const alias of tag.aliases) {
            assert.ok(!listNames.has(lower(alias)), `${alias} ist selbst ein Listen-Tag`);
            mark(alias, tag.name);
        }
    }
    for (const [reason, names] of Object.entries(DROPPED_TAGS)) {
        for (const name of names) {
            assert.ok(!listNames.has(lower(name)), `${name} ist ein Listen-Tag`);
            mark(name, reason);
        }
    }
});

test('every merge target resolves to a list tag', () => {
    for (const tag of TAG_LIST) {
        for (const alias of tag.aliases) {
            const resolved = resolveTag(alias, tagSlug(alias));
            assert.equal(resolved.kind, 'merge');
            assert.equal(resolved.kind === 'merge' && resolved.tag.name, tag.name);
        }
    }
    assert.deepEqual(resolveTag('Nachttisch', 'nachttisch'), {
        kind: 'drop',
        reason: 'Kategorie',
    });
    assert.equal(resolveTag('vegetarisch', 'vegetarisch').kind, 'list');
    assert.equal(resolveTag('Gibt es nicht', 'gibt-es-nicht').kind, 'unknown');
    // Old slug with stripped umlauts
    assert.equal(resolveTag('Balkanküche', 'balkank-che').kind, 'merge');
});

test('prompt list holds every tag once, alphabetically (German collation)', () => {
    assert.equal(TAG_NAMES_SORTED.length, TAG_LIST.length);
    assert.deepEqual(new Set(TAG_NAMES_SORTED), new Set(TAG_LIST.map((t) => t.name)));
    const sorted = [...TAG_NAMES_SORTED].sort((a, b) => a.localeCompare(b, 'de'));
    assert.deepEqual(TAG_NAMES_SORTED, sorted);
    // Umlauts sort with their base letter, not at the end
    assert.ok(TAG_NAMES_SORTED.indexOf('Österreichisch') < TAG_NAMES_SORTED.indexOf('Party'));
});

test('import keeps only list tags, in canonical spelling, and discards the rest', () => {
    const picked = pickListedTags([
        'vegetarisch',
        'Vegetarisch',
        'Kaffee & Kuchen',
        'BBQ', // old name, not on the list
        'Einfach', // dropped
        'Seelenwärmer', // invented
        '',
    ]);
    assert.deepEqual(
        picked.map((t) => t.name),
        ['Vegetarisch', 'Kaffee & Kuchen'],
    );
    assert.equal(findListedTag('BBQ'), undefined);
    assert.equal(findListedTag('kaffee-und-kuchen')?.name, 'Kaffee & Kuchen');
});

test('old slugs of merged tags point to the new slug; dropped and list slugs do not', () => {
    assert.equal(mergedTagSlugTarget('grillsaison'), 'grillen');
    assert.equal(mergedTagSlugTarget('faschingkarneval'), 'fasching-und-karneval');
    assert.equal(mergedTagSlugTarget('geschenk-aus-der-k-che'), 'geschenk-aus-der-kueche');
    assert.equal(mergedTagSlugTarget('b-hmisch'), 'osteuropaeisch');
    assert.equal(mergedTagSlugTarget('grillen'), null);
    assert.equal(mergedTagSlugTarget('nachtisch'), null);
    assert.equal(mergedTagSlugTarget('unbekannt'), null);
});
