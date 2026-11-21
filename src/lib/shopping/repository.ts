// Shopping list data access (KUC-98 / KUC-104): one continuous list per user,
// each ingredient or free-text name exactly once, purchased/dormant entries come
// back to "open" when needed again. Every function checks ownership via userId
// and validates its input with Zod; pass `prisma` from '@shared/prisma' as `db`.
import type { Prisma, ShoppingItemStatus } from '@prisma/client';

import { type Db, inTransaction, notFound } from '@app/lib/meal-plan/db';
import { idSchema, userIdSchema } from '@app/lib/meal-plan/schemas';

import { itemKeyFor } from './item-key';
import {
    addToQuantity,
    EMPTY_QUANTITY,
    type ConversionContext,
    type StoredQuantity,
} from './quantity';
import {
    addItemsSchema,
    historyQuerySchema,
    setStatusSchema,
    snoozeSchema,
    updateItemSchema,
} from './schemas';

type Tx = Prisma.TransactionClient;

const itemInclude = {
    ingredient: {
        select: { id: true, name: true, slug: true, icon: true, packSize: true, packUnit: true },
    },
    sources: {
        orderBy: { createdAt: 'asc' },
        include: {
            recipe: { select: { id: true, title: true, slug: true, imageKey: true } },
            mealPlanEntry: {
                select: { id: true, date: true, mealType: true, customMealType: true },
            },
        },
    },
} satisfies Prisma.ShoppingItemInclude;

export async function getOrCreateShoppingList(db: Db, userId: string) {
    const owner = userIdSchema.parse(userId);
    return db.shoppingList.upsert({
        where: { userId: owner },
        create: { userId: owner },
        update: {},
        select: { id: true, userId: true },
    });
}

export async function listShoppingItems(db: Db, userId: string) {
    const owner = userIdSchema.parse(userId);
    return db.shoppingItem.findMany({
        where: { shoppingList: { userId: owner } },
        include: itemInclude,
        orderBy: [{ status: 'asc' }, { position: 'asc' }, { statusChangedAt: 'desc' }],
    });
}

async function findOwnedItem(db: Db, userId: string, itemId: string) {
    const item = await db.shoppingItem.findFirst({
        where: { id: idSchema.parse(itemId), shoppingList: { userId } },
    });
    if (!item) throw notFound('Artikel');
    return item;
}

/** IngredientUnit.grams per ingredient plus Unit.gramsDefault, keyed by unit shortName. */
async function loadConversion(db: Db, ingredientIds: string[]) {
    const [units, ingredientUnits] = await Promise.all([
        db.unit.findMany({ select: { shortName: true, gramsDefault: true } }),
        ingredientIds.length
            ? db.ingredientUnit.findMany({
                  where: { ingredientId: { in: ingredientIds } },
                  select: {
                      ingredientId: true,
                      grams: true,
                      unit: { select: { shortName: true } },
                  },
              })
            : Promise.resolve([]),
    ]);
    const unitDefaults = Object.fromEntries(units.map((u) => [u.shortName, u.gramsDefault]));
    return (ingredientId: string | null | undefined): ConversionContext => ({
        unitDefaults,
        ingredientGrams: Object.fromEntries(
            ingredientUnits
                .filter((row) => row.ingredientId === ingredientId)
                .map((row) => [row.unit.shortName, row.grams]),
        ),
    });
}

/**
 * Adds items (from a recipe, the plan, suggestions or by hand). An existing entry
 * for the same ingredient/name is reused: its amount grows, it moves back to
 * OPEN, and the source is recorded once per plan entry. Every add is written to
 * the history (event ADDED).
 */
