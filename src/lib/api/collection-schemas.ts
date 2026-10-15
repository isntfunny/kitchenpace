import { z } from '@hono/zod-openapi';

import { collectionSchema, idSchema } from './schemas';

const recipeIds = z
    .array(idSchema)
    .max(50)
    .refine((ids) => new Set(ids).size === ids.length);
const fields = {
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(10000).nullable(),
    recipeIds,
};
export const collectionCreateInput = z
    .object({
        title: fields.title,
        description: fields.description.optional(),
        recipeIds: fields.recipeIds.optional(),
    })
    .strict()
    .openapi('CollectionCreateInput');
export const collectionUpdateInput = z
    .object(fields)
    .partial()
    .strict()
    .refine((value) => Object.keys(value).length > 0, 'Provide at least one field')
    .openapi('CollectionUpdateInput');
export const collectionDetailSchema = collectionSchema
    .extend({ recipeIds: z.array(z.string()) })
    .openapi('CollectionDetail');
export type CollectionCreateInput = z.infer<typeof collectionCreateInput>;
export type CollectionUpdateInput = z.infer<typeof collectionUpdateInput>;
