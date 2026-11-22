// Books what a cooked plan entry used up into the pantry (KUC-107). The "Gekocht" button
// (KUC-103) calls `bookCookedEntry`; the nightly job "book-assumed-cooked" calls
// `bookPastEntries` for plan days that passed without a booking.
// Pure rules: `booking.ts`. Pass `prisma` from '@shared/prisma' as `db`.
import { type Db, inTransaction, notFound } from '@app/lib/meal-plan/db';
import { idSchema, userIdSchema } from '@app/lib/meal-plan/schemas';
import type { ConversionContext } from '@app/lib/shopping/quantity';
import type { RecipeLine } from '@app/lib/shopping/recipe-items';
import { toBerlinDate } from '@shared/dates';

import { needsFromRecipe, planUsage, type PantryPost, type PostUpdate } from './booking';

export interface BookingResult {
    /** false if the entry was already booked (idempotent) */
    booked: boolean;
    alreadyBooked: boolean;
    /** Pantry posts that were (or, in a dry run, would be) changed */
    updates: PostUpdate[];
}

export interface BookOptions {
    /** When the ingredients were used (default: now); sets `openedAt` */
    usedAt?: Date;
    /** Compute only: nothing is written, the entry stays unbooked */
    dryRun?: boolean;
}

const NOTHING: BookingResult = { booked: false, alreadyBooked: false, updates: [] };

/**
 * Deducts the amounts of a plan entry (recipe amount x servings, base unit) from the pantry,
 * sets `openedAt` / `expiresAt` of opened posts and stamps `pantryBookedAt`. Idempotent:
 * a second call changes nothing. Without pantry posts nothing happens, and it is no error.
 * Entries that are the leftover meal of another entry use nothing again.
 */
export async function bookCookedEntry(
    db: Db,
    userId: string,
    mealPlanRecipeId: string,
    now: Date = new Date(),
    options: BookOptions = {},
): Promise<BookingResult> {
    const owner = userIdSchema.parse(userId);
    const entryId = idSchema.parse(mealPlanRecipeId);

    return inTransaction(db, async (tx) => {
        const entry = await tx.mealPlanRecipe.findFirst({
            where: { id: entryId, userId: owner },
            select: {
                id: true,
                recipeId: true,
                servings: true,
                pantryBookedAt: true,
                leftoverOfId: true,
            },
        });
        if (!entry) throw notFound('Eintrag');
        if (entry.pantryBookedAt) return { ...NOTHING, alreadyBooked: true };

        if (!options.dryRun) {
            // Claim first: two parallel calls book once
            const claim = await tx.mealPlanRecipe.updateMany({
                where: { id: entry.id, userId: owner, pantryBookedAt: null },
                data: { pantryBookedAt: now },
            });
            if (claim.count === 0) return { ...NOTHING, alreadyBooked: true };
        }
        if (entry.leftoverOfId) return { ...NOTHING, booked: !options.dryRun };

        const usedAt = options.usedAt ?? now;
        const lines = await loadLines(tx, entry.recipeId);
        const ingredientIds = [...new Set(lines.rows.map((row) => row.ingredientId))];
        const posts = ingredientIds.length
            ? await tx.pantryItem.findMany({
                  where: {
                      userId: owner,
                      status: 'AVAILABLE',
                      ingredientId: { in: ingredientIds },
                  },
                  select: {
                      id: true,
                      ingredientId: true,
                      quantity: true,
                      baseUnit: true,
                      approximate: true,
                      openedAt: true,
                      expiresAt: true,
                      purchasedAt: true,
                      createdAt: true,
                  },
              })
            : [];
        if (posts.length === 0) return { ...NOTHING, booked: !options.dryRun };

        const withPosts = [...new Set(posts.map((post) => post.ingredientId as string))];
        const facts = await loadFacts(tx, withPosts);
        const needs = needsFromRecipe(
            lines.rows,
            entry.servings,
            lines.recipeServings,
            (ingredientId) => facts.contextFor(ingredientId),
        );

        const updates: PostUpdate[] = [];
        for (const [ingredientId, need] of needs) {
            const own = posts.filter((post) => post.ingredientId === ingredientId);
            updates.push(
                ...planUsage(
                    own as PantryPost[],
                    need,
                    {
                        openedShelfLifeDays: facts.shelfLife.get(ingredientId) ?? null,
                        pieceGrams: facts.contextFor(ingredientId).ingredientGrams?.Stk ?? null,
                    },
                    usedAt,
                ),
            );
        }

        if (!options.dryRun) {
            for (const { id, ...data } of updates) {
                await tx.pantryItem.update({
                    where: { id },
                    data: {
                        ...data,
                        mealPlanRecipeId: entry.id,
                        ...(data.status && { statusChangedAt: now }),
                    },
                });
            }
        }
        return { booked: !options.dryRun, alreadyBooked: false, updates };
    });
}

