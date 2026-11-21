// Data of the shopping list page (KUC-105): Prisma rows → serializable views.
import type { Db } from '@app/lib/meal-plan/db';
import { getMealPlanSettings, getMealPlanWeek } from '@app/lib/meal-plan/repository';
import { formatIsoDate, todayIn, weekStartFor } from '@app/lib/meal-plan/week';
import type { IngredientIconName } from '@shared/ingredient-icons/names';
import { resolveFreeTextIcon, resolveIngredientIcon } from '@shared/ingredient-icons/resolve';

import type { ShoppingItemView, SourceView } from './list-view';
import {
    computePlanStatus,
    type PlanEntryInput,
    type PlanLineInput,
    type PlanStatus,
} from './plan-status';
import { loadRecipeLines } from './recipe-lines';
import { listShoppingItems } from './repository';
import { loadSuggestions } from './suggestions-source';
import type { RhythmSuggestionView } from './suggestions-source';

type ItemRow = Awaited<ReturnType<typeof listShoppingItems>>[number];

const parentSelect = { select: { slug: true, icon: true } } as const;

/** Icon per ingredient: own icon → category → parent category → neutral. */
async function loadIngredientIcons(db: Db, ingredientIds: string[]) {
    const icons = new Map<string, IngredientIconName>();
    if (ingredientIds.length === 0) return icons;
    const rows = await db.ingredient.findMany({
        where: { id: { in: ingredientIds } },
        select: {
            id: true,
            icon: true,
            categories: {
                select: {
                    slug: true,
                    icon: true,
                    parent: { select: { slug: true, icon: true, parent: parentSelect } },
                },
            },
        },
    });
    for (const row of rows) icons.set(row.id, resolveIngredientIcon(row));
    return icons;
}

function sourceView(source: ItemRow['sources'][number]): SourceView {
    return {
        id: source.id,
        kind: source.kind,
        recipeId: source.recipeId,
        recipeTitle: source.recipe?.title ?? null,
        date: source.mealPlanEntry ? formatIsoDate(source.mealPlanEntry.date) : null,
        quantity: source.quantity,
        baseUnit: source.baseUnit,
        originalAmount: source.originalAmount,
        originalUnit: source.originalUnit,
        servings: source.servings,
    };
}

export async function loadShoppingItems(db: Db, userId: string): Promise<ShoppingItemView[]> {
    const rows = await listShoppingItems(db, userId);
    const icons = await loadIngredientIcons(
        db,
        rows.flatMap((row) => (row.ingredientId ? [row.ingredientId] : [])),
    );
    return rows.map((row) => ({
        id: row.id,
        itemKey: row.itemKey,
        name: row.name,
        status: row.status,
        icon: (row.ingredientId && icons.get(row.ingredientId)) || resolveFreeTextIcon(row.name),
        quantity: row.quantity,
        baseUnit: row.baseUnit,
        displayUnit: row.displayUnit,
        quantityText: row.quantityText,
        note: row.note,
        position: row.position,
        statusChangedAt: row.statusChangedAt.toISOString(),
        pack:
            row.ingredient?.packSize && row.ingredient.packUnit
                ? { size: row.ingredient.packSize, unit: row.ingredient.packUnit }
                : null,
        sources: row.sources.map(sourceView),
    }));
}

/**
 * The current plan week and what each dish still needs on the list. `weekStart`
 * (yyyy-mm-dd, any day) selects another week.
 */
export async function loadShoppingPlanStatus(
    db: Db,
    userId: string,
    now: Date = new Date(),
    weekStart?: string,
): Promise<PlanStatus & { startDate: string }> {
    const settings = await getMealPlanSettings(db, userId);
    const today = todayIn(settings.timezone, now);
    const start = weekStartFor(weekStart ?? today, settings.weekStartDay);
    const week = await getMealPlanWeek(db, userId, start);

    const recipeIds = [...new Set(week.entries.map((entry) => entry.recipeId))];
    const recipes = await loadRecipeLines(db, userId, recipeIds, { lenient: true });
    const linesByRecipe = new Map<string, PlanLineInput[]>(
        [...recipes].map(([id, recipe]) => [
            id,
            recipe.lines.map((line) => ({
                ingredientId: line.ingredientId,
                name: line.name,
                isOptional: line.isOptional,
            })),
        ]),
    );

    const sources = week.entries.length
        ? await db.shoppingItemSource.findMany({
              where: {
                  mealPlanRecipeId: { in: week.entries.map((entry) => entry.id) },
                  shoppingItem: { shoppingList: { userId } },
              },
              select: { mealPlanRecipeId: true, shoppingItem: { select: { ingredientId: true } } },
          })
        : [];
    const covered = new Map<string, Set<string>>();
    for (const source of sources) {
        const ingredientId = source.shoppingItem.ingredientId;
        if (!source.mealPlanRecipeId || !ingredientId) continue;
        if (!covered.has(source.mealPlanRecipeId)) covered.set(source.mealPlanRecipeId, new Set());
        covered.get(source.mealPlanRecipeId)!.add(ingredientId);
    }

    const entries: PlanEntryInput[] = week.entries.map((entry) => ({
        id: entry.id,
        date: formatIsoDate(entry.date),
        recipeId: entry.recipeId,
        title: entry.recipe.title,
        imageKey: entry.recipe.imageKey ?? null,
        servings: entry.servings,
        status: entry.status,
        recipeAvailable: entry.recipeAvailable,
    }));
    return { ...computePlanStatus(entries, linesByRecipe, covered, today), startDate: start };
}

export interface SuggestionTileView extends Omit<RhythmSuggestionView, 'lastPurchasedAt'> {
    icon: IngredientIconName;
    lastPurchasedAt: string | null;
}

export interface ShoppingPageData {
    items: ShoppingItemView[];
    suggestions: SuggestionTileView[];
    plan: Awaited<ReturnType<typeof loadShoppingPlanStatus>>;
    shoppingDay: number | null;
}

export async function loadShoppingPageData(
    db: Db,
    userId: string,
    now: Date = new Date(),
): Promise<ShoppingPageData> {
    const [items, suggestions, plan, settings] = await Promise.all([
        loadShoppingItems(db, userId),
        loadSuggestions(db, userId, now),
        loadShoppingPlanStatus(db, userId, now),
        getMealPlanSettings(db, userId),
    ]);
    // Suggestions that are already on the list make no sense
    const onList = new Set(items.filter((item) => item.status === 'OPEN').map((i) => i.itemKey));
    const visible = suggestions.filter((s) => !onList.has(s.itemKey));
    const icons = await loadIngredientIcons(
        db,
        visible.flatMap((s) => (s.ingredientId ? [s.ingredientId] : [])),
    );
    return {
        items,
        suggestions: visible.map((s) => ({
            ...s,
            icon: (s.ingredientId && icons.get(s.ingredientId)) || resolveFreeTextIcon(s.name),
            lastPurchasedAt: s.lastPurchasedAt ? new Date(s.lastPurchasedAt).toISOString() : null,
        })),
        plan,
        shoppingDay: settings.shoppingDay,
    };
}
