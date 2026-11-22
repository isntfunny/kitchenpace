import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    extractIconAnswers,
    getIconBackfillResponseFormat,
    ICON_BACKFILL_PROMPT,
} from '../../shared/ingredient-icons/backfill';
import {
    buildIconPromptRules,
    getIconSchemaProperty,
    parseIconAnswer,
} from '../../shared/ingredient-icons/enrichment';
import {
    ENRICHMENT_ICON_NAMES,
    EXTRA_FOOD_ICON_NAMES,
    FALLBACK_ICON,
    FOOD_ICON_NAMES,
    HOUSEHOLD_ICON_NAMES,
    ICON_NAMES,
    isIngredientIconName,
    NOT_FOR_ENRICHMENT_ICON_NAMES,
} from '../../shared/ingredient-icons/names';
import {
    MAIN_CATEGORY_ICONS,
    normalizeFreeText,
    resolveCategoryIcon,
    resolveFreeTextIcon,
    resolveIngredientIcon,
} from '../../shared/ingredient-icons/resolve';
import { ICONOVEN_BODIES } from '../../src/lib/icons/iconoven-food';
import { buildNutritionRequest } from '../../worker/queues/nutrition-processor';

// ── Allowlist and generated file ────────────────────────────────────────

test('the generated bodies cover exactly the allowed names', () => {
    assert.deepEqual([...Object.keys(ICONOVEN_BODIES)].sort(), [...ICON_NAMES].sort());
});

test('the allowed names are unique and the food category has its 114 icons', () => {
    assert.equal(new Set(ICON_NAMES).size, ICON_NAMES.length);
    assert.equal(FOOD_ICON_NAMES.length, 114);
    assert.ok(EXTRA_FOOD_ICON_NAMES.length >= 38);
    assert.ok(HOUSEHOLD_ICON_NAMES.length > 0);
});

test('every body is a monochrome inline SVG fragment that loads nothing', () => {
    for (const [name, body] of Object.entries(ICONOVEN_BODIES)) {
        assert.ok(body.includes('currentColor'), `${name} is not drawn in currentColor`);
        assert.ok(!/https?:|href|<image|<script|<style|<foreignObject/i.test(body), name);
    }
});

test('the neutral icon, all category icons and the household icons are allowed', () => {
    assert.ok(isIngredientIconName(FALLBACK_ICON));
    for (const icon of Object.values(MAIN_CATEGORY_ICONS)) assert.ok(isIngredientIconName(icon));
    for (const name of HOUSEHOLD_ICON_NAMES) assert.ok(isIngredientIconName(name));
    for (const name of NOT_FOR_ENRICHMENT_ICON_NAMES) assert.ok(isIngredientIconName(name), name);
});

test('isIngredientIconName rejects unknown and non-string values', () => {
    for (const value of ['milk-carton', 'iconoven:milk', 'nope', '', null, undefined, 3]) {
        assert.equal(isIngredientIconName(value), value === 'milk-carton');
    }
});

// ── Resolution ──────────────────────────────────────────────────────────

test('all 19 main categories have an icon', () => {
    assert.equal(Object.keys(MAIN_CATEGORY_ICONS).length, 19);
    assert.equal(new Set(Object.values(MAIN_CATEGORY_ICONS)).size, 19, 'distinct icons');
});

test('ingredient icon wins over its categories', () => {
    const result = resolveIngredientIcon({
        icon: 'cheese',
        categories: [{ slug: 'gemuese', icon: 'carrot' }],
    });
    assert.equal(result, 'cheese');
});

test('without an ingredient icon the stored category icon wins over the slug mapping', () => {
    const result = resolveIngredientIcon({
        icon: null,
        categories: [{ slug: 'gemuese', icon: 'corn' }],
    });
    assert.equal(result, 'corn');
});

test('the slug mapping is used when the category has no stored icon', () => {
    assert.equal(resolveIngredientIcon({ categories: [{ slug: 'fisch' }] }), 'fish');
});

test('subcategories inherit from the parent', () => {
    const parent = { slug: 'milch-und-milchprodukte' };
    const child = { slug: 'milch-und-milchprodukteka-se', parent };
    assert.equal(resolveCategoryIcon(child), 'milk');
    assert.equal(resolveIngredientIcon({ categories: [child] }), 'milk');
    // a stored icon on the child beats the parent
    assert.equal(resolveCategoryIcon({ ...child, icon: 'cheese' }), 'cheese');
});

test('the first category that has an icon decides; categories without one are skipped', () => {
    const result = resolveIngredientIcon({
        categories: [{ slug: 'unbekannt' }, { slug: 'eier' }, { slug: 'fisch' }],
    });
    assert.equal(result, 'egg');
});

test('unknown or missing data falls back to the neutral icon', () => {
    assert.equal(resolveIngredientIcon(null), FALLBACK_ICON);
    assert.equal(resolveIngredientIcon({}), FALLBACK_ICON);
    assert.equal(resolveIngredientIcon({ icon: 'not-allowed', categories: [] }), FALLBACK_ICON);
    assert.equal(
        resolveIngredientIcon({ categories: [{ slug: 'x', parent: { slug: 'y' } }] }),
        FALLBACK_ICON,
    );
});

test('an icon name that is not allowed is ignored, the chain continues', () => {
    const result = resolveIngredientIcon({
        icon: 'iconoven:milk',
        categories: [{ slug: 'eier' }],
    });
    assert.equal(result, 'egg');
});

