// View model and pure logic of the shopping list page (KUC-105): grouping into
// open / bought, origin badges, quantity labels and the stepper. No React, no
// database; the server turns Prisma rows into ShoppingItemView.
import type { IngredientIconName } from '@shared/ingredient-icons/names';

import {
    BASE_UNIT_LABEL,
    formatQuantity,
    unitFactor,
    type BaseUnitName,
    type StoredQuantity,
} from './quantity';

export type ItemStatus = 'OPEN' | 'PURCHASED' | 'DORMANT';

export interface SourceView {
    id: string;
    kind: 'RECIPE' | 'MEAL_PLAN' | 'MANUAL' | 'SUGGESTION' | 'BRING';
    recipeId: string | null;
    recipeTitle: string | null;
    /** yyyy-mm-dd of the plan entry (MEAL_PLAN sources) */
    date: string | null;
    quantity: number | null;
    baseUnit: BaseUnitName | null;
    originalAmount: string | null;
    originalUnit: string | null;
    servings: number | null;
}

export interface ShoppingItemView {
    id: string;
    itemKey: string;
    name: string;
    status: ItemStatus;
    /** Resolved on the server: ingredient → category → neutral, or a household icon */
    icon: IngredientIconName;
    quantity: number | null;
    baseUnit: BaseUnitName | null;
    displayUnit: string | null;
    quantityText: string | null;
    note: string | null;
    position: number;
    statusChangedAt: string;
    pack: { size: number; unit: 'G' | 'ML' | 'PIECE' | 'BUNCH' } | null;
    sources: SourceView[];
}

// ── Grouping ────────────────────────────────────────────────────────────

export interface GroupedItems {
    open: ShoppingItemView[];
    /** Bought or dormant, newest first, limited */
    bought: ShoppingItemView[];
    boughtTotal: number;
}

export const BOUGHT_LIMIT = 30;

const byRecent = (a: ShoppingItemView, b: ShoppingItemView) =>
    Date.parse(b.statusChangedAt) - Date.parse(a.statusChangedAt);

export function groupItems(items: readonly ShoppingItemView[], limit = BOUGHT_LIMIT): GroupedItems {
    // Open: the user's own order first, then newest; items from the plan stay together
    const open = items
        .filter((item) => item.status === 'OPEN')
        .sort((a, b) => a.position - b.position || byRecent(a, b));
    const done = items.filter((item) => item.status !== 'OPEN').sort(byRecent);
    return { open, bought: done.slice(0, limit), boughtTotal: done.length };
}

// ── Origin badges ───────────────────────────────────────────────────────

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] as const;

