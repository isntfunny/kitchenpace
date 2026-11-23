import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    buildTitleDictionary,
    queryLeaves,
    titleTermsClause,
    titleTerms,
    type DictionaryIngredient,
} from '../../shared/opensearch/title-terms';

const ing = (
    name: string,
    extra: Partial<DictionaryIngredient> & { category?: string; root?: string } = {},
): DictionaryIngredient => ({
    name,
    normalizedName: extra.normalizedName ?? null,
    pluralName: extra.pluralName ?? null,
    aliases: extra.aliases ?? [],
    categories: extra.category ? [{ name: extra.category, rootSlug: extra.root ?? 'gemuese' }] : [],
});

const dict = buildTitleDictionary([
    ing('Champignon', { aliases: ['Egerling', 'Champignon, roh'], category: 'Pilze' }),
    ing('Hackfleisch', { aliases: ['Gehacktes', 'Faschiertes', 'rind, gehacktes, roh'] }),
    ing('Kartoffel', { pluralName: 'Kartoffeln', aliases: ['Erdapfel', 'Erdäpfel'] }),
    ing('Möhre', { aliases: ['Karotte', 'Karotten'] }),
    ing('Linse', { pluralName: 'Linsen' }),
    ing('Erbse', { pluralName: 'Erbsen' }),
    ing('Apfel, geschält', { normalizedName: 'geschälter Apfel', aliases: ['Dörrapfel'] }),
    ing('Apfel'),
    ing('Kürbis', { normalizedName: 'Kürbis' }),
    ing('Kürbisgnocchi', { normalizedName: 'Kürbis-Gnocchi auf Auflauf', aliases: ['Auflauf'] }),
    ing('Pilzsuppe', { category: 'Suppen', root: 'gerichte', aliases: ['Champignonsuppe'] }),
]);

const has = (terms: string[], ...words: string[]) => words.every((w) => terms.includes(w));

test('splits a compound title into known parts and adds their synonyms', () => {
    const terms = titleTerms(dict, 'Champignon-Cremesuppe');
    assert.ok(has(terms, 'champignon', 'cremesuppe', 'creme', 'suppe', 'egerling', 'pilz'));
});

test('a query is split the same way but never expanded', () => {
    assert.deepEqual(queryLeaves(dict, 'Pilzcremesuppe'), [['pilz'], ['creme'], ['suppe']]);
    assert.deepEqual(queryLeaves(dict, 'Linsensuppe'), [['linse'], ['suppe']]);
});

test('finds regional ingredient names through the title', () => {
    assert.ok(has(titleTerms(dict, 'Kartoffelsuppe mit Speck'), 'erdapfel', 'erdäpfel'));
    assert.ok(has(titleTerms(dict, 'Spaghetti mit Hackfleischsauce'), 'faschiertes', 'gehacktes'));
    assert.ok(has(titleTerms(dict, 'Möhrenkuchen'), 'karotte', 'karotten'));
});

test('a lentil soup does not become a pea soup', () => {
    const terms = titleTerms(dict, 'Linsensuppe');
    assert.ok(!terms.includes('erbse') && !terms.includes('erbsen'));
});

test('nutrient-table aliases and multi-word display names add nothing', () => {
    const terms = titleTerms(dict, 'Rinderbraten');
    assert.ok(!terms.includes('hackfleisch'));
    assert.ok(!titleTerms(dict, 'Apfelstrudel').includes('dörrapfel'));
    assert.ok(!titleTerms(dict, 'Kürbissuppe').includes('auflauf'));
});

test('prepared dishes pass on no synonyms', () => {
    assert.ok(!titleTerms(dict, 'Pilzsuppe').includes('champignonsuppe'));
});

test('dish synonyms from the code list work in both directions', () => {
    assert.ok(has(titleTerms(dict, 'Kartoffelpüree'), 'brei', 'stampf'));
    assert.ok(has(titleTerms(dict, 'Buletten'), 'frikadelle'));
    assert.ok(!titleTerms(dict, 'Berliner').includes('pfannkuchen'));
});

test('linking letters do not end a split', () => {
    assert.deepEqual(queryLeaves(dict, 'Kartoffeln'), [['kartoffeln', 'kartoffel']]);
});

test('the clause needs every leaf, any stem of a leaf counts', () => {
    assert.equal(titleTermsClause([]), null);
    assert.deepEqual(titleTermsClause([['pilz'], ['suppe']]), {
        constant_score: {
            filter: { bool: { must: [{ terms: { titleTerms: ['pilz'] } }, { terms: { titleTerms: ['suppe'] } }] } },
            boost: 4,
        },
    });
});

test('the hash changes when the synonyms change', () => {
    const other = buildTitleDictionary([ing('Champignon', { aliases: ['Egerling'] })]);
    assert.notEqual(dict.hash, other.hash);
    const input = [ing('Champignon', { aliases: ['Egerling'] })];
    assert.equal(buildTitleDictionary(input).hash, buildTitleDictionary(input).hash);
});
