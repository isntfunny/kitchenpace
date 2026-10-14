import { z } from '@hono/zod-openapi';

import { idSchema } from './schemas';

export const bringParams = z.object({ id: z.string().min(1).max(200) });
export const bringListsSchema = z
    .object({
        lists: z.array(z.object({ listUuid: z.string(), name: z.string() })),
        defaultListUuid: z.string().nullable(),
    })
    .openapi('BringLists');
const bringItem = z.object({
    name: z.string(),
    displayName: z.string().optional(),
    specification: z.string(),
});
export const bringListSchema = z
    .object({ purchase: z.array(bringItem), recently: z.array(bringItem) })
    .openapi('BringListContents');
export const bringRecipeInput = z
    .object({
        recipeId: idSchema,
        servings: z.number().int().min(1).max(100).optional(),
        ingredientIds: z
            .array(idSchema)
            .min(1)
            .max(50)
            .refine((ids) => new Set(ids).size === ids.length)
            .optional(),
    })
    .strict()
    .openapi('BringRecipeInput');
export type BringRecipeInput = z.infer<typeof bringRecipeInput>;
export const bringTransferSchema = z
    .object({
        items: z.array(
            z.object({
                id: z.string(),
                name: z.string(),
                status: z.enum(['added', 'existing', 'failed']),
            }),
        ),
    })
    .openapi('BringRecipeTransfer');
