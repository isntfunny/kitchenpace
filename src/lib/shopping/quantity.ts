// Shopping quantities (decision 21.11. in KUC-98):
// - stored in a base unit (g, ml or piece) plus a display unit,
// - other units (EL, TL, Prise, Bund …) are converted via IngredientUnit.grams,
//   then Unit.gramsDefault,
// - amounts from several recipes are added in the base unit,
// - without a safe conversion the amount stays as text ("200 g + 1 Bund").
// Rounding to pack sizes (KUC-94) is display only and never stored.
import {
    formatNumber,
    isNumericQuantity,
    parseQuantityNumber,
} from '@app/lib/ingredients/quantities';

export type BaseUnitName = 'G' | 'ML' | 'PIECE';

export interface StoredQuantity {
    quantity: number | null;
    baseUnit: BaseUnitName | null;
    displayUnit: string | null;
    quantityText: string | null;
}

export const EMPTY_QUANTITY: StoredQuantity = Object.freeze({
    quantity: null,
    baseUnit: null,
    displayUnit: null,
    quantityText: null,
});

/** Per-ingredient conversion data, loaded from IngredientUnit and Unit. */
export interface ConversionContext {
    /** IngredientUnit.grams by unit shortName, e.g. { Stk: 80 } for an onion */
    ingredientGrams?: Record<string, number | null | undefined>;
    /** Unit.gramsDefault by unit shortName */
    unitDefaults?: Record<string, number | null | undefined>;
}

const FIXED_FACTORS: Record<string, [BaseUnitName, number]> = {
    mg: ['G', 0.001],
    g: ['G', 1],
    kg: ['G', 1000],
    ml: ['ML', 1],
    cl: ['ML', 10],
    dl: ['ML', 100],
    l: ['ML', 1000],
    stk: ['PIECE', 1],
    'stk.': ['PIECE', 1],
    stück: ['PIECE', 1],
};

export const BASE_UNIT_LABEL: Record<BaseUnitName, string> = { G: 'g', ML: 'ml', PIECE: 'Stk' };

const PIECE_UNIT = 'Stk';

function round(value: number): number {
    return Math.round(value * 1000) / 1000;
}

/**
 * Number for shopping: ranges use the upper end ("2–3" → 3) so enough is bought.
 * Returns null for free text ("nach Geschmack") and non-positive values.
 */
export function parseShoppingAmount(amount: string | null | undefined): number | null {
    if (!amount || !isNumericQuantity(amount)) return null;
    const parts = amount.trim().split(/\s*[-–]\s*/);
    const value = parseQuantityNumber(parts[parts.length - 1]);
    return value !== null && value > 0 ? value : null;
}

/** Factor from `unit` to its base unit, or null when no safe conversion exists. */
export function unitFactor(
    unit: string | null | undefined,
    context: ConversionContext = {},
): { baseUnit: BaseUnitName; factor: number } | null {
    const name = (unit ?? '').trim();
    const fixed = FIXED_FACTORS[name.toLocaleLowerCase('de-DE')];
    if (fixed) return { baseUnit: fixed[0], factor: fixed[1] };
    if (!name) return { baseUnit: 'PIECE', factor: 1 }; // "3 Eier"
    const grams = context.ingredientGrams?.[name] ?? context.unitDefaults?.[name];
    return grams && grams > 0 ? { baseUnit: 'G', factor: grams } : null;
}

/** Converts a recipe statement ("2", "EL") into the base unit; null if unsafe. */
export function toBaseQuantity(
    amount: string | null | undefined,
    unit: string | null | undefined,
    context: ConversionContext = {},
): { quantity: number; baseUnit: BaseUnitName } | null {
    const value = parseShoppingAmount(amount);
    const factor = value === null ? null : unitFactor(unit, context);
    if (value === null || !factor) return null;
    return { quantity: round(value * factor.factor), baseUnit: factor.baseUnit };
}

/** Grams per piece for this ingredient, if known (e.g. 1 Zwiebel ≈ 80 g). */
function gramsPerPiece(context: ConversionContext): number | null {
    const grams = context.ingredientGrams?.[PIECE_UNIT];
    return grams && grams > 0 ? grams : null;
}