/** Two-letter weekday of a yyyy-mm-dd date (calendar date, no time zone involved). */
export function weekdayShort(isoDate: string): string {
    const [y, m, d] = isoDate.split('-').map(Number);
    return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** Two-letter weekday of an ISO weekday number (1 = Monday … 7 = Sunday). */
export function isoWeekdayShort(weekday: number): string | null {
    return Number.isInteger(weekday) && weekday >= 1 && weekday <= 7 ? WEEKDAYS[weekday % 7] : null;
}

export interface OriginBadge {
    key: string;
    /** "Mo" for a plan entry, null for a recipe/manual origin (shown as an icon) */
    label: string | null;
    kind: 'plan' | 'recipe' | 'manual';
    /** Full text for tooltip and sheet: "Mo: Pasta Alfredo" */
    title: string;
}

/**
 * One badge per plan day or recipe; a manual add has none. Plan days are sorted
 * by date and come first; badges of the same day and recipe appear once.
 */
export function originBadges(sources: readonly SourceView[]): OriginBadge[] {
    const seen = new Set<string>();
    const plan: Array<OriginBadge & { date: string }> = [];
    const recipes: OriginBadge[] = [];
    for (const source of sources) {
        if (source.kind === 'MEAL_PLAN' && source.date) {
            const key = `${source.date}|${source.recipeId ?? ''}`;
            if (seen.has(key)) continue;
            seen.add(key);
            const day = weekdayShort(source.date);
            plan.push({
                key,
                label: day,
                kind: 'plan',
                date: source.date,
                title: source.recipeTitle ? `${day}: ${source.recipeTitle}` : day,
            });
        } else if (source.recipeId) {
            const key = `r|${source.recipeId}`;
            if (seen.has(key)) continue;
            seen.add(key);
            recipes.push({
                key,
                label: null,
                kind: 'recipe',
                title: source.recipeTitle ?? 'Rezept',
            });
        }
    }
    plan.sort((a, b) => a.date.localeCompare(b.date));
    return [...plan.map(({ date: _date, ...badge }) => badge), ...recipes];
}

// ── Quantities ──────────────────────────────────────────────────────────

const stored = (
    item: Pick<ShoppingItemView, 'quantity' | 'baseUnit' | 'displayUnit' | 'quantityText'>,
): StoredQuantity => ({
    quantity: item.quantity,
    baseUnit: item.baseUnit,
    displayUnit: item.displayUnit,
    quantityText: item.quantityText,
});

/** "400 ml", "450 g + 1 Bund", or "" when the item has no amount. */
export function itemQuantityLabel(
    item: Pick<ShoppingItemView, 'quantity' | 'baseUnit' | 'displayUnit' | 'quantityText'>,
): string {
    return formatQuantity(stored(item));
}

/** Share of one source: "200 ml" (converted) or the recipe's own statement. */
export function sourceQuantityLabel(source: SourceView): string {
    if (source.quantity !== null && source.baseUnit !== null) {
        return formatQuantity({
            quantity: source.quantity,
            baseUnit: source.baseUnit,
            displayUnit: null,
            quantityText: null,
        });
    }
    return [source.originalAmount, source.originalUnit].filter(Boolean).join(' ');
}

function stepSize(value: number, base: BaseUnitName): number {
    if (base === 'PIECE') return 1;
    if (value < 100) return 10;
    if (value < 500) return 50;
    return 100;
}

export interface QuantityChange {
    quantity: number;
    baseUnit: BaseUnitName;
    displayUnit: string;
}

/**
 * One stepper click. Starts at one piece when the item has no convertible
 * amount; never goes to zero (returns null: removing is a separate action).
 * A fixed display unit (kg, l …) is kept, anything else shows the base unit.
 */
export function stepQuantity(
    item: Pick<ShoppingItemView, 'quantity' | 'baseUnit' | 'displayUnit'>,
    direction: 1 | -1,
): QuantityChange | null {
    if (item.quantity === null || item.baseUnit === null) {
        return direction === 1 ? { quantity: 1, baseUnit: 'PIECE', displayUnit: 'Stk' } : null;
    }
    const base = item.baseUnit;
    const size = stepSize(direction === 1 ? item.quantity : item.quantity - 1, base);
    const next = Math.round((item.quantity + direction * size) * 1000) / 1000;
    if (next <= 0) return null;
    const keep = item.displayUnit && unitFactor(item.displayUnit)?.baseUnit === base;
    return {
        quantity: next,
        baseUnit: base,
        displayUnit: keep ? (item.displayUnit as string) : BASE_UNIT_LABEL[base],
    };
}

/** "200 ml Packung · 2×" when the pack size is known and fits the amount's unit. */
export function packHint(
    item: Pick<ShoppingItemView, 'quantity' | 'baseUnit' | 'pack'>,
): string | null {
    const { pack, quantity, baseUnit } = item;
    if (!pack || pack.unit === 'BUNCH' || quantity === null || baseUnit !== pack.unit) return null;
    const packs = Math.ceil(quantity / pack.size - 1e-9);
    const label = `${pack.size.toLocaleString('de-DE')} ${BASE_UNIT_LABEL[pack.unit]}`;
    return `${label} Packung · ${Math.max(packs, 1)}×`;
}

// ── Times ───────────────────────────────────────────────────────────────

/** "heute", "gestern", "vor 9 Tagen", "vor 2 Wochen", "vor 1 Monat". */
export function relativeDays(iso: string, now: Date): string {
    const days = Math.floor((now.getTime() - Date.parse(iso)) / 86_400_000);
    if (days <= 0) return 'heute';
    if (days === 1) return 'gestern';
    if (days < 14) return `vor ${days} Tagen`;
    if (days < 30) return `vor ${Math.floor(days / 7)} Wochen`;
    const months = Math.floor(days / 30);
    return months === 1 ? 'vor 1 Monat' : `vor ${months} Monaten`;
}
