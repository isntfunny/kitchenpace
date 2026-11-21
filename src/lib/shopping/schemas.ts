// Zod schemas for shopping list input (KUC-98 / KUC-104).
import { z } from 'zod';

import { idSchema } from '@app/lib/meal-plan/schemas';

export const BASE_UNITS = ['G', 'ML', 'PIECE'] as const;
export const ITEM_STATUSES = ['OPEN', 'PURCHASED', 'DORMANT'] as const;
export const SOURCE_KINDS = ['RECIPE', 'MEAL_PLAN', 'MANUAL', 'SUGGESTION', 'BRING'] as const;

export const itemKeySchema = z.string().regex(/^[it]:.{1,218}$/);
const quantitySchema = z.number().finite().min(0).max(1_000_000);

export const addItemSchema = z
    .object({
        ingredientId: idSchema.nullish(),
        name: z.string().trim().min(1).max(200),
        /** Original statement, e.g. "1/2" and "EL"; converted via IngredientUnit */
        amount: z.string().trim().max(50).nullish(),
        unit: z.string().trim().max(20).nullish(),
        kind: z.enum(SOURCE_KINDS).default('MANUAL'),
        recipeId: idSchema.nullish(),
        mealPlanRecipeId: idSchema.nullish(),
        servings: z.number().int().min(1).max(100).nullish(),
    })
    .strict();
export type AddItemInput = z.input<typeof addItemSchema>;

export const addItemsSchema = z.array(addItemSchema).min(1).max(200);

export const updateItemSchema = z
    .object({
        quantity: quantitySchema.nullable(),
        baseUnit: z.enum(BASE_UNITS).nullable(),
        displayUnit: z.string().trim().max(20).nullable(),
        quantityText: z.string().trim().max(200).nullable(),
        note: z.string().trim().max(500).nullable(),
        position: z.number().int().min(0).max(100_000),
    })
    .partial()
    .strict()
    .refine(
        (data) =>
            (data.quantity === undefined && data.baseUnit === undefined) ||
            (data.quantity !== undefined &&
                data.baseUnit !== undefined &&
                (data.quantity === null) === (data.baseUnit === null)),
        { message: 'Menge und Einheit gehören zusammen', path: ['baseUnit'] },
    );

export const setStatusSchema = z
    .object({
        status: z.enum(ITEM_STATUSES),
        /** Bought amount for the history; default = current amount of the item */
        purchased: z
            .object({
                quantity: quantitySchema.nullable(),
                baseUnit: z.enum(BASE_UNITS).nullable(),
                quantityText: z.string().trim().max(200).nullable(),
            })
            .optional(),
        origin: z.enum(['KOCHTAKT', 'BRING']).default('KOCHTAKT'),
        at: z.date().optional(),
    })
    .strict();

export const historyQuerySchema = z
    .object({
        itemKey: itemKeySchema.optional(),
        event: z.enum(['ADDED', 'PURCHASED']).optional(),
        since: z.date().optional(),
        limit: z.number().int().min(1).max(500).default(100),
    })
    .strict();

export const snoozeSchema = z.object({ itemKey: itemKeySchema, until: z.date() }).strict();