export async function addShoppingItems(db: Db, userId: string, input: unknown) {
    const owner = userIdSchema.parse(userId);
    const items = addItemsSchema.parse(input);

    return inTransaction(db, async (tx: Tx) => {
        const list = await getOrCreateShoppingList(tx, owner);

        // Ownership of referenced plan entries, visibility of recipes and ingredients
        const entryIds = [
            ...new Set(items.flatMap((i) => (i.mealPlanRecipeId ? [i.mealPlanRecipeId] : []))),
        ];
        const ownEntries = entryIds.length
            ? await tx.mealPlanRecipe.findMany({
                  where: { id: { in: entryIds }, userId: owner },
                  select: { id: true, recipeId: true, servings: true },
              })
            : [];
        if (ownEntries.length !== entryIds.length) throw notFound('Eintrag');
        const recipeIds = [
            ...new Set([
                ...items.flatMap((i) => (i.recipeId ? [i.recipeId] : [])),
                ...ownEntries.map((e) => e.recipeId),
            ]),
        ];
        if (recipeIds.length) {
            const visible = await tx.recipe.count({
                where: {
                    id: { in: recipeIds },
                    OR: [{ status: 'PUBLISHED' }, { authorId: owner }],
                },
            });
            if (visible !== recipeIds.length) throw notFound('Rezept');
        }
        const ingredientIds = [
            ...new Set(items.flatMap((i) => (i.ingredientId ? [i.ingredientId] : []))),
        ];
        if (ingredientIds.length) {
            const found = await tx.ingredient.count({ where: { id: { in: ingredientIds } } });
            if (found !== ingredientIds.length) throw notFound('Zutat');
        }
        const conversion = await loadConversion(tx, ingredientIds);
        const now = new Date();
        const touched = new Map<string, string>();
        // "itemKey|plan entry" pairs written by this call: a second line of the same
        // ingredient in one recipe adds its amount to the existing source
        const sourcesInCall = new Map<string, string>();

        for (const input of items) {
            const entry = ownEntries.find((e) => e.id === input.mealPlanRecipeId);
            const recipeId = input.recipeId ?? entry?.recipeId ?? null;
            const itemKey = itemKeyFor(input);
            const context = conversion(input.ingredientId);
            let item = await tx.shoppingItem.findUnique({
                where: { shoppingListId_itemKey: { shoppingListId: list.id, itemKey } },
            });

            // A bought/dormant entry starts a new round with a fresh amount and sources
            const reopened = !!item && item.status !== 'OPEN';
            // The same plan entry never adds its amount twice
            const callKey = `${itemKey}|${input.mealPlanRecipeId ?? ''}`;
            const sameCallSourceId = input.mealPlanRecipeId
                ? sourcesInCall.get(callKey)
                : undefined;
            const duplicateSource =
                item && !reopened && input.mealPlanRecipeId && !sameCallSourceId
                    ? await tx.shoppingItemSource.findFirst({
                          where: {
                              shoppingItemId: item.id,
                              mealPlanRecipeId: input.mealPlanRecipeId,
                          },
                          select: { id: true },
                      })
                    : null;
            const before: StoredQuantity = item && !reopened ? item : EMPTY_QUANTITY;
            const after =
                duplicateSource || (!input.amount && !input.unit)
                    ? { ...before }
                    : addToQuantity(before, input.amount, input.unit, context);
            const quantity = {
                quantity: after.quantity,
                baseUnit: after.baseUnit,
                displayUnit: after.displayUnit,
                quantityText: after.quantityText,
            };

            if (!item) {
                item = await tx.shoppingItem.create({
                    data: {
                        shoppingListId: list.id,
                        ingredientId: input.ingredientId ?? null,
                        itemKey,
                        name: input.name,
                        status: 'OPEN',
                        statusChangedAt: now,
                        ...quantity,
                    },
                });
            } else {
                if (reopened)
                    await tx.shoppingItemSource.deleteMany({ where: { shoppingItemId: item.id } });
                item = await tx.shoppingItem.update({
                    where: { id: item.id },
                    data: {
                        ...quantity,
                        status: 'OPEN',
                        ...(reopened && { statusChangedAt: now }),
                    },
                });
            }

            if (sameCallSourceId) {
                // Same plan entry, same ingredient, another line: grow the source's share
                const source = await tx.shoppingItemSource.findUnique({
                    where: { id: sameCallSourceId },
                });
                if (source) {
                    const grown = addToQuantity(
                        {
                            quantity: source.quantity,
                            baseUnit: source.baseUnit,
                            displayUnit: null,
                            quantityText: null,
                        },
                        input.amount,
                        input.unit,
                        context,
                    );
                    await tx.shoppingItemSource.update({
                        where: { id: source.id },
                        data: { quantity: grown.quantity, baseUnit: grown.baseUnit },
                    });
                }
            } else if (!duplicateSource) {
                const converted = addToQuantity(EMPTY_QUANTITY, input.amount, input.unit, context);
                const source = await tx.shoppingItemSource.create({
                    data: {
                        shoppingItemId: item.id,
                        kind: input.mealPlanRecipeId ? 'MEAL_PLAN' : input.kind,
                        recipeId,
                        mealPlanRecipeId: input.mealPlanRecipeId ?? null,
                        originalAmount: input.amount ?? null,
                        originalUnit: input.unit ?? null,
                        quantity: converted.quantity,
                        baseUnit: converted.baseUnit,
                        servings: input.servings ?? entry?.servings ?? null,
                    },
                });
                if (input.mealPlanRecipeId) sourcesInCall.set(callKey, source.id);
                await tx.shoppingHistory.create({
                    data: {
                        userId: owner,
                        ingredientId: input.ingredientId ?? null,
                        itemKey,
                        name: input.name,
                        event: 'ADDED',
                        occurredAt: now,
                        quantity: converted.quantity,
                        baseUnit: converted.baseUnit,
                        quantityText: converted.quantityText,
                        recipeId,
                        shoppingItemId: item.id,
                    },
                });
            }
            touched.set(itemKey, item.id);
        }

        return tx.shoppingItem.findMany({
            where: { id: { in: [...touched.values()] } },
            include: itemInclude,
        });
    });
}

