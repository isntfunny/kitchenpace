// src/lib/importer/openai-recipe-schema.ts
// Zod-Schemas für die OpenAI Response Format Validierung

import { z } from 'zod';

// ============================================================================
// Enums und Konstanten — müssen mit editorTypes.ts StepType übereinstimmen
// ============================================================================

/** Alle Schritttypen des Flow-Editors. 'start' ist Pflicht als erster Knoten. */
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

export const CATEGORIES = [
    'Hauptgericht',
    'Beilage',
    'Backen',
    'Dessert',
    'Frühstück',
    'Getränk',
    'Vorspeise',
    'Salat',
] as const;

export const DIFFICULTIES = ['Einfach', 'Mittel', 'Schwer'] as const;

// ============================================================================
// Basis-Schemas
// ============================================================================

export const IngredientSchema = z.object({
    name: z
        .string()
        .min(1)
        .describe(
            'Name der Zutat auf DEUTSCH (nur der reine Name, z.B. "Tomaten", "Linguine", "Maisstärke"). NIEMALS englische Namen — immer ins Deutsche übersetzen.',
        ),
    amount: z
        .number()
        .positive()
        .nullable()
        .describe('Menge der Zutat als Zahl, null wenn nicht klar'),
    unit: z
        .string()
        .min(1)
        .nullable()
        .describe('Einheit (z.B. g, ml, Stück, EL), null wenn nicht klar'),
    notes: z
        .string()
        .nullable()
        .describe(
            'Zubereitungshinweis zur Zutat, z.B. "frisch gehackt", "fein gewürfelt", "zimmerwarm". Null wenn kein Hinweis nötig.',
        ),
});

export const FlowNodeSchema = z.object({
    id: z.string().min(1).describe('Eindeutige ID des Knotens (z.B. start, step-1, servieren)'),
    type: z.enum(STEP_TYPES).describe('Typ des Schritts'),
    label: z.string().min(1).max(50).describe('Kurzer Titel des Schritts'),
    description: z.string().min(1).describe('Detaillierte Beschreibung der Aktion'),
    duration: z
        .number()
        .positive()
        .nullable()
        .describe('Dauer in Minuten, null wenn nicht angegeben'),
    laneId: z.string().min(1).describe('ID der Lane/Spur für parallele Prozesse'),
    ingredientIds: z
        .array(z.string())
        .describe('Array von Zutaten-IDs die in diesem Schritt verwendet werden'),
});

export const FlowEdgeSchema = z.object({
    id: z.string().min(1).describe('Eindeutige ID der Kante'),
    source: z.string().min(1).describe('ID des Quellknotens'),
    target: z.string().min(1).describe('ID des Zielknotens'),
    label: z
        .string()
        .nullable()
        .describe('Optionale Beschriftung der Verbindung (z.B. "Zwiebeln", "Sauce")'),
});

// ============================================================================
// Haupt-Rezept-Schema
// ============================================================================

export const ImportedRecipeSchema = z.object({
    id: z.string().uuid().describe('UUID des Rezepts'),
    title: z.string().min(1).max(200).describe('Titel des Rezepts'),
    description: z.string().min(10).describe('Beschreibung/Zubereitungshinweis'),
    category: z.enum(CATEGORIES).describe('Kategorie des Rezepts'),
    tags: z
        .array(z.string().min(1))
        .min(1)
        .max(10)
        .describe('Tags für das Rezept (mindestens 1, maximal 10)'),
    prepTime: z.number().int().positive().describe('Vorbereitungszeit in Minuten'),
    cookTime: z.number().int().nonnegative().describe('Kochzeit in Minuten'),
    servings: z.number().int().positive().describe('Anzahl der Portionen'),
    difficulty: z.enum(DIFFICULTIES).describe('Schwierigkeitsgrad'),
    ingredients: z.array(IngredientSchema).min(1).describe('Liste aller Zutaten'),
    flowNodes: z
        .array(FlowNodeSchema)
        .min(2)
        .describe('Liste aller Rezeptschritte als Flow-Knoten'),
    flowEdges: z.array(FlowEdgeSchema).describe('Verbindungen zwischen den Schritten'),
});

// ============================================================================
// TypeScript Types (abgeleitet von Zod)
// ============================================================================

