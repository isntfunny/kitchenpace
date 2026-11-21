// "Plan mir die Woche" (KUC-113), "Nach Haltbarkeit ordnen" (KUC-96) and leftover hints
// (KUC-108) on the plan page: loads the week, runs the pure logic of `shared/meal-planning`
// and returns plain DTOs. Nothing here writes to the plan except `applyShelfLifeOrder`,
// which the user confirms first. Pass `prisma` as `db`.
import type { Db } from '@app/lib/meal-plan/db';
import { getMealPlanWeek } from '@app/lib/meal-plan/repository';
import { DEFAULT_HOUSEHOLD_SIZE } from '@app/lib/meal-plan/slots';
import type { DishMarker } from '@app/lib/meal-plan/view';
import { todayIn } from '@app/lib/meal-plan/week';
import { getLeftoverHints } from '@app/lib/pantry/leftovers';
import { weekdayNameDe } from '@shared/meal-planning/dates';
import { suggestLeftoverRecipes, type LeftoverHint } from '@shared/meal-planning/leftovers';
import {
    analyzeShelfLife,
    suggestShelfLifeOrder,
    type ShelfLifeInput,
    type ShelfLifeRecipe,
} from '@shared/meal-planning/shelf-life';
import {
    suggestWeek,
    swapSuggestion,
    type SuggestWeekInput,
    type WeekSuggestion,
} from '@shared/meal-planning/suggest-week';
import type { IsoDate, SlotRef } from '@shared/meal-planning/types';

