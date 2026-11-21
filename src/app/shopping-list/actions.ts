'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { searchIngredients } from '@app/components/recipe/actions';
import { getServerAuthSession } from '@app/lib/auth';
import { DataAccessError } from '@app/lib/meal-plan/db';
import { checkRateLimit } from '@app/lib/rate-limit';
import { loadShoppingPageData } from '@app/lib/shopping/page-data';
import { loadRecipeLines } from '@app/lib/shopping/recipe-lines';
import { addMealPlanEntriesToList, addRecipeToList } from '@app/lib/shopping/recipe-to-list';
import {
    addShoppingItems,
    deleteShoppingItem,
    listShoppingItems,
    setShoppingItemStatus,
    updateShoppingItem,
} from '@app/lib/shopping/repository';
import { snoozeSuggestion } from '@app/lib/shopping/suggestions-source';
import { prisma } from '@shared/prisma';

// Server actions of the own shopping list (KUC-104). The list page and its
// dialogs come with KUC-105; these actions are the whole write side.

export type ShoppingActionResult<T> =
    | { ok: true; data: T }
    | {
          ok: false;
          code: 'SIGN_IN' | 'RATE_LIMIT' | 'NOT_FOUND' | 'VALIDATION' | 'FAILED';
          error: string;
      };

async function run<T>(work: (userId: string) => Promise<T>): Promise<ShoppingActionResult<T>> {
    try {
        const session = await getServerAuthSession('shopping-list');
        if (!session?.user?.id || session.user.role === 'banned' || session.user.banned)
            return { ok: false, code: 'SIGN_IN', error: 'Bitte melde dich an.' };
        const limit = await checkRateLimit('shopping', session.user.id);
        if (!limit.allowed)
            return {
                ok: false,
                code: 'RATE_LIMIT',
                error: 'Zu viele Anfragen. Bitte warte einen Moment.',
            };
        const data = await work(session.user.id);
        revalidatePath('/shopping-list');
        return { ok: true, data };
    } catch (error) {
        if (error instanceof DataAccessError)
            return {
                ok: false,
                code: error.code === 'NOT_FOUND' ? 'NOT_FOUND' : 'FAILED',
                error: error.message,
            };
        if (error instanceof z.ZodError)
            return { ok: false, code: 'VALIDATION', error: 'Bitte prüfe deine Eingaben.' };
        console.error('[ShoppingList] action failed', error);
        return {
            ok: false,
            code: 'FAILED',
            error: 'Die Aktion konnte nicht abgeschlossen werden. Bitte versuche es erneut.',
        };
    }
}

const idSchema = z.string().trim().min(1).max(64);
const selectionSchema = z
    .object({
        lineIds: z.array(idSchema).max(200).optional(),
        includeOptional: z.boolean().optional(),
    })
    .strict();

export async function getShoppingList() {
    return run((userId) => listShoppingItems(prisma, userId));
}

/** Everything the list page shows: items, suggestions and the plan column. */
export async function getShoppingPageData() {
    return run((userId) => loadShoppingPageData(prisma, userId));
}

/** Ingredient lines of a recipe for the selection dialog (amounts for the recipe's own servings). */
export async function getRecipeShoppingLines(recipeId: string) {
    return run(async (userId) => {
        const id = idSchema.parse(recipeId);
        const recipe = (await loadRecipeLines(prisma, userId, [id])).get(id);
        return recipe ? { servings: recipe.servings, lines: recipe.lines } : null;
    });
}

/** Autocomplete for the quick add: catalogue ingredients, plus the parsed amount ("500 g Mehl"). */
export async function searchShoppingIngredients(query: string) {
    return run(async () => {
        const trimmed = z.string().trim().max(100).parse(query);
        if (trimmed.length < 2) return { results: [], amount: null, unit: null };
        const found = await searchIngredients(trimmed);
        return {
            results: found.results
                .slice(0, 6)
                .map((hit) => ({ id: hit.id, name: hit.name, pluralName: hit.pluralName })),
            amount: found.parsed.amount || null,
            unit: found.parsed.unit ?? null,
        };
    });
}

/** "Nicht jetzt" on a suggestion tile. */
export async function snoozeShoppingSuggestionTile(itemKey: string) {
    return run((userId) =>
        snoozeSuggestion(prisma, userId, z.string().min(3).max(220).parse(itemKey), new Date()),
    );
}

/** "Auf die Einkaufsliste" on the recipe page, scaled to the chosen servings. */
export async function addRecipeToShoppingList(
    recipeId: string,
    servings: number,
    selection: z.input<typeof selectionSchema> = {},
) {
    return run((userId) =>
        addRecipeToList(prisma, userId, recipeId, servings, selectionSchema.parse(selection)),
    );
}

/** "Einkaufen" in the meal plan: the planned entries with their servings. */
export async function addMealPlanEntriesToShoppingList(
    entryIds: string[],
    selection: z.input<typeof selectionSchema> = {},
) {
    return run((userId) =>
        addMealPlanEntriesToList(prisma, userId, entryIds, selectionSchema.parse(selection)),
    );
}

/** Manual entry: an ingredient from the catalogue or free text (household items). */
export async function addManualShoppingItem(input: {
    name: string;
    ingredientId?: string | null;
    amount?: string | null;
    unit?: string | null;
    /** SUGGESTION when it comes from a suggestion tile */
    kind?: 'MANUAL' | 'SUGGESTION';
}) {
    return run((userId) =>
        addShoppingItems(prisma, userId, [
            {
                name: input.name,
                ingredientId: input.ingredientId,
                amount: input.amount,
                unit: input.unit,
                kind: input.kind === 'SUGGESTION' ? 'SUGGESTION' : 'MANUAL',
            },
        ]),
    );
}

/** Checking off writes time and bought amount to the history; unchecking reopens. */
export async function setShoppingItemChecked(
    itemId: string,
    checked: boolean,
    purchased?: {
        quantity: number | null;
        baseUnit: 'G' | 'ML' | 'PIECE' | null;
        quantityText: string | null;
    },
) {
    return run((userId) =>
        setShoppingItemStatus(prisma, userId, itemId, {
            status: checked ? 'PURCHASED' : 'OPEN',
            ...(checked && purchased ? { purchased } : {}),
        }),
    );
}

/** Inline edit of amount, note or position. */
export async function updateShoppingListItem(itemId: string, changes: Record<string, unknown>) {
    return run((userId) => updateShoppingItem(prisma, userId, itemId, changes));
}

export async function deleteShoppingListItem(itemId: string) {
    return run((userId) => deleteShoppingItem(prisma, userId, itemId));
}
