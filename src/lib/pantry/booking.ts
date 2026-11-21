// Pure pantry bookkeeping (KUC-107): what a cooked plan entry uses up, and which pantry
// posts it is taken from. No DB access; `book.ts` loads and writes the data.
//
// Rules
// - Needs: recipe amount x (plan servings / recipe servings) per ingredient, converted to a
//   base unit (g, ml, piece). Optional lines are not assumed to be used.
// - Order of posts: already opened first, then the earliest expiry, then the oldest purchase.
// - A need is taken from the posts in that order, spilling over to the next one. Piece and
//   gram are converted via the piece weight (IngredientUnit "Stk"); anything else that does
//   not match is not deducted.
// - A touched post gets `openedAt` (if it was sealed) and, with a known "Haltbarkeit nach
//   Anbruch", `expiresAt` = opening + days (an earlier existing expiry wins).
// - An amount that cannot be converted ("nach Geschmack", 1 Bund) still opens the first
//   post, the amount is marked approximate ("~") and nothing is deducted.
// - A post that reaches 0 is USED_UP.
// - A whole post is treated as one pack: several sealed packs in one post are not modelled.
import { portionFactor } from '@app/lib/ingredients/quantities';
import {
    toBaseQuantity,
    type BaseUnitName,
    type ConversionContext,
} from '@app/lib/shopping/quantity';
import { scaledAmount, type RecipeLine } from '@app/lib/shopping/recipe-items';

import { expiresAfterOpening, remainingAfterUse } from './rules';

export interface PantryPost {
    id: string;
    quantity: number | null;
    baseUnit: BaseUnitName | null;
    approximate: boolean;
    openedAt: Date | null;
    expiresAt: Date | null;
    purchasedAt: Date | null;
    createdAt: Date;
}

/** What one plan entry uses of one ingredient. */
export interface IngredientNeed {
    amounts: Partial<Record<BaseUnitName, number>>;
    /** At least one line had no usable amount */
    unknown: boolean;
}

export interface PostUpdate {
    id: string;
    quantity?: number;
    approximate?: boolean;
    openedAt?: Date;
    expiresAt?: Date;
    status?: 'USED_UP';
}

const EPSILON = 1e-9;

/** Needs of a plan entry per ingredient id. */
export function needsFromRecipe(
    lines: readonly RecipeLine[],
    servings: number,
    recipeServings: number,
    contextFor: (ingredientId: string) => ConversionContext,
): Map<string, IngredientNeed> {
    const factor = portionFactor(servings, recipeServings);
    const needs = new Map<string, IngredientNeed>();
    for (const line of lines) {
        if (line.isOptional) continue;
        const need = needs.get(line.ingredientId) ?? { amounts: {}, unknown: false };
        const base = toBaseQuantity(
            scaledAmount(line, factor),
            line.unit,
            contextFor(line.ingredientId),
        );
        if (base) need.amounts[base.baseUnit] = (need.amounts[base.baseUnit] ?? 0) + base.quantity;
        else need.unknown = true;
        needs.set(line.ingredientId, need);
    }
    return needs;
}

function priority(a: PantryPost, b: PantryPost): number {
    const opened = Number(b.openedAt !== null) - Number(a.openedAt !== null);
    if (opened) return opened;
    const expiry =
        (a.expiresAt?.getTime() ?? Number.POSITIVE_INFINITY) -
        (b.expiresAt?.getTime() ?? Number.POSITIVE_INFINITY);
    if (expiry && Number.isFinite(expiry)) return expiry;
    const bought =
        (a.purchasedAt ?? a.createdAt).getTime() - (b.purchasedAt ?? b.createdAt).getTime();
    return bought || a.id.localeCompare(b.id);
}

/** Factor from `from` to `to`; null if not convertible. */
function conversion(
    from: BaseUnitName,
    to: BaseUnitName,
    pieceGrams: number | null,
): number | null {
    if (from === to) return 1;
    if (!pieceGrams || pieceGrams <= 0) return null;
    if (from === 'PIECE' && to === 'G') return pieceGrams;
    if (from === 'G' && to === 'PIECE') return 1 / pieceGrams;
    return null;
}

/**
 * Updates for the pantry posts of one ingredient after a plan entry used `need`.
 * `posts` are the AVAILABLE posts of that ingredient. Returns nothing if there is nothing
 * to book (no posts, nothing used).
 */
export function planUsage(
    posts: readonly PantryPost[],
    need: IngredientNeed,
    facts: { openedShelfLifeDays: number | null; pieceGrams: number | null },
    usedAt: Date,
): PostUpdate[] {
    const ordered = [...posts].sort(priority);
    const wanted = Object.entries(need.amounts).filter(([, amount]) => (amount ?? 0) > EPSILON) as [
        BaseUnitName,
        number,
    ][];
    if (ordered.length === 0 || (wanted.length === 0 && !need.unknown)) return [];

    const left = new Map(ordered.map((post) => [post.id, post.quantity]));
    const touched = new Set<string>();
    let unmet = need.unknown;

    for (const [unit, amount] of wanted) {
        let open = amount;
        // Same unit first, then converted units
        for (const exact of [true, false]) {
            for (const post of ordered) {
                if (open <= EPSILON) break;
                const available = left.get(post.id);
                if (available == null || available <= EPSILON || !post.baseUnit) continue;
                if ((post.baseUnit === unit) !== exact) continue;
                const factor = conversion(unit, post.baseUnit, facts.pieceGrams);
                if (factor === null) continue;
                const take = Math.min(available, open * factor);
                left.set(post.id, available - take);
                touched.add(post.id);
                open -= take / factor;
            }
        }
        if (open > EPSILON) unmet = true;
    }

    // Unmeasured need: open a post without a known amount, else the first post (approximate)
    if (unmet || touched.size === 0) {
        const unmeasured = ordered.find((post) => post.quantity === null);
        const target = unmeasured ?? (need.unknown ? ordered[0] : undefined);
        if (target) touched.add(target.id);
    }

    const updates: PostUpdate[] = [];
    for (const post of ordered) {
        if (!touched.has(post.id)) continue;
        const update: PostUpdate = { id: post.id };
        const remaining = left.get(post.id);
        if (post.quantity !== null && remaining != null) {
            if (remaining !== post.quantity) {
                update.quantity = remainingAfterUse(post.quantity, post.quantity - remaining) ?? 0;
                if (update.quantity <= EPSILON) {
                    update.quantity = 0;
                    update.status = 'USED_UP';
                }
            } else if (need.unknown && !post.approximate) {
                update.approximate = true;
            }
        }
        if (post.openedAt === null) {
            update.openedAt = usedAt;
            const expiry = expiresAfterOpening(usedAt, facts.openedShelfLifeDays);
            if (expiry && (!post.expiresAt || expiry.getTime() < post.expiresAt.getTime())) {
                update.expiresAt = expiry;
            }
        }
        if (Object.keys(update).length > 1) updates.push(update);
    }
    return updates;
}
