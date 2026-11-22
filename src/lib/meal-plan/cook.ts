// "Gekocht" from the plan (KUC-103). One plan entry counts at most once: the claim on
// `status`/`cookHistoryId` makes repeated taps and parallel requests no-ops, and a
// cook the user already logged on the recipe page in the last hours is linked instead
// of creating a second one. Pantry booking is separate (src/lib/pantry/book.ts).
import { addDays, formatIsoDate } from '@shared/dates';

import { type Db, inTransaction, notFound } from './db';
import { findOwnedEntry } from './repository';
import { idSchema, userIdSchema } from './schemas';
import { toDbDate } from './week';

/** A recipe-page cook this recent is taken as the cook of the planned entry */
export const LINK_WINDOW_MS = 12 * 60 * 60 * 1000;

export interface CookResult {
    entryId: string;
    recipeId: string;
    /** The entry was cooked before; nothing changed */
    alreadyCooked: boolean;
    /** A new cook history row was written and cookCount raised */
    counted: boolean;
    cookHistoryId: string | null;
}

const COOKED_STATES = ['COMPLETED'];

/**
 * Marks an entry as cooked. Writes the cook history and `cookCount` like the recipe
 * page does, except for leftover meals (the dish was counted when it was cooked).
 */
export async function cookMealPlanEntry(
    db: Db,
    userId: string,
    entryId: string,
    now: Date = new Date(),
    /** The user's local date (todayIn(timezone)); defaults to the UTC date */
    today: string = now.toISOString().slice(0, 10),
): Promise<CookResult> {
    const owner = userIdSchema.parse(userId);
    const id = idSchema.parse(entryId);
    return inTransaction(db, async (tx) => {
        const entry = await findOwnedEntry(tx, owner, id);
        const base = { entryId: entry.id, recipeId: entry.recipeId };
        const nothing = { ...base, alreadyCooked: true, counted: false };
        if (entry.cookHistoryId || COOKED_STATES.includes(entry.status))
            return { ...nothing, cookHistoryId: entry.cookHistoryId };

        // Past days count on their own date, not on the day the user confirms
        const entryDate = formatIsoDate(entry.date);
        const cookedAt = entryDate < today ? noonOf(entryDate) : now;
        const claim = await tx.mealPlanRecipe.updateMany({
            where: { id: entry.id, userId: owner, cookHistoryId: null, status: entry.status },
            data: { status: 'COMPLETED', cookedAt },
        });
        if (claim.count === 0) return { ...nothing, cookHistoryId: null };
        if (entry.leftoverOfId)
            return { ...base, alreadyCooked: false, counted: false, cookHistoryId: null };

        const recent = await unlinkedRecentCook(tx, owner, entry.recipeId, now);
        const historyId =
            recent ??
            (
                await tx.userCookHistory.create({
                    data: {
                        userId: owner,
                        recipeId: entry.recipeId,
                        servings: entry.servings,
                        cookedAt,
                    },
                    select: { id: true },
                })
            ).id;
        if (!recent)
            await tx.recipe.update({
                where: { id: entry.recipeId },
                data: { cookCount: { increment: 1 } },
            });
        await tx.mealPlanRecipe.update({
            where: { id: entry.id },
            data: { cookHistoryId: historyId },
        });
        return { ...base, alreadyCooked: false, counted: !recent, cookHistoryId: historyId };
    });
}

const noonOf = (date: string) => new Date(`${date}T12:00:00.000Z`);

async function unlinkedRecentCook(db: Db, userId: string, recipeId: string, now: Date) {
    const rows = await db.userCookHistory.findMany({
        where: {
            userId,
            recipeId,
            cookedAt: { gte: new Date(now.getTime() - LINK_WINDOW_MS) },
        },
        select: { id: true },
        orderBy: { cookedAt: 'desc' },
        take: 5,
    });
    if (!rows.length) return null;
    const linked = await db.mealPlanRecipe.findMany({
        where: { cookHistoryId: { in: rows.map((row) => row.id) } },
        select: { cookHistoryId: true },
    });
    const taken = new Set(linked.map((row) => row.cookHistoryId));
    return rows.find((row) => !taken.has(row.id))?.id ?? null;
}

/**
 * "Doch nicht gekocht": back to planned. Removes the cook history it wrote unless the
 * user added a photo or a note there. The pantry stays booked (`pantryBookedAt`), so
 * cooking again never deducts twice.
 */
export async function uncookMealPlanEntry(db: Db, userId: string, entryId: string) {
    const owner = userIdSchema.parse(userId);
    return inTransaction(db, async (tx) => {
        const entry = await findOwnedEntry(tx, owner, idSchema.parse(entryId));
        await tx.mealPlanRecipe.update({
            where: { id: entry.id },
            data: { status: 'PLANNED', cookedAt: null, cookHistoryId: null },
        });
        if (!entry.cookHistoryId) return { entryId: entry.id, removedCook: false };
        const history = await tx.userCookHistory.findFirst({
            where: { id: entry.cookHistoryId, userId: owner },
            select: { id: true, imageKey: true, notes: true },
        });
        if (!history || history.imageKey || history.notes)
            return { entryId: entry.id, removedCook: false };
        await tx.userCookHistory.delete({ where: { id: history.id } });
        await tx.recipe.updateMany({
            where: { id: entry.recipeId, cookCount: { gt: 0 } },
            data: { cookCount: { decrement: 1 } },
        });
        return { entryId: entry.id, removedCook: true };
    });
}

/** "Nicht gekocht" on a past day: the dish is shown as skipped. */
export async function skipMealPlanEntry(db: Db, userId: string, entryId: string) {
    const owner = userIdSchema.parse(userId);
    const entry = await findOwnedEntry(db, owner, idSchema.parse(entryId));
    if (entry.cookHistoryId) throw notFound('Eintrag');
    await db.mealPlanRecipe.update({
        where: { id: entry.id },
        data: { status: 'CANCELLED', cookedAt: null },
    });
    return { entryId: entry.id };
}

/**
 * Recipe page "Gekocht" (existing path): links the new cook to a matching plan entry of
 * yesterday or today, so a later tap in the plan does not count it again.
 * Returns the linked entry id or null.
 */
export async function linkCookToPlan(
    db: Db,
    userId: string,
    input: { cookHistoryId: string; recipeId: string; cookedAt: Date; today: string },
): Promise<string | null> {
    const owner = userIdSchema.parse(userId);
    const entry = await db.mealPlanRecipe.findFirst({
        where: {
            userId: owner,
            recipeId: idSchema.parse(input.recipeId),
            date: { gte: toDbDate(addDays(input.today, -1)), lte: toDbDate(input.today) },
            cookHistoryId: null,
            leftoverOfId: null,
            status: { in: ['PLANNED', 'IN_PROGRESS'] },
        },
        orderBy: [{ date: 'desc' }, { position: 'asc' }],
        select: { id: true },
    });
    if (!entry) return null;
    const claim = await db.mealPlanRecipe.updateMany({
        where: { id: entry.id, cookHistoryId: null },
        data: {
            status: 'COMPLETED',
            cookedAt: input.cookedAt,
            cookHistoryId: idSchema.parse(input.cookHistoryId),
        },
    });
    return claim.count ? entry.id : null;
}
