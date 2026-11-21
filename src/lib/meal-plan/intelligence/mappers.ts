// Pure mapping between the plan UI/DB shapes and the planning logic in
// `shared/meal-planning` (KUC-96, KUC-108, KUC-113). No DB access here.
//
// Slots: the logic knows the four fixed meal types; custom slots ("c_<slug>") are neither
// filled with suggestions nor reordered, but their recipes still count as "already planned".
import { MEAL_TYPES } from '@app/lib/meal-plan/slots';
import type { DishMarker } from '@app/lib/meal-plan/view';
import { addDays, isoWeekday } from '@shared/meal-planning/dates';
import type { DishFreshness, ShelfLifeMove } from '@shared/meal-planning/shelf-life';
import type {
    Candidate,
    IsoDate,
    MealSlotType,
    PlannedSlot,
    Season,
} from '@shared/meal-planning/types';

export const isFixedSlotType = (key: string): key is MealSlotType =>
    (MEAL_TYPES as readonly string[]).includes(key);

/** The plan entry fields the planning logic needs. */
export interface PlanEntryLite {
    id: string;
    recipeId: string;
    date: IsoDate;
    slot: string;
    position: number;
    /** Own time (HH:mm); null = slot default */
    time: string | null;
    pinned: boolean;
    status: string;
}

/** Entries that must not be moved: own time, pinned, or already (being) cooked. */
export function isFixedEntry(entry: Pick<PlanEntryLite, 'time' | 'pinned' | 'status'>): boolean {
    return (
        entry.time !== null ||
        entry.pinned ||
        entry.status === 'COMPLETED' ||
        entry.status === 'IN_PROGRESS'
    );
}

/**
 * One planned slot per day and enabled fixed meal type. The main dish of a cell (lowest
 * position) fills the slot; side dishes travel with it. Cancelled entries count as empty.
 * With `today`, empty slots before it are left out.
 */
export function buildPlannedSlots(
    days: readonly IsoDate[],
    enabledSlotKeys: readonly string[],
    entries: readonly PlanEntryLite[],
    options: { today?: IsoDate } = {},
): PlannedSlot[] {
    const slots: PlannedSlot[] = [];
    for (const date of days) {
        for (const key of enabledSlotKeys) {
            if (!isFixedSlotType(key)) continue;
            const main = cellEntries(entries, date, key)[0];
            // Empty slots of past days are not offered for suggestions
            if (!main && options.today && date < options.today) continue;
            slots.push(
                main
                    ? {
                          date,
                          slot: key,
                          recipeId: main.recipeId,
                          ...(isFixedEntry(main) && { fixedTime: main.time ?? 'fixed' }),
                      }
                    : { date, slot: key },
            );
        }
    }
    return slots;
}

/** Entries of one cell, main dish first; cancelled ones are ignored. */
export function cellEntries<T extends PlanEntryLite>(
    entries: readonly T[],
    date: IsoDate,
    slot: string,
): T[] {
    return entries
        .filter((e) => e.date === date && e.slot === slot && e.status !== 'CANCELLED')
        .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
}

/** Entry moves that carry out the moves of a shelf-life proposal: whole cells change place. */
export function movesToEntryUpdates(
    moves: readonly ShelfLifeMove[],
    entries: readonly PlanEntryLite[],
): { entryId: string; date: IsoDate; slot: string }[] {
    const updates: { entryId: string; date: IsoDate; slot: string }[] = [];
    for (const move of moves) {
        for (const entry of cellEntries(entries, move.from.date, move.from.slot)) {
            updates.push({ entryId: entry.id, date: move.to.date, slot: move.to.slot });
        }
    }
    return updates;
}

/** Status markers of the freshness check; fresh and unknown dishes get none. */
export function freshnessMarkers(
    freshness: readonly DishFreshness[],
    entries: readonly PlanEntryLite[],
): Record<string, DishMarker[]> {
    const markers: Record<string, DishMarker[]> = {};
    for (const dish of freshness) {
        if (dish.status !== 'warning' && dish.status !== 'tight') continue;
        const main = cellEntries(entries, dish.date, dish.slot).find(
            (entry) => entry.recipeId === dish.recipeId,
        );
        if (!main) continue;
        const ingredient = dish.limitingIngredient?.name ?? 'Zutat';
        markers[main.id] = [
            {
                tone: 'warn',
                icon: 'clock',
                label:
                    dish.status === 'warning'
                        ? `${ingredient} evtl. nicht mehr frisch`
                        : `${ingredient}: letzter Tag`,
            },
        ];
    }
    return markers;
}

// ── Candidates ──────────────────────────────────────────────────────────────

/** FilterSet reduced to what the season/meal derivation needs. */
export interface TimeSeasonSet {
    timeSlot: string | null;
    season: string | null;
    tagIds: readonly string[];
    categoryIds: readonly string[];
}