export interface PastBookingReport {
    dryRun: boolean;
    /** Plan entries that were (or would be) booked */
    entries: number;
    /** Pantry posts changed by them */
    updatedPosts: number;
    failed: number;
}

/**
 * "Angenommen gekocht": books every plan entry of a day before today (Berlin) that has no
 * booking yet and was not cancelled. The ingredients count as used on the plan day.
 */
export async function bookPastEntries(
    db: Db,
    now: Date = new Date(),
    options: { dryRun?: boolean; limit?: number } = {},
): Promise<PastBookingReport> {
    const today = toBerlinDate(now);
    const entries = await db.mealPlanRecipe.findMany({
        where: {
            date: { lt: new Date(`${today}T00:00:00.000Z`) },
            pantryBookedAt: null,
            leftoverOfId: null,
            status: { not: 'CANCELLED' },
        },
        select: { id: true, userId: true, date: true },
        orderBy: { date: 'asc' },
        take: options.limit ?? 500,
    });

    const report: PastBookingReport = {
        dryRun: options.dryRun === true,
        entries: 0,
        updatedPosts: 0,
        failed: 0,
    };
    for (const entry of entries) {
        try {
            const usedAt = new Date(`${entry.date.toISOString().slice(0, 10)}T12:00:00.000Z`);
            const result = await bookCookedEntry(db, entry.userId, entry.id, now, {
                usedAt,
                dryRun: options.dryRun,
            });
            report.entries += 1;
            report.updatedPosts += result.updates.length;
        } catch (error) {
            report.failed += 1;
            console.error(`[PantryBooking] entry ${entry.id} failed`, error);
        }
    }
    return report;
}

async function loadLines(db: Db, recipeId: string) {
    const [recipe, rows] = await Promise.all([
        db.recipe.findFirst({ where: { id: recipeId }, select: { servings: true } }),
        db.recipeIngredient.findMany({
            where: { recipeId },
            select: {
                id: true,
                ingredientId: true,
                amount: true,
                isOptional: true,
                position: true,
                unitId: true,
            },
        }),
    ]);
    const units = rows.length
        ? await db.unit.findMany({ select: { id: true, shortName: true, gramsDefault: true } })
        : [];
    const shortName = new Map(units.map((unit) => [unit.id, unit.shortName]));
    const lines: RecipeLine[] = rows.map((row) => ({
        id: row.id,
        ingredientId: row.ingredientId,
        name: '',
        amount: row.amount,
        unit: shortName.get(row.unitId) ?? null,
        isOptional: row.isOptional,
        position: row.position,
    }));
    return { rows: lines, recipeServings: recipe?.servings ?? 4 };
}

/** Conversion data (piece weights, unit defaults) and opened shelf life per ingredient. */
export async function loadFacts(db: Db, ingredientIds: string[]) {
    const [units, ingredientUnits, ingredients] = await Promise.all([
        db.unit.findMany({ select: { id: true, shortName: true, gramsDefault: true } }),
        db.ingredientUnit.findMany({
            where: { ingredientId: { in: ingredientIds } },
            select: { ingredientId: true, unitId: true, grams: true },
        }),
        db.ingredient.findMany({
            where: { id: { in: ingredientIds } },
            select: { id: true, openedShelfLifeDays: true },
        }),
    ]);
    const shortName = new Map(units.map((unit) => [unit.id, unit.shortName]));
    const unitDefaults = Object.fromEntries(
        units.map((unit) => [unit.shortName, unit.gramsDefault]),
    );
    return {
        shelfLife: new Map(ingredients.map((row) => [row.id, row.openedShelfLifeDays])),
        contextFor: (ingredientId: string): ConversionContext => ({
            unitDefaults,
            ingredientGrams: Object.fromEntries(
                ingredientUnits
                    .filter((row) => row.ingredientId === ingredientId)
                    .map((row) => [shortName.get(row.unitId) ?? '', row.grams]),
            ),
        }),
    };
}
