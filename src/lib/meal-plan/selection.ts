// Week selection (KUC-126): which slots are free when the dialog opens, and "Übernehmen":
// checks the picks, distributes them with `distributeSelection` and writes the entries.
// Recipe features come in through `loadPicks`, so this file stays testable with the fake db.
import { z } from 'zod';

import { distributeSelection, type SelectionSlot } from '@shared/meal-planning/distribute';
import { effortOf } from '@shared/meal-planning/effort';
import { allowedFor, mealKindOf, type MealKind } from '@shared/meal-planning/meal-kind';

import { DataAccessError, type Db, inTransaction } from './db';
import { purchaseDateFor } from './intelligence/mappers';
import { getMealPlanWeek } from './repository';
import { idSchema, isoDateSchema } from './schemas';
import { DEFAULT_HOUSEHOLD_SIZE, slotColumns, slotKeyOf, type SlotKey } from './slots';
import { todayIn, toDbDate } from './week';

/** What distributing and checking needs of a picked recipe. */
export type PickInfo = {
    categorySlugs: string[];
    tags: string[];
    totalTime: number;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    stepCount: number;
    /** First category, for "no same category on neighbour days" */
    mainCategory: string | null;
    dishType: string;
    /** Shortest shelf life of its required ingredients in days; null = unknown */
    shortestShelfLifeDays: number | null;
};

export type LoadPicks = (recipeIds: string[]) => Promise<Map<string, PickInfo>>;

const kindSchema = z.enum(['main', 'breakfast', 'snack']);

export const applySelectionSchema = z
    .object({
        startDate: isoDateSchema,
        /** "YYYY-MM-DD|slotKey" */
        slots: z.array(z.string().max(80)).min(1).max(40),
        picks: z
            .array(
                z
                    .object({
                        recipeId: idSchema,
                        kind: kindSchema,
                        servings: z.number().int().min(1).max(30),
                        sideRecipeId: idSchema.optional(),
                    })
                    .strict(),
            )
            .max(30),
    })
    .strict();

export type WeekSelectionSlot = { key: string; label: string; time: string; kind: MealKind };

const cell = (date: string, slotKey: string) => `${date}|${slotKey}`;

/** Enabled slots of the week with their kind, and the cells that already hold an entry. */
export async function loadWeekSelection(db: Db, userId: string, startDate: string) {
    const week = await getMealPlanWeek(db, userId, startDate);
    return {
        startDate: week.startDate,
        days: week.days,
        household: week.settings.householdSize ?? DEFAULT_HOUSEHOLD_SIZE,
        slots: week.slots
            .filter((slot) => slot.enabled)
            .map((slot) => ({
                key: slot.key,
                time: slot.time,
                name: slot.name,
                kind: mealKindOf(slot),
            })),
        occupied: [
            ...new Set(
                week.entries.map((entry) =>
                    cell(entry.date.toISOString().slice(0, 10), slotKeyOf(entry)),
                ),
            ),
        ],
        shoppingDay: week.settings.shoppingDay,
        timezone: week.settings.timezone,
    };
}

/**
 * Writes the selection into the chosen free slots. Slots taken since the dialog opened are
 * skipped and counted; a pick not allowed for its kind rejects the whole request.
 */
export async function planWeekSelection(
    db: Db,
    userId: string,
    input: unknown,
    loadPicks: LoadPicks,
): Promise<{ planned: number; skipped: number; unplaced: number; entryIds: string[] }> {
    const data = applySelectionSchema.parse(input);
    const week = await loadWeekSelection(db, userId, data.startDate);

    const kindOf = new Map(week.slots.map((slot) => [slot.key, slot.kind]));
    const days = new Set(week.days);
    const occupied = new Set(week.occupied);
    let skipped = 0;
    const slots: SelectionSlot[] = [];
    for (const key of new Set(data.slots)) {
        const [date, slotKey] = key.split('|');
        const kind = kindOf.get(slotKey ?? '');
        if (!date || !slotKey || !kind || !days.has(date)) continue;
        if (occupied.has(key)) {
            skipped++;
            continue;
        }
        slots.push({ date, slotKey, kind });
    }

    const recipeIds = data.picks.flatMap((p) => [
        p.recipeId,
        ...(p.sideRecipeId ? [p.sideRecipeId] : []),
    ]);
    const info = await loadPicks([...new Set(recipeIds)]);
    for (const pick of data.picks) {
        const recipe = info.get(pick.recipeId);
        if (!recipe || !allowedFor(pick.kind, recipe))
            throw new DataAccessError('INVALID', 'Ein Gericht passt nicht zu dieser Mahlzeit');
        if (pick.sideRecipeId && !info.has(pick.sideRecipeId))
            throw new DataAccessError('INVALID', 'Die Beilage ist nicht verfügbar');
    }

    const { entries, unplaced } = distributeSelection(
        data.picks.map((pick) => {
            const recipe = info.get(pick.recipeId)!;
            return {
                recipeId: pick.recipeId,
                kind: pick.kind,
                servings: pick.servings,
                effort: effortOf(recipe),
                totalTime: recipe.totalTime,
                mainCategory: recipe.mainCategory,
                dishType: recipe.dishType,
                shortestShelfLifeDays: recipe.shortestShelfLifeDays,
                sideRecipeId: pick.sideRecipeId,
            };
        }),
        slots,
        {
            household: week.household,
            purchaseDate: purchaseDateFor(todayIn(week.timezone), week.shoppingDay),
        },
    );

    const owner = z.string().min(1).parse(userId);
    const entryIds = await inTransaction(db, async (tx) => {
        const ids: string[] = [];
        const taken = new Set<string>();
        for (const entry of entries) {
            const key = cell(entry.date, entry.slotKey);
            // Re-check inside the write: another tab may have filled the slot meanwhile
            if (entry.sideOf === undefined && entry.leftoverOf === undefined && !taken.has(key)) {
                const existing = await tx.mealPlanRecipe.findFirst({
                    where: {
                        userId: owner,
                        date: toDbDate(entry.date),
                        ...slotColumns(entry.slotKey as SlotKey),
                    },
                    select: { id: true },
                });
                if (existing) {
                    ids.push('');
                    continue;
                }
            }
            const parent = entry.sideOf ?? entry.leftoverOf;
            if (parent !== undefined && !ids[parent]) {
                ids.push('');
                continue;
            }
            const created = await tx.mealPlanRecipe.create({
                data: {
                    userId: owner,
                    recipeId: entry.recipeId,
                    date: toDbDate(entry.date),
                    ...slotColumns(entry.slotKey as SlotKey),
                    position: entry.sideOf !== undefined ? 1 : 0,
                    servings: entry.servings,
                    leftoverOfId: entry.leftoverOf !== undefined ? ids[entry.leftoverOf] : null,
                },
                select: { id: true },
            });
            taken.add(key);
            ids.push(created.id);
        }
        return ids;
    });

    const written = entryIds.filter(Boolean);
    const mainsWritten = entries.filter(
        (entry, index) =>
            entry.sideOf === undefined && entry.leftoverOf === undefined && entryIds[index],
    ).length;
    const mainsLost = entries.filter(
        (entry, index) =>
            entry.sideOf === undefined && entry.leftoverOf === undefined && !entryIds[index],
    ).length;
    return {
        planned: mainsWritten,
        skipped: skipped + mainsLost,
        unplaced: unplaced.length,
        entryIds: written,
    };
}
