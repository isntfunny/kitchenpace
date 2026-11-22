// "Nach Haltbarkeit ordnen" (KUC-96) and leftover hints
// (KUC-108) on the plan page: loads the week, runs the pure logic of `shared/meal-planning`
// and returns plain DTOs. Nothing here writes to the plan except `applyShelfLifeOrder`,
// which the user confirms first. Pass `prisma` as `db`.
import type { Db } from '@app/lib/meal-plan/db';
import { getMealPlanWeek } from '@app/lib/meal-plan/repository';
import { DEFAULT_HOUSEHOLD_SIZE } from '@app/lib/meal-plan/slots';
import type { DishMarker } from '@app/lib/meal-plan/view';
import { todayIn } from '@shared/dates';
import { loadShelfLifeDays } from '@shared/ingredient-shelf-life/storage-life';
import {
    analyzeShelfLife,
    suggestShelfLifeOrder,
    type ShelfLifeInput,
    type ShelfLifeRecipe,
} from '@shared/meal-planning/shelf-life';
import type { IsoDate, SlotRef } from '@shared/meal-planning/types';

import {
    buildPlannedSlots,
    freshnessMarkers,
    movesToEntryUpdates,
    purchaseDateFor,
    type PlanEntryLite,
} from './mappers';

export interface WeekContext {
    startDate: IsoDate;
    days: IsoDate[];
    today: IsoDate;
    householdSize: number;
    shoppingDay: number | null;
    /** Enabled slot keys of the week (fixed and custom) */
    slotKeys: string[];
    entries: PlanEntryLite[];
}

export async function loadWeekContext(
    db: Db,
    userId: string,
    startDate: IsoDate,
): Promise<WeekContext> {
    const week = await getMealPlanWeek(db, userId, startDate);
    return {
        startDate,
        days: week.days,
        today: todayIn(week.settings.timezone),
        householdSize: week.settings.householdSize ?? DEFAULT_HOUSEHOLD_SIZE,
        shoppingDay: week.settings.shoppingDay,
        slotKeys: week.slots.filter((slot) => slot.enabled).map((slot) => slot.key),
        entries: week.entries.map((entry) => ({
            id: entry.id,
            recipeId: entry.recipeId,
            date: entry.date.toISOString().slice(0, 10),
            slot: entry.slot,
            position: entry.position,
            time: entry.time,
            pinned: entry.pinned,
            status: entry.status,
        })),
    };
}

// ── Freshness (KUC-96) ──────────────────────────────────────────────────────

async function loadShelfLifeInput(db: Db, ctx: WeekContext): Promise<ShelfLifeInput> {
    const slots = buildPlannedSlots(ctx.days, ctx.slotKeys, ctx.entries).filter((s) => s.recipeId);
    const recipeIds = [...new Set(slots.map((slot) => slot.recipeId as string))];
    const lines = recipeIds.length
        ? await db.recipeIngredient.findMany({
              where: { recipeId: { in: recipeIds }, isOptional: false },
              select: { recipeId: true, ingredientId: true },
          })
        : [];
    const ingredientIds = [...new Set(lines.map((line) => line.ingredientId))];
    const [ingredients, days, titles] = await Promise.all([
        ingredientIds.length
            ? db.ingredient.findMany({
                  where: { id: { in: ingredientIds } },
                  select: { id: true, name: true, normalizedName: true },
              })
            : Promise.resolve([]),
        loadShelfLifeDays(db, ingredientIds),
        recipeIds.length
            ? db.recipe.findMany({
                  where: { id: { in: recipeIds } },
                  select: { id: true, title: true },
              })
            : Promise.resolve([]),
    ]);
    const info = new Map(ingredients.map((i) => [i.id, i.normalizedName?.trim() || i.name]));
    const recipes: ShelfLifeRecipe[] = recipeIds.map((id) => ({
        id,
        title: titles.find((t) => t.id === id)?.title,
        ingredients: lines
            .filter((line) => line.recipeId === id)
            .map((line) => ({
                ingredientId: line.ingredientId,
                name: info.get(line.ingredientId),
                days: days.get(line.ingredientId) ?? null,
            })),
    }));
    return { slots, recipes, purchaseDate: purchaseDateFor(ctx.today, ctx.shoppingDay) };
}

/** Freshness markers per entry id for the week view. */
export async function getFreshnessMarkers(
    db: Db,
    userId: string,
    startDate: IsoDate,
): Promise<Record<string, DishMarker[]>> {
    const ctx = await loadWeekContext(db, userId, startDate);
    if (ctx.entries.length === 0) return {};
    const input = await loadShelfLifeInput(db, ctx);
    return freshnessMarkers(analyzeShelfLife(input), ctx.entries);
}

export interface ShelfLifeProposalDTO {
    changed: boolean;
    reasons: string[];
    /** "Lachs: Mi Abend → Mo Abend" */
    moves: { title: string; from: SlotRef; to: SlotRef }[];
    warningsBefore: number;
    warningsAfter: number;
    /** Identifies the proposal; the apply step only runs for the same proposal */
    signature: string;
}

const signatureOf = (moves: readonly { recipeId: string; from: SlotRef; to: SlotRef }[]) =>
    moves
        .map((m) => `${m.recipeId}:${m.from.date}|${m.from.slot}>${m.to.date}|${m.to.slot}`)
        .sort()
        .join(';');

async function proposeOrder(db: Db, userId: string, startDate: IsoDate) {
    const ctx = await loadWeekContext(db, userId, startDate);
    const input = await loadShelfLifeInput(db, ctx);
    return { ctx, input, proposal: suggestShelfLifeOrder(input) };
}

export async function previewShelfLifeOrder(
    db: Db,
    userId: string,
    startDate: IsoDate,
): Promise<ShelfLifeProposalDTO> {
    const { input, proposal } = await proposeOrder(db, userId, startDate);
    const titles = new Map(input.recipes.map((r) => [r.id, r.title ?? 'Gericht']));
    return {
        changed: proposal.changed,
        reasons: proposal.reasons,
        moves: proposal.moves.map((move) => ({
            title: titles.get(move.recipeId) ?? 'Gericht',
            from: move.from,
            to: move.to,
        })),
        warningsBefore: proposal.warningsBefore,
        warningsAfter: proposal.warningsAfter,
        signature: signatureOf(proposal.moves),
    };
}

/**
 * Carries out the proposal the user confirmed. Recomputed here: if the plan changed since
 * the preview (different signature), nothing is moved.
 */
export async function applyShelfLifeOrder(
    db: Db,
    userId: string,
    startDate: IsoDate,
    signature: string,
    move: (entryId: string, to: { date: IsoDate; slot: string }) => Promise<unknown>,
): Promise<{ moved: number } | { stale: true }> {
    const { ctx, proposal } = await proposeOrder(db, userId, startDate);
    if (!proposal.changed || signatureOf(proposal.moves) !== signature) return { stale: true };
    const updates = movesToEntryUpdates(proposal.moves, ctx.entries);
    for (const update of updates)
        await move(update.entryId, { date: update.date, slot: update.slot });
    return { moved: updates.length };
}
