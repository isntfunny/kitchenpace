// DB side of the main ingredients (KUC-131): the Prisma select for recipe ingredient lines
// and their conversion into `MainIngredientLine`s (amounts in a base unit). Used by the
// index sync in the worker and by the week filter of the search; no server-only imports.
import type { Prisma } from '@prisma/client';

import { toBaseQuantity, type BaseUnitName } from '@app/lib/shopping/quantity';
import type { MainIngredientLine } from '@shared/meal-planning/main-ingredients';
import type { BaseUnit } from '@shared/meal-planning/types';

const CATEGORY_SELECT = {
    slug: true,
    parent: { select: { slug: true, parent: { select: { slug: true } } } },
} as const;

/** Recipe ingredient fields the derivation needs */
export const MAIN_INGREDIENT_LINE_SELECT = {
    isOptional: true,
    amount: true,
    unit: { select: { shortName: true, gramsDefault: true } },
    ingredient: {
        select: {
            name: true,
            categories: { select: CATEGORY_SELECT },
            ingredientUnits: { select: { grams: true, unit: { select: { shortName: true } } } },
        },
    },
} satisfies Prisma.RecipeIngredientSelect;

type CategoryRow = { slug: string; parent?: CategoryRow | null };

export type MainIngredientLineRow = {
    isOptional: boolean;
    amount: string;
    unit: { shortName: string; gramsDefault: number | null } | null;
    ingredient: {
        name: string;
        categories: CategoryRow[];
        ingredientUnits: { grams: number | null; unit: { shortName: string } }[];
    } | null;
};

const BASE: Record<BaseUnitName, BaseUnit> = { G: 'g', ML: 'ml', PIECE: 'Stk' };

function categorySlugs(categories: CategoryRow[]): string[] {
    const slugs = new Set<string>();
    for (const category of categories) {
        for (let node: CategoryRow | null | undefined = category; node; node = node.parent) {
            slugs.add(node.slug);
        }
    }
    return [...slugs];
}

/** One line in base units; pieces become grams when the ingredient has a piece weight. */
export function toMainIngredientLine(row: MainIngredientLineRow): MainIngredientLine | null {
    if (!row.ingredient) return null;
    const ingredientGrams = Object.fromEntries(
        row.ingredient.ingredientUnits.map((u) => [u.unit.shortName, u.grams]),
    );
    const unitName = row.unit?.shortName ?? null;
    const base = toBaseQuantity(row.amount, unitName, {
        ingredientGrams,
        unitDefaults: unitName ? { [unitName]: row.unit?.gramsDefault } : {},
    });
    let amount = base?.quantity;
    let unit = base ? BASE[base.baseUnit] : undefined;
    const pieceGrams = ingredientGrams.Stk;
    if (unit === 'Stk' && amount !== undefined && pieceGrams && pieceGrams > 0) {
        amount = Math.round(amount * pieceGrams * 1000) / 1000;
        unit = 'g';
    }
    return {
        name: row.ingredient.name,
        categorySlugs: categorySlugs(row.ingredient.categories),
        optional: row.isOptional,
        ...(amount !== undefined && unit && { amount, unit }),
    };
}

export function toMainIngredientLines(
    rows: readonly MainIngredientLineRow[],
): MainIngredientLine[] {
    return rows.flatMap((row) => {
        const line = toMainIngredientLine(row);
        return line ? [line] : [];
    });
}