import { loadRecipeRows, toCandidates, type RankByTaste, type RecipeCard } from './candidates';
import {
    buildPlannedSlots,
    freshnessMarkers,
    movesToEntryUpdates,
    purchaseDateFor,
    type PlanEntryLite,
    type TimeSeasonSet,
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

// ── "Plan mir die Woche" ────────────────────────────────────────────────────

export interface SuggestionDTO extends SlotRef {
    recipeId: string;
    title: string;
    slug: string;
    imageKey: string | null;
    totalTime: number;
    reasons: string[];
}

export interface WeekSuggestionsDTO {
    suggestions: SuggestionDTO[];
    /** Empty slots without any remaining recipe */
    unfilled: number;
    /** Free slots of the week that the planner tried to fill */
    freeSlots: number;
}

/** Stable seed per user and week: same week, same proposal (until the plan changes). */
export function seedOf(text: string): number {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

async function buildSuggestInput(
    db: Db,
    userId: string,
    ctx: WeekContext,
    sets: readonly TimeSeasonSet[],
    seedSalt = 0,
    rank?: RankByTaste,
): Promise<{ input: SuggestWeekInput; cards: Map<string, RecipeCard> }> {
    const plannedIds = [...new Set(ctx.entries.map((entry) => entry.recipeId))];
    const [{ rows, cards }, leftovers] = await Promise.all([
        loadRecipeRows(db, userId, { includeIds: plannedIds, rank }),
        getLeftoverHints(db, userId, ctx.today),
    ]);
    const candidates = toCandidates(rows, sets, ctx.householdSize);
    const planned = new Set(plannedIds);
    return {
        cards,
        input: {
            slots: buildPlannedSlots(ctx.days, ctx.slotKeys, ctx.entries, { today: ctx.today }),
            candidates,
            plannedRecipes: candidates.filter((candidate) => planned.has(candidate.id)),
            expiring: leftovers.flatMap((leftover) =>
                leftover.expiresOn
                    ? [
                          {
                              ingredientId: leftover.ingredientId,
                              name: leftover.name,
                              expiresOn: leftover.expiresOn,
                          },
                      ]
                    : [],
            ),
            seed: seedOf(`${userId}:${ctx.startDate}`) + seedSalt,
        },
    };
}

export function toSuggestionDTO(
    suggestion: WeekSuggestion,
    cards: ReadonlyMap<string, RecipeCard>,
): SuggestionDTO | null {
    const card = cards.get(suggestion.recipeId);
    if (!card) return null;
    return {
        date: suggestion.date,
        slot: suggestion.slot,
        recipeId: suggestion.recipeId,
        title: card.title,
        slug: card.slug,
        imageKey: card.imageKey,
        totalTime: card.totalTime,
        reasons: suggestion.reasons,
    };
}

export async function suggestForWeek(
    db: Db,
    userId: string,
    startDate: IsoDate,
    sets: readonly TimeSeasonSet[],
    options: { reroll?: number; rank?: RankByTaste } = {},
): Promise<WeekSuggestionsDTO> {
    const ctx = await loadWeekContext(db, userId, startDate);
    const { input, cards } = await buildSuggestInput(
        db,
        userId,
        ctx,
        sets,
        options.reroll ?? 0,
        options.rank,
    );
    const result = suggestWeek(input);
    return {
        suggestions: result.suggestions.flatMap((s) => {
            const dto = toSuggestionDTO(s, cards);
            return dto ? [dto] : [];
        }),
        unfilled: result.unfilled.length,
        freeSlots: input.slots.filter((slot) => !slot.recipeId).length,
    };
}

/** Next best recipe for one suggested slot; `null` if nothing is left. */
export async function swapForWeek(
    db: Db,
    userId: string,
    startDate: IsoDate,
    sets: readonly TimeSeasonSet[],
    current: readonly { date: IsoDate; slot: SlotRef['slot']; recipeId: string }[],
    target: SlotRef,
    rejectedRecipeIds: readonly string[],
): Promise<SuggestionDTO | null> {
    const ctx = await loadWeekContext(db, userId, startDate);
    const { input, cards } = await buildSuggestInput(db, userId, ctx, sets);
    const next = swapSuggestion(
        input,
        current.map((c) => ({ ...c, score: 0, reasons: [] })),
        target,
        { rejectedRecipeIds },
    );
    return next ? toSuggestionDTO(next, cards) : null;
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
    const [ingredients, lives, titles] = await Promise.all([
        ingredientIds.length
            ? db.ingredient.findMany({
                  where: { id: { in: ingredientIds } },
                  select: {
                      id: true,
                      name: true,
                      normalizedName: true,
                      defaultStorage: true,
                      shelfLifeSource: true,
                  },
              })
            : Promise.resolve([]),
        ingredientIds.length
            ? db.ingredientStorageLife.findMany({
                  where: { ingredientId: { in: ingredientIds } },
                  select: { ingredientId: true, storage: true, days: true },
              })
            : Promise.resolve([]),
        recipeIds.length
            ? db.recipe.findMany({
                  where: { id: { in: recipeIds } },
                  select: { id: true, title: true },
              })
            : Promise.resolve([]),
    ]);
    const days = new Map<string, number>();
    for (const ingredient of ingredients) {
        if (!ingredient.shelfLifeSource) continue; // not assessed: unknown, never critical
        const own = lives.filter((life) => life.ingredientId === ingredient.id);
        const pick =
            own.find((life) => life.storage === ingredient.defaultStorage) ??
            own.find((life) => life.storage === 'FRIDGE') ??
            own.find((life) => life.storage === 'PANTRY');
        if (pick) days.set(ingredient.id, pick.days);
    }
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

// ── Leftovers (KUC-108) ─────────────────────────────────────────────────────

export interface LeftoverNoticeDTO {
    leftoverId: string;
    message: string;
    suggestedDate: IsoDate;
    /** "Donnerstag" */
    dayLabel: string;
    recipes: (RecipeCard & { reasons: string[] })[];
}

/** Hints for leftovers that expire soon, each with up to three matching recipes. */
export async function getLeftoverNotices(
    db: Db,
    userId: string,
    sets: readonly TimeSeasonSet[],
    ctx: Pick<WeekContext, 'today' | 'householdSize'>,
): Promise<LeftoverNoticeDTO[]> {
    const leftovers = await getLeftoverHints(db, userId, ctx.today);
    if (leftovers.length === 0) return [];
    const { rows, cards } = await loadRecipeRows(db, userId);
    const hints: LeftoverHint[] = suggestLeftoverRecipes({
        leftovers,
        candidates: toCandidates(rows, sets, ctx.householdSize),
        today: ctx.today,
    });
    return hints.map((hint) => ({
        leftoverId: hint.leftoverId,
        message: hint.message,
        suggestedDate: hint.suggestedDate,
        dayLabel: weekdayNameDe(hint.suggestedDate),
        recipes: hint.recipes.flatMap((recipe) => {
            const card = cards.get(recipe.recipeId);
            return card ? [{ ...card, reasons: recipe.reasons }] : [];
        }),
    }));
}
