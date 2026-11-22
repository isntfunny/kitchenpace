'use server';

// Server actions of the week selection dialog (KUC-126). Opening, "Probier auch mal" and
// "Dazu passt" only read; "Übernehmen" writes the plan (and re-plans reminders).
import { z } from 'zod';

import type { RecipeCardData } from '@app/app/actions/recipes';
import { loadSearchStartData, type SearchStartData } from '@app/app/recipes/start-data';
import { idSchema, isoDateSchema } from '@app/lib/meal-plan/schemas';
import {
    loadWeekSelection,
    planWeekSelection,
    type WeekSelectionSlot,
} from '@app/lib/meal-plan/selection';
import { loadPickInfo } from '@app/lib/meal-plan/selection-loader.server';
import { MEAL_TYPE_LABELS, isFixedSlot } from '@app/lib/meal-plan/slots';
import {
    buildRecipeFilterQuery,
    parseRecipeFilterParams,
    type RecipeFilterSearchParams,
} from '@app/lib/recipeFilters';
import { loadGlobalMeanRating, loadRankingRecipes } from '@app/lib/recipes/ranking-features.server';
import { loadTasteEmbedding } from '@app/lib/recipes/taste-ranking.server';
import { loadCards, searchRecipeIds } from '@app/lib/recipeSearch';
import { buildRecipeBoolQuery } from '@app/lib/recipeSearchQuery';
import { pickSide } from '@shared/meal-planning/side-dish';
import { prisma } from '@shared/prisma';
import { pickTryAlso } from '@shared/recipe-ranking/try-also';

import { run, runWrite, type PlanActionResult } from './run';

export type WeekSelectionOpen = {
    startDate: string;
    days: string[];
    household: number;
    slots: WeekSelectionSlot[];
    /** "date|slotKey" cells that already hold an entry */
    occupied: string[];
    startData: SearchStartData;
};

/** Candidates fetched for "Probier auch mal" and "Dazu passt" */
const HELPER_POOL = 300;
/** Damped rating a "Probier auch mal" dish should reach (filled up below it) */
const TRY_ALSO_MIN_BAYES = 3.8;

/** Filters from the client, normalised exactly like URL filters. */
const filtersOf = (input: unknown): RecipeFilterSearchParams =>
    parseRecipeFilterParams(buildRecipeFilterQuery((input ?? {}) as RecipeFilterSearchParams));

export async function openWeekSelection(
    input: unknown,
): Promise<PlanActionResult<WeekSelectionOpen>> {
    return run(async (userId) => {
        const { startDate } = z.object({ startDate: isoDateSchema }).strict().parse(input);
        const [week, startData] = await Promise.all([
            loadWeekSelection(prisma, userId, startDate),
            loadSearchStartData(),
        ]);
        return {
            startDate: week.startDate,
            days: week.days,
            household: week.household,
            slots: week.slots.map((slot) => ({
                key: slot.key,
                time: slot.time,
                kind: slot.kind,
                label: isFixedSlot(slot.key) ? MEAL_TYPE_LABELS[slot.key] : (slot.name ?? slot.key),
            })),
            occupied: week.occupied,
            startData,
        };
    });
}

const tryAlsoInput = z
    .object({
        startDate: isoDateSchema,
        filters: z.unknown(),
        pickIds: z.array(idSchema).max(30),
        excludeIds: z.array(idSchema).max(400),
        need: z.number().int().min(1).max(6),
    })
    .strict();

/** "Probier auch mal": good main dishes far from the taste profile. */
export async function loadTryAlso(input: unknown): Promise<PlanActionResult<RecipeCardData[]>> {
    return run(async (userId) => {
        const data = tryAlsoInput.parse(input);
        const ids = await searchRecipeIds(
            buildRecipeBoolQuery(filtersOf(data.filters), {
                kind: 'main',
                excludeIds: [...data.excludeIds, ...data.pickIds],
            }),
            HELPER_POOL,
        );
        const [pool, picks, profile, globalMean] = await Promise.all([
            loadRankingRecipes(ids),
            loadRankingRecipes(data.pickIds),
            loadTasteEmbedding(userId).catch(() => null),
            loadGlobalMeanRating(),
        ]);
        const chosen = pickTryAlso([...pool.values()], {
            profile,
            picks: [...picks.values()],
            globalMean,
            seed: `${userId}|${data.startDate}`,
            need: data.need,
            minBayes: TRY_ALSO_MIN_BAYES,
        });
        return loadCards(chosen);
    });
}

const sideInput = z
    .object({ filters: z.unknown(), mainIds: z.array(idSchema).min(1).max(30) })
    .strict();

/** "Dazu passt": at most one side per main dish, only when it lacks starch or vegetables. */
export async function loadSideDishes(
    input: unknown,
): Promise<PlanActionResult<Record<string, { card: RecipeCardData; label: string } | null>>> {
    return run(async () => {
        const data = sideInput.parse(input);
        const base = buildRecipeBoolQuery(filtersOf(data.filters)) as {
            bool: { filter: unknown[]; must_not: unknown[] };
        };
        base.bool.filter.push({ terms: { categorySlugs: ['beilage', 'salat'] } });
        base.bool.must_not.push({ term: { categorySlugs: 'hauptgericht' } });
        const [mains, candidates] = await Promise.all([
            loadRankingRecipes(data.mainIds),
            searchRecipeIds(base, HELPER_POOL).then((ids) => loadRankingRecipes(ids)),
        ]);

        const used = new Set<string>();
        const result: Record<string, { card: RecipeCardData; label: string } | null> = {};
        for (const mainId of data.mainIds) {
            const main = mains.get(mainId);
            const side = main
                ? pickSide(
                      main,
                      [...candidates.values()].filter((c) => !used.has(c.id)),
                  )
                : null;
            if (!side) {
                result[mainId] = null;
                continue;
            }
            used.add(side.id);
            const [card] = await loadCards([{ id: side.id }]);
            result[mainId] = card ? { card, label: `Dazu passt: ${card.title}` } : null;
        }
        return result;
    });
}

/** "Übernehmen": distributes the picks onto the chosen slots and writes the plan. */
export async function applyWeekSelection(
    input: unknown,
): Promise<
    PlanActionResult<{ planned: number; skipped: number; unplaced: number; entryIds: string[] }>
> {
    return runWrite((userId) => planWeekSelection(prisma, userId, input, loadPickInfo));
}