const SEASONS: readonly Season[] = ['fruehling', 'sommer', 'herbst', 'winter'];

const MEAL_OF_TIME_SLOT: Record<string, MealSlotType> = {
    fruehstueck: 'BREAKFAST',
    brunch: 'BREAKFAST',
    mittag: 'LUNCH',
    nachmittag: 'SNACK',
    spaet: 'SNACK',
    abend: 'DINNER',
};

/**
 * Seasons and meal types of a recipe, derived from the TIME_SEASON FilterSets it matches
 * (it carries one of the set's tags or categories). Nothing matched = no restriction
 * (`undefined`), so recipes without tags are never excluded.
 */
export function seasonsAndSlots(
    recipe: { tagIds: readonly string[]; categoryIds: readonly string[] },
    sets: readonly TimeSeasonSet[],
): { seasons?: Season[]; slots?: MealSlotType[] } {
    const tags = new Set(recipe.tagIds);
    const categories = new Set(recipe.categoryIds);
    const seasons = new Set<Season>();
    const slots = new Set<MealSlotType>();
    for (const set of sets) {
        const matches =
            set.tagIds.some((id) => tags.has(id)) ||
            set.categoryIds.some((id) => categories.has(id));
        if (!matches) continue;
        if (set.season && (SEASONS as readonly string[]).includes(set.season))
            seasons.add(set.season as Season);
        const meal = set.timeSlot ? MEAL_OF_TIME_SLOT[set.timeSlot] : undefined;
        if (meal) slots.add(meal);
    }
    return {
        ...(seasons.size > 0 && seasons.size < SEASONS.length && { seasons: [...seasons] }),
        ...(slots.size > 0 && { slots: [...slots] }),
    };
}

/** Cosine similarity (-1..1) mapped to a 0..1 taste score; no profile or embedding = undefined. */
export function tasteScoreOf(cosine: number | null | undefined): number | undefined {
    if (cosine === null || cosine === undefined || !Number.isFinite(cosine)) return undefined;
    return Math.min(1, Math.max(0, (cosine + 1) / 2));
}

export interface CandidateRow {
    id: string;
    title: string;
    totalTime: number;
    servings: number;
    categoryId: string | null;
    categoryName?: string | null;
    tagIds: readonly string[];
    categoryIds: readonly string[];
    cosine?: number | null;
    /** Base amounts for the recipe's own servings */
    ingredients: readonly {
        ingredientId: string;
        name?: string;
        amount?: number;
        unit?: 'g' | 'ml' | 'Stk';
    }[];
}

/**
 * Candidate for the logic. Amounts are scaled from the recipe's servings to `servings`
 * (the household), because that is what actually gets cooked.
 */
export function toCandidate(
    row: CandidateRow,
    sets: readonly TimeSeasonSet[],
    servings: number,
): Candidate {
    const factor = row.servings > 0 ? servings / row.servings : 1;
    return {
        id: row.id,
        title: row.title,
        categoryId: row.categoryId ?? 'none',
        ...(row.categoryName && { categoryName: row.categoryName }),
        totalTime: row.totalTime,
        tasteScore: tasteScoreOf(row.cosine),
        ...seasonsAndSlots(row, sets),
        ingredients: row.ingredients.map((ingredient) => ({
            ingredientId: ingredient.ingredientId,
            ...(ingredient.name && { name: ingredient.name }),
            ...(ingredient.amount !== undefined &&
                ingredient.unit && {
                    amountBase: Math.round(ingredient.amount * factor * 1000) / 1000,
                    unitBase: ingredient.unit,
                }),
        })),
    };
}

/** Day and meal type where a leftover recipe is planned: first free dinner/lunch, else dinner. */
export function leftoverPlanSlot(
    date: IsoDate,
    enabledSlotKeys: readonly string[],
    entries: readonly Pick<PlanEntryLite, 'date' | 'slot' | 'status'>[],
): string {
    const taken = (slot: string) =>
        entries.some((e) => e.date === date && e.slot === slot && e.status !== 'CANCELLED');
    for (const slot of ['DINNER', 'LUNCH']) {
        if (enabledSlotKeys.includes(slot) && !taken(slot)) return slot;
    }
    return 'DINNER';
}

/**
 * Day the groceries of the plan are bought: the next shopping day on or after today
 * (`Profile.shoppingDay`, ISO 1-7), or today if none is set.
 */
export function purchaseDateFor(today: IsoDate, shoppingDay: number | null | undefined): IsoDate {
    if (!shoppingDay || !Number.isInteger(shoppingDay) || shoppingDay < 1 || shoppingDay > 7)
        return today;
    return addDays(today, (shoppingDay - isoWeekday(today) + 7) % 7);
}
