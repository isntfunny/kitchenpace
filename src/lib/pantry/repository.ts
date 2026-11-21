// Pantry data access (KUC-98 / KUC-107). Every function checks ownership via
// userId and validates its input with Zod; pass `prisma` from '@shared/prisma'.
import { z } from 'zod';

import { type Db, notFound } from '@app/lib/meal-plan/db';
import { idSchema, userIdSchema } from '@app/lib/meal-plan/schemas';
import { BASE_UNITS } from '@app/lib/shopping/schemas';

const STATUSES = ['AVAILABLE', 'USED_UP', 'DISCARDED'] as const;
const quantitySchema = z.number().finite().min(0).max(1_000_000);

const quantityFields = {
    quantity: quantitySchema.nullable(),
    baseUnit: z.enum(BASE_UNITS).nullable(),
    quantityText: z.string().trim().max(200).nullable(),
    approximate: z.boolean(),
};
const quantityPairs = (data: { quantity?: number | null; baseUnit?: string | null }) =>
    (data.quantity === undefined && data.baseUnit === undefined) ||
    (data.quantity !== undefined &&
        data.baseUnit !== undefined &&
        (data.quantity === null) === (data.baseUnit === null));

export const addPantryItemSchema = z
    .object({
        ingredientId: idSchema.nullish(),
        name: z.string().trim().min(1).max(200),
        ...quantityFields,
        source: z.enum(['PURCHASE', 'BRING', 'COOKING', 'MANUAL']).default('MANUAL'),
        purchasedAt: z.date().nullish(),
        openedAt: z.date().nullish(),
        expiresAt: z.date().nullish(),
        shoppingHistoryId: idSchema.nullish(),
    })
    .partial({ quantity: true, baseUnit: true, quantityText: true, approximate: true })
    .strict()
    .refine(quantityPairs, { message: 'Menge und Einheit gehören zusammen', path: ['baseUnit'] });

export const updatePantryItemSchema = z
    .object({
        ...quantityFields,
        openedAt: z.date().nullable(),
        expiresAt: z.date().nullable(),
        mealPlanRecipeId: idSchema.nullable(),
    })
    .partial()
    .strict()
    .refine(quantityPairs, { message: 'Menge und Einheit gehören zusammen', path: ['baseUnit'] });

const listSchema = z.object({ status: z.enum(STATUSES).optional() }).strict();

const pantryInclude = {
    ingredient: {
        select: {
            id: true,
            name: true,
            icon: true,
            openSensitive: true,
            openedShelfLifeDays: true,
            packSize: true,
            packUnit: true,
        },
    },
} as const;

async function findOwned(db: Db, userId: string, id: string) {
    const item = await db.pantryItem.findFirst({ where: { id: idSchema.parse(id), userId } });
    if (!item) throw notFound('Vorratsposten');
    return item;
}

export async function listPantryItems(db: Db, userId: string, query: unknown = {}) {
    const owner = userIdSchema.parse(userId);
    const { status } = listSchema.parse(query);
    return db.pantryItem.findMany({
        where: { userId: owner, ...(status && { status }) },
        include: pantryInclude,
        orderBy: [{ expiresAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
    });
}

export async function addPantryItem(db: Db, userId: string, input: unknown) {
    const owner = userIdSchema.parse(userId);
    const data = addPantryItemSchema.parse(input);
    if (data.shoppingHistoryId) {
        const history = await db.shoppingHistory.findFirst({
            where: { id: data.shoppingHistoryId, userId: owner },
            select: { id: true },
        });
        if (!history) throw notFound('Kaufeintrag');
    }
    if (data.ingredientId) {
        const ingredient = await db.ingredient.findUnique({
            where: { id: data.ingredientId },
            select: { id: true },
        });
        if (!ingredient) throw notFound('Zutat');
    }
    return db.pantryItem.create({
        data: {
            userId: owner,
            ingredientId: data.ingredientId ?? null,
            name: data.name,
            quantity: data.quantity ?? null,
            baseUnit: data.baseUnit ?? null,
            quantityText: data.quantityText ?? null,
            approximate: data.approximate ?? false,
            source: data.source,
            purchasedAt: data.purchasedAt ?? null,
            openedAt: data.openedAt ?? null,
            expiresAt: data.expiresAt ?? null,
            shoppingHistoryId: data.shoppingHistoryId ?? null,
        },
        include: pantryInclude,
    });
}

export async function updatePantryItem(db: Db, userId: string, id: string, input: unknown) {
    const owner = userIdSchema.parse(userId);
    const data = updatePantryItemSchema.parse(input);
    const item = await findOwned(db, owner, id);
    if (data.mealPlanRecipeId) {
        const entry = await db.mealPlanRecipe.findFirst({
            where: { id: data.mealPlanRecipeId, userId: owner },
            select: { id: true },
        });
        if (!entry) throw notFound('Eintrag');
    }
    return db.pantryItem.update({ where: { id: item.id }, data, include: pantryInclude });
}

/** "aufgebraucht" / "weggeworfen" in one tap, or back to available. */
export async function setPantryItemStatus(db: Db, userId: string, id: string, status: unknown) {
    const owner = userIdSchema.parse(userId);
    const next = z.enum(STATUSES).parse(status);
    const item = await findOwned(db, owner, id);
    return db.pantryItem.update({
        where: { id: item.id },
        data: { status: next, ...(item.status !== next && { statusChangedAt: new Date() }) },
        include: pantryInclude,
    });
}

/** Declines the leftover suggestion for this item for good (KUC-108). */
export async function dismissLeftoverHint(db: Db, userId: string, id: string) {
    const owner = userIdSchema.parse(userId);
    const item = await findOwned(db, owner, id);
    return db.pantryItem.update({
        where: { id: item.id },
        data: { leftoverHintDismissedAt: new Date() },
    });
}
