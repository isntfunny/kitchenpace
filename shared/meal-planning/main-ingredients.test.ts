import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    classifyIngredient,
    deriveMainIngredients,
    type MainIngredientLine,
} from './main-ingredients';

const STARCH = ['getreideprodukte-huelsenfruechte-und-kartoffeln'];
const LEGUMES = ['huelsenfruechte', ...STARCH];
const VEG = ['gemuese'];
const MEAT = ['fleisch-und-innereien'];
const SAUSAGE = ['fleisch-und-wurstwaren'];
const SPICE = ['gewuerze', 'verschiedenes'];
const OIL = ['fette-und-oele'];
const DAIRY = ['milch-und-milchprodukte'];

const line = (
    name: string,
    categorySlugs: string[],
    amount?: number,
    unit: MainIngredientLine['unit'] = 'g',
    optional = false,
): MainIngredientLine => ({
    name,
    categorySlugs,
    optional,
    ...(amount !== undefined && { amount, unit }),
});

test('Gulasch: the meat and the largest vegetable, never onions or spices', () => {
    const main = deriveMainIngredients([
        line('Rindergulasch', MEAT, 1000),
        line('Zwiebeln', VEG, 750),
        line('Paprika', VEG, 2, 'Stk'),
        line('Tomatenmark', VEG, 40),
        line('Paprikapulver', SPICE, 15),
        line('Kümmel', SPICE, 2),
        line('Rapsöl', OIL, 30, 'ml'),
        line('Rinderbrühe', [], 500, 'ml'),
    ]);
    assert.deepEqual(main, ['Rindergulasch', 'Paprika']);
});

test('Linsencurry: legumes count like meat, plus the largest vegetable or side', () => {
    const main = deriveMainIngredients([
        line('Rote Linsen', LEGUMES, 250),
        line('Kokosmilch', DAIRY, 400, 'ml'),
        line('Süßkartoffel', VEG, 400),
        line('Spinat', VEG, 150),
        line('Basmatireis', STARCH, 200, 'g', true), // optional: never a main ingredient
        line('Currypulver', SPICE, 10),
        line('Ingwer', VEG, 20),
    ]);
    assert.deepEqual(main, ['Rote Linsen', 'Süßkartoffel']);
});

test('Spaghetti Carbonara: the bacon and the pasta, uncategorised Spaghetti by name', () => {
    const main = deriveMainIngredients([
        line('Spaghetti', [], 400), // no category on Beta: rule-based fallback
        line('Guanciale', SAUSAGE, 150),
        line('Eier', ['eier'], 4, 'Stk'),
        line('Parmesan', DAIRY, 80),
        line('Pfeffer', SPICE, 2),
        line('Salz', [], 5),
    ]);
    assert.deepEqual(main, ['Spaghetti', 'Guanciale']);
});

test('Salat: only the largest vegetable; oil, vinegar and small amounts never count', () => {
    const main = deriveMainIngredients([
        line('Feldsalat', VEG, 200),
        line('Kirschtomaten', VEG, 150),
        line('Speckwürfel', SAUSAGE, 30), // small amount: only flavour
        line('Walnüsse', ['nuesse-samen-und-oelfruechte'], 40),
        line('Olivenöl', OIL, 30, 'ml'),
        line('Balsamicoessig', [], 20, 'ml'),
    ]);
    assert.deepEqual(main, ['Feldsalat']);
});

test('without amounts the first vegetable or side wins; pieces use a fallback weight', () => {
    assert.deepEqual(deriveMainIngredients([line('Zucchini', VEG), line('Aubergine', VEG)]), [
        'Zucchini',
    ]);
    assert.deepEqual(
        deriveMainIngredients([line('Kartoffeln', STARCH, 6, 'Stk'), line('Karotten', VEG, 300)]),
        ['Kartoffeln'],
    );
});

test('rule-based fallback for uncategorised ingredients', () => {
    const kind = (name: string) => classifyIngredient({ name, categorySlugs: [] });
    assert.equal(kind('Reis'), 'bulk');
    assert.equal(kind('Gnocchi'), 'bulk');
    assert.equal(kind('Hähnchenbrust'), 'protein');
    assert.equal(kind('Lachsfilet'), 'protein');
    assert.equal(kind('Kichererbsen'), 'protein');
    assert.equal(kind('Wildreis'), 'bulk');
    assert.equal(kind('Weizenmehl'), 'other');
    assert.equal(kind('Knoblauch'), 'other');
    assert.equal(kind('Zuckerschoten'), 'bulk');
});

test('lemons and limes only add flavour, even in a vegetable category', () => {
    assert.equal(classifyIngredient({ name: 'Limette', categorySlugs: [VEG[0]] }), 'other');
    assert.equal(classifyIngredient({ name: 'Zitronen', categorySlugs: [VEG[0]] }), 'other');
    assert.equal(classifyIngredient({ name: 'Bio-Zitrone', categorySlugs: [] }), 'other');
    assert.deepEqual(
        deriveMainIngredients([line('Limette', VEG, 2, 'Stk'), line('Garnelen', ['fisch'], 300)]),
        ['Garnelen'],
    );
});
