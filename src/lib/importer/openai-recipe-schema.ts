// src/lib/importer/openai-recipe-schema.ts
// Zod schemas and strict JSON schemas for the OpenAI response (KUC-115, G2M-1).
//
// The ingredients come first so the model knows their temporary ids
// ("ingredient-N") while it writes the mentions in the flow texts.

import { z } from 'zod';

// ============================================================================
// Enums — must match editorTypes.ts StepType
// ============================================================================

/** All step types of the flow editor. 'start' and 'servieren' occur exactly once. */
export const STEP_TYPES = [
    'start',
    'schneiden',
    'kochen',
    'braten',
    'backen',
    'mixen',
    'warten',
    'wuerzen',
    'anrichten',
    'servieren',
] as const;

const CATEGORIES = [
    'Hauptgericht',
    'Beilage',
    'Backen',
    'Dessert',
    'Frühstück',
    'Getränk',
    'Vorspeise',
    'Salat',
] as const;

const DIFFICULTIES = ['Einfach', 'Mittel', 'Schwer'] as const;

// ============================================================================
// Zod schemas
// ============================================================================

const IngredientSchema = z.object({
    id: z.string().regex(/^ingredient-\d+$/, 'id muss die Form "ingredient-N" haben'),
    name: z.string().min(1),
    amount: z.number().positive().nullable(),
    unit: z.string().min(1).nullable(),
    notes: z.string().nullable(),
});

export const FlowNodeSchema = z.object({
    id: z.string().min(1),
    type: z.enum(STEP_TYPES),
    label: z.string().min(1).max(50),
    description: z.string().min(1),
    duration: z.number().positive().nullable(),
    /** Ignored by the code: the ingredients of a step are derived from its mentions. */
    ingredientIds: z.array(z.string()),
});

export const FlowEdgeSchema = z.object({
    source: z.string().min(1),
    target: z.string().min(1),
});

export const ImportedRecipeSchema = z.object({
    ingredients: z.array(IngredientSchema).min(1),
    title: z.string().min(1).max(200),
    description: z.string().min(10),
    categories: z.array(z.enum(CATEGORIES)).min(1).max(3),
    tags: z.array(z.string().min(1)).max(15),
    difficulty: z.enum(DIFFICULTIES),
    prepTime: z.number().int().nonnegative(),
    cookTime: z.number().int().nonnegative(),
    servings: z.number().int().positive(),
    imageUrl: z.string().nullable(),
    nodes: z.array(FlowNodeSchema).min(2),
    edges: z.array(FlowEdgeSchema),
});

/** Flow-only answer of the refresh (fixed ingredient list). */
export const ImportedFlowSchema = z.object({
    nodes: z.array(FlowNodeSchema).min(2),
    edges: z.array(FlowEdgeSchema),
});

export type ImportedRecipe = z.infer<typeof ImportedRecipeSchema>;
export type ImportedFlow = z.infer<typeof ImportedFlowSchema>;
export type ImportedFlowNode = z.infer<typeof FlowNodeSchema>;
export type ImportedFlowEdge = z.infer<typeof FlowEdgeSchema>;

// ============================================================================
// Strict JSON schemas for response_format (strict: true → every property required)
// ============================================================================

const nodesJsonSchema = {
    type: 'array',
    description: 'Die Schritte des Kochablaufs',
    items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'type', 'label', 'description', 'duration', 'ingredientIds'],
        properties: {
            id: { type: 'string' },
            type: { type: 'string', enum: [...STEP_TYPES] },
            label: { type: 'string', description: 'Kurze Handlung im Infinitiv, max. 50 Zeichen' },
            description: {
                type: 'string',
                description: 'Kochbuchsatz im Infinitiv mit Erwähnungen @[Text](ingredient-N)',
            },
            duration: { type: ['integer', 'null'], description: 'Minuten oder null' },
            ingredientIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'Genau die ids, die die Beschreibung erwähnt',
            },
        },
    },
} as const;

const edgesJsonSchema = {
    type: 'array',
    description: 'Abhängigkeiten: target braucht das Ergebnis von source',
    items: {
        type: 'object',
        additionalProperties: false,
        required: ['source', 'target'],
        properties: { source: { type: 'string' }, target: { type: 'string' } },
    },
} as const;

export function getOpenAIResponseFormat() {
    return {
        type: 'json_schema',
        json_schema: {
            name: 'recipe_import',
            strict: true,
            schema: {
                type: 'object',
                additionalProperties: false,
                required: [
                    'ingredients',
                    'title',
                    'description',
                    'categories',
                    'tags',
                    'difficulty',
                    'prepTime',
                    'cookTime',
                    'servings',
                    'imageUrl',
                    'nodes',
                    'edges',
                ],
                properties: {
                    ingredients: {
                        type: 'array',
                        items: {
                            type: 'object',
                            additionalProperties: false,
                            required: ['id', 'name', 'amount', 'unit', 'notes'],
                            properties: {
                                id: {
                                    type: 'string',
                                    description: '"ingredient-0", "ingredient-1", …',
                                },
                                name: { type: 'string' },
                                amount: { type: ['number', 'null'] },
                                unit: { type: ['string', 'null'] },
                                notes: { type: ['string', 'null'] },
                            },
                        },
                    },
                    title: { type: 'string' },
                    description: { type: 'string' },
                    categories: { type: 'array', items: { type: 'string', enum: [...CATEGORIES] } },
                    tags: {
                        type: 'array',
                        items: { type: 'string' },
                        description: '3 bis 10 Tags, nur aus der Tag-Liste',
                    },
                    difficulty: { type: 'string', enum: [...DIFFICULTIES] },
                    prepTime: { type: 'integer' },
                    cookTime: { type: 'integer' },
                    servings: { type: 'integer' },
                    imageUrl: { type: ['string', 'null'] },
                    nodes: nodesJsonSchema,
                    edges: edgesJsonSchema,
                },
            },
        },
    } as const;
}

export function getFlowOnlyResponseFormat() {
    return {
        type: 'json_schema',
        json_schema: {
            name: 'recipe_flow',
            strict: true,
            schema: {
                type: 'object',
                additionalProperties: false,
                required: ['nodes', 'edges'],
                properties: { nodes: nodesJsonSchema, edges: edgesJsonSchema },
            },
        },
    } as const;
}