test('a cyclic category tree does not hang', () => {
    const a: { slug: string; parent?: unknown } = { slug: 'a' };
    const b = { slug: 'b', parent: a };
    a.parent = b;
    assert.equal(resolveCategoryIcon(a as never), null);
});

// ── Free-text items ─────────────────────────────────────────────────────

test('free-text household items get a household icon', () => {
    const cases: Array<[string, string]> = [
        ['Spülmittel', 'dish-soap'],
        ['spülmittel', 'dish-soap'],
        ['Geschirrspülmittel 500 ml', 'dish-soap'],
        ['Spülmaschinentabs', 'detergent'],
        ['Waschmittel', 'detergent-jug'],
        ['Küchenrolle', 'kitchen-towel'],
        ['Küchenrollen (3er)', 'kitchen-towel'],
        ['Müllbeutel 35 l', 'trash-bin-kitchen'],
        ['Mülltüten', 'trash-bin-kitchen'],
        ['Toilettenpapier', 'toilet-paper'],
        ['WC-Reiniger', 'detergent-jug'],
        ['Klobürste', 'toilet-brush'],
        ['Alufolie', 'foil-roll'],
        ['Frischhaltefolie', 'cling-wrap'],
        ['Taschentücher', 'tissue-box'],
        ['Batterien AA', 'battery-aa'],
        ['Spülschwamm', 'sponge'],
        ['Handseife', 'soap-dispenser'],
    ];
    for (const [text, icon] of cases) assert.equal(resolveFreeTextIcon(text), icon, text);
});

test('free text without a keyword, or empty, gets the neutral icon', () => {
    for (const text of ['Tomaten', 'irgendwas', '', '   ']) {
        assert.equal(resolveFreeTextIcon(text), FALLBACK_ICON, text);
    }
});

test('every household keyword result is an allowed icon', () => {
    for (const text of ['Spülmittel', 'Besen', 'Eimer', 'Kerzen', 'Windeln', 'Rasierer', 'Watte']) {
        assert.ok(isIngredientIconName(resolveFreeTextIcon(text)), text);
    }
});

test('normalizeFreeText folds case, umlauts and spaces', () => {
    assert.equal(normalizeFreeText('  Küchen  RÖLLE ß '), 'kuchen rolle ss');
});

// ── Enrichment: only allowed names ──────────────────────────────────────

test('the model may only choose from the allowed list, plus null', () => {
    const property = getIconSchemaProperty();
    assert.deepEqual(property.type, ['string', 'null']);
    assert.equal(property.enum.at(-1), null);
    const names = property.enum.slice(0, -1) as string[];
    assert.ok(names.length > 100);
    for (const name of names) assert.ok(isIngredientIconName(name), name);
    for (const name of HOUSEHOLD_ICON_NAMES) assert.ok(!names.includes(name), name);
    for (const name of NOT_FOR_ENRICHMENT_ICON_NAMES) assert.ok(!names.includes(name), name);
    assert.deepEqual(names, [...ENRICHMENT_ICON_NAMES]);
});

test('the prompt lists every name the model may choose', () => {
    const rules = buildIconPromptRules();
    for (const name of ENRICHMENT_ICON_NAMES) assert.ok(rules.includes(name), name);
    assert.ok(ICON_BACKFILL_PROMPT.includes(rules));
});

test('parseIconAnswer accepts only names offered to the model', () => {
    assert.equal(parseIconAnswer('milk'), 'milk');
    for (const value of ['dish-soap', 'fork-knife', 'unknown', null, undefined, 4]) {
        assert.equal(parseIconAnswer(value), null, String(value));
    }
});

test('the backfill schema is a strict object with an icon per id', () => {
    const format = getIconBackfillResponseFormat();
    assert.equal(format.strict, true);
    const item = format.schema.properties.items.items as {
        properties: Record<string, unknown>;
        required: string[];
    };
    assert.deepEqual(item.required, ['id', 'icon']);
    assert.deepEqual(Object.keys(item.properties), ['id', 'icon']);
});

test('extractIconAnswers keeps ids and turns invalid icons into null', () => {
    const answers = extractIconAnswers({
        items: [
            { id: 'a', icon: 'milk' },
            { id: 'b', icon: 'made-up' },
            { id: 'c', icon: null },
            { id: '', icon: 'egg' },
            { icon: 'egg' },
            null,
        ],
    });
    assert.deepEqual(answers, [
        { id: 'a', icon: 'milk' },
        { id: 'b', icon: null },
        { id: 'c', icon: null },
    ]);
    assert.throws(() => extractIconAnswers({}), /items/);
});

test('the nutrition request for new ingredients and the daily batch asks for an allowed icon', () => {
    const request = buildNutritionRequest('Gouda', {
        units: [{ id: 'u1', shortName: 'g', longName: 'Gramm' }],
        categories: [{ id: 'c1', slug: 'milch-und-milchprodukte', name: 'Milch' }],
    });
    const schema = request.text.format.schema as {
        required: string[];
        properties: Record<string, { enum?: unknown[] }>;
    };
    assert.ok(schema.required.includes('icon'));
    assert.deepEqual(schema.properties.icon.enum, [...ENRICHMENT_ICON_NAMES, null]);
    assert.ok(request.instructions.includes(buildIconPromptRules()));
});
