import { z } from '@hono/zod-openapi';

export const idSchema = z.string().min(1).max(128);
export const pageQuery = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    cursor: idSchema.optional(),
});
export type PageQuery = z.infer<typeof pageQuery>;
export const recipeSummary = z
    .object({
        id: z.string(),
        title: z.string(),
        slug: z.string(),
        description: z.string().nullable(),
        servings: z.number(),
        prepTime: z.number(),
        cookTime: z.number(),
        totalTime: z.number(),
        difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
        status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
        updatedAt: z.string(),
    })
    .openapi('RecipeSummary');
export const recipeDetail = recipeSummary
    .extend({
        sourceUrl: z.string().nullable(),
        caloriesPerServing: z.number().nullable(),
        proteinPerServing: z.number().nullable(),
        fatPerServing: z.number().nullable(),
        carbsPerServing: z.number().nullable(),
        fiberPerServing: z.number().nullable(),
        nutritionCompleteness: z.number().nullable(),
        ingredients: z.array(
            z.object({
                id: z.string(),
                name: z.string(),
                amount: z.string(),
                unit: z.string(),
                notes: z.string().nullable(),
                isOptional: z.boolean(),
            }),
        ),
        steps: z.array(
            z.object({
                id: z.string(),
                type: z.string().optional(),
                label: z.string().optional(),
                description: z.string().optional(),
                duration: z.number().optional(),
                ingredientIds: z.array(z.string()).optional(),
            }),
        ),
        dependencies: z.array(z.object({ source: z.string(), target: z.string() })),
        tags: z.array(z.string()),
        categories: z.array(z.string()),
    })
    .openapi('Recipe');
export const collectionSchema = z
    .object({
        id: z.string(),
        title: z.string(),
        slug: z.string(),
        description: z.string().nullable(),
        published: z.boolean(),
    })
    .openapi('Collection');
export const cookSchema = z
    .object({
        id: z.string(),
        recipeId: z.string(),
        cookedAt: z.string(),
        servings: z.number().nullable(),
    })
    .openapi('Cook');
export const cookInput = z
    .object({ recipeId: idSchema, servings: z.number().int().min(1).max(100).optional() })
    .strict();
export const importInput = z
    .object({
        text: z.string().trim().min(20).max(50_000).optional(),
        url: z.string().url().max(2048).optional(),
    })
    .strict()
    .refine((v) => Boolean(v.text) !== Boolean(v.url), 'Provide exactly one of text or url');
export type ImportInput = z.infer<typeof importInput>;
export const importSchema = z
    .object({
        id: z.string(),
        status: z.enum(['queued', 'processing', 'completed', 'failed']),
        recipeId: z.string().nullable(),
        errorCode: z.string().nullable(),
        createdAt: z.string(),
    })
    .openapi('Import');
export const errorSchema = z
    .object({ error: z.object({ code: z.string(), message: z.string(), requestId: z.string() }) })
    .openapi('Error');
export const pageOf = <T extends z.ZodType>(item: T) =>
    z.object({ items: z.array(item), nextCursor: z.string().nullable() });
export const idempotencyHeaders = z.object({
    'idempotency-key': z.string().regex(/^[A-Za-z0-9._-]{1,128}$/),
});