/** Re-expresses a base quantity in `target`; only piece ↔ gram via the piece weight. */
function convertBase(
    quantity: number,
    from: BaseUnitName,
    target: BaseUnitName,
    context: ConversionContext,
): number | null {
    if (from === target) return quantity;
    const pieceGrams = gramsPerPiece(context);
    if (!pieceGrams) return null;
    if (from === 'PIECE' && target === 'G') return round(quantity * pieceGrams);
    if (from === 'G' && target === 'PIECE') return round(quantity / pieceGrams);
    return null;
}

function joinText(...parts: Array<string | null | undefined>): string | null {
    const text = parts.filter((part): part is string => !!part && part.trim() !== '').join(' + ');
    return text || null;
}

function describe(amount: string | null | undefined, unit: string | null | undefined): string {
    return [amount?.trim(), unit?.trim()].filter(Boolean).join(' ');
}

/**
 * Adds one recipe statement to the stored amount of a list entry.
 * Same base unit → added; piece and gram → converted via the piece weight
 * (into grams); anything unsafe is appended to the text part.
 */
export function addToQuantity(
    current: StoredQuantity,
    amount: string | null | undefined,
    unit: string | null | undefined,
    context: ConversionContext = {},
): StoredQuantity {
    const addition = toBaseQuantity(amount, unit, context);
    const unitName = unit?.trim() || null;
    if (!addition) {
        const text = describe(amount, unit);
        return { ...current, quantityText: joinText(current.quantityText, text) };
    }
    if (current.quantity === null || current.baseUnit === null) {
        return {
            ...current,
            quantity: addition.quantity,
            baseUnit: addition.baseUnit,
            displayUnit: unitName ?? BASE_UNIT_LABEL[addition.baseUnit],
        };
    }
    let base = current.baseUnit;
    let total: number | null = null;
    const direct = convertBase(addition.quantity, addition.baseUnit, base, context);
    if (direct !== null && (addition.baseUnit === base || base === 'G')) {
        total = current.quantity + direct;
    } else {
        // Current amount is in pieces and the addition in grams: switch to grams
        const currentInGrams = convertBase(current.quantity, base, 'G', context);
        const additionInGrams = convertBase(addition.quantity, addition.baseUnit, 'G', context);
        if (currentInGrams !== null && additionInGrams !== null) {
            base = 'G';
            total = currentInGrams + additionInGrams;
        }
    }
    if (total === null) {
        return { ...current, quantityText: joinText(current.quantityText, describe(amount, unit)) };
    }
    const displayUnit =
        base === current.baseUnit && (current.displayUnit ?? null) === unitName
            ? current.displayUnit
            : BASE_UNIT_LABEL[base];
    return { ...current, quantity: round(total), baseUnit: base, displayUnit };
}

/** Sums several statements, e.g. all sources of one entry. */
export function sumQuantities(
    statements: Array<{ amount: string | null | undefined; unit: string | null | undefined }>,
    context: ConversionContext = {},
): StoredQuantity {
    return statements.reduce(
        (total, statement) => addToQuantity(total, statement.amount, statement.unit, context),
        { ...EMPTY_QUANTITY },
    );
}

/** Value of a stored base quantity in its display unit (null if not convertible). */
export function displayValue(
    stored: StoredQuantity,
    context: ConversionContext = {},
): number | null {
    if (stored.quantity === null || stored.baseUnit === null) return null;
    const factor = unitFactor(stored.displayUnit ?? BASE_UNIT_LABEL[stored.baseUnit], context);
    if (!factor) return null;
    const inBase = convertBase(stored.quantity, stored.baseUnit, factor.baseUnit, context);
    return inBase === null ? null : round(inBase / factor.factor);
}

/** "450 g + 1 Bund"; falls back to the base unit when the display unit cannot be used. */
export function formatQuantity(stored: StoredQuantity, context: ConversionContext = {}): string {
    let main = '';
    if (stored.quantity !== null && stored.baseUnit !== null) {
        const value = displayValue(stored, context);
        main =
            value !== null
                ? `${formatNumber(value)} ${stored.displayUnit ?? BASE_UNIT_LABEL[stored.baseUnit]}`
                : `${formatNumber(stored.quantity)} ${BASE_UNIT_LABEL[stored.baseUnit]}`;
    }
    return joinText(main.trim(), stored.quantityText) ?? '';
}