export type ImportedIngredient = z.infer<typeof IngredientSchema>;
export type ImportedFlowNode = z.infer<typeof FlowNodeSchema>;
export type ImportedFlowEdge = z.infer<typeof FlowEdgeSchema>;
export type ImportedRecipe = z.infer<typeof ImportedRecipeSchema>;

// ============================================================================
// JSON Schema Export für OpenAI Response Format (strict: true)
//
// Bei strict: true müssen ALLE Properties in required stehen.
// Optionale Felder werden als nullable deklariert statt weggelassen.
// ============================================================================

export function getOpenAIResponseFormat() {
    return {
        type: 'json_schema',
        json_schema: {
            name: 'recipe_import',
            description:
                'Strukturierte Rezeptdaten für die KitchenPace App. Enthält alle Informationen für das Rezept inklusive Flow-Diagramm.',
            strict: true,
            schema: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        description:
                            'UUID des Rezepts (Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
                    },
                    title: {
                        type: 'string',
                        description: 'Titel des Rezepts',
                    },
                    description: {
                        type: 'string',
                        description: 'Beschreibung/Zubereitungshinweis',
                    },
                    category: {
                        type: 'string',
                        enum: [...CATEGORIES],
                        description: 'Kategorie des Rezepts',
                    },
                    tags: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Tags für das Rezept',
                    },
                    prepTime: {
                        type: 'integer',
                        description: 'Vorbereitungszeit in Minuten',
                    },
                    cookTime: {
                        type: 'integer',
                        description: 'Kochzeit in Minuten',
                    },
                    servings: {
                        type: 'integer',
                        description: 'Anzahl der Portionen',
                    },
                    difficulty: {
                        type: 'string',
                        enum: [...DIFFICULTIES],
                        description: 'Schwierigkeitsgrad',
                    },
                    ingredients: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                name: {
                                    type: 'string',
                                    description:
                                        'Reiner Name der Zutat auf DEUTSCH ohne Zubereitungshinweise. Beispiele: "Linguine" statt "Linguine noodles", "Maisstärke" statt "Cornstarch", "Rinderfleischbrühe" statt "Beef broth", "Sojasoße" statt "Soy sauce", "Wasser" statt "Water". Immer ins Deutsche übersetzen.',
                                },
                                amount: {
                                    type: ['number', 'null'],
                                    description: 'Menge oder null wenn nicht klar',
                                },
                                unit: {
                                    type: ['string', 'null'],
                                    description: 'Einheit oder null wenn nicht klar',
                                },
                                notes: {
                                    type: ['string', 'null'],
                                    description:
                                        'Zubereitungshinweis, z.B. "frisch gehackt", "fein gewürfelt". Null wenn nicht nötig.',
                                },
                            },
                            required: ['name', 'amount', 'unit', 'notes'],
                            additionalProperties: false,
                        },
                        description: 'Liste aller Zutaten',
                    },
                    flowNodes: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                type: {
                                    type: 'string',
                                    enum: [...STEP_TYPES],
                                },
                                label: { type: 'string' },
                                description: { type: 'string' },
                                duration: {
                                    type: ['integer', 'null'],
                                    description: 'Dauer in Minuten oder null',
                                },
                                laneId: { type: 'string' },
                                ingredientIds: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description:
                                        'Zutaten-IDs die in diesem Schritt verwendet werden',
                                },
                            },
                            required: [
                                'id',
                                'type',
                                'label',
                                'description',
                                'duration',
                                'laneId',
                                'ingredientIds',
                            ],
                            additionalProperties: false,
                        },
                        description: 'Liste aller Rezeptschritte als Flow-Knoten',
                    },
                    flowEdges: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                source: { type: 'string' },
                                target: { type: 'string' },
                                label: {
                                    type: ['string', 'null'],
                                    description: 'Optionale Beschriftung',
                                },
                            },
                            required: ['id', 'source', 'target', 'label'],
                            additionalProperties: false,
                        },
                        description: 'Verbindungen zwischen den Schritten',
                    },
                },
                required: [
                    'id',
                    'title',
                    'description',
                    'category',
                    'tags',
                    'prepTime',
                    'cookTime',
                    'servings',
                    'difficulty',
                    'ingredients',
                    'flowNodes',
                    'flowEdges',
                ],
                additionalProperties: false,
            },
        },
    } as const;
}

export type OpenAIResponseFormat = ReturnType<typeof getOpenAIResponseFormat>;