export async function updateShoppingItem(db: Db, userId: string, itemId: string, input: unknown) {
    const owner = userIdSchema.parse(userId);
    const data = updateItemSchema.parse(input);
    const item = await findOwnedItem(db, owner, itemId);
    return db.shoppingItem.update({ where: { id: item.id }, data, include: itemInclude });
}

/**
 * Changes the status. PURCHASED writes a history row with time and bought amount
 * (default: the item's current amount); KUC-107 turns it into a pantry item.
 */
export async function setShoppingItemStatus(
    db: Db,
    userId: string,
    itemId: string,
    input: unknown,
) {
    const owner = userIdSchema.parse(userId);
    const data = setStatusSchema.parse(input);
    return inTransaction(db, async (tx: Tx) => {
        const item = await findOwnedItem(tx, owner, itemId);
        const at = data.at ?? new Date();
        const updated = await tx.shoppingItem.update({
            where: { id: item.id },
            data: {
                status: data.status as ShoppingItemStatus,
                ...(item.status !== data.status && { statusChangedAt: at }),
            },
            include: itemInclude,
        });
        let history = null;
        if (data.status === 'PURCHASED' && item.status !== 'PURCHASED') {
            const bought = data.purchased ?? {
                quantity: item.quantity,
                baseUnit: item.baseUnit,
                quantityText: item.quantityText,
            };
            history = await tx.shoppingHistory.create({
                data: {
                    userId: owner,
                    ingredientId: item.ingredientId,
                    itemKey: item.itemKey,
                    name: item.name,
                    event: 'PURCHASED',
                    origin: data.origin,
                    occurredAt: at,
                    quantity: bought.quantity,
                    baseUnit: bought.quantity === null ? null : bought.baseUnit,
                    quantityText: bought.quantityText,
                    shoppingItemId: item.id,
                },
            });
        }
        return { item: updated, history };
    });
}

/** Removes the entry for good; the history stays. */
export async function deleteShoppingItem(db: Db, userId: string, itemId: string) {
    const owner = userIdSchema.parse(userId);
    const item = await findOwnedItem(db, owner, itemId);
    await db.shoppingItem.delete({ where: { id: item.id } });
    return { id: item.id };
}

export async function listShoppingHistory(db: Db, userId: string, query: unknown = {}) {
    const owner = userIdSchema.parse(userId);
    const { itemKey, event, since, limit } = historyQuerySchema.parse(query);
    return db.shoppingHistory.findMany({
        where: {
            userId: owner,
            ...(itemKey && { itemKey }),
            ...(event && { event }),
            ...(since && { occurredAt: { gte: since } }),
        },
        orderBy: { occurredAt: 'desc' },
        take: limit,
    });
}

/** "Nicht jetzt" for a rhythm suggestion (KUC-124); repeated snoozes count up. */
export async function snoozeShoppingSuggestion(db: Db, userId: string, input: unknown) {
    const owner = userIdSchema.parse(userId);
    const { itemKey, until } = snoozeSchema.parse(input);
    return db.shoppingSuggestionSnooze.upsert({
        where: { userId_itemKey: { userId: owner, itemKey } },
        create: { userId: owner, itemKey, snoozedUntil: until },
        update: { snoozedUntil: until, dismissCount: { increment: 1 } },
    });
}

export async function listShoppingSuggestionSnoozes(db: Db, userId: string) {
    const owner = userIdSchema.parse(userId);
    return db.shoppingSuggestionSnooze.findMany({ where: { userId: owner } });
}
