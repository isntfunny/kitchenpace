// src/lib/importer/lane-grid-ai-schema.ts
// Zod-Schemas und OpenAI Response Format für LaneGrid-basierte Rezeptimporte
// Ersetzt flowNodes + flowEdges aus openai-recipe-schema.ts

import { z } from 'zod';

// ============================================================================
// Enums — müssen mit editorTypes.ts StepType übereinstimmen
// ============================================================================

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
// LaneGrid-Schemas
// ============================================================================

export const LaneStepAISchema = z.object({
    id: z
        .string()
        .min(1)
        .describe(
            'Eindeutige ID des Schritts, z.B. "step-zwiebeln", "step-pasta-kochen". Keine UUIDs — kurze sprechende Slugs.',
        ),
    type: z
        .enum(STEP_TYPES)
        .describe(
            'Typ des Schritts. "start" nur für den allerersten Schritt im gesamten Rezept, "servieren" nur für den allerletzten.',
        ),
    label: z
        .string()
        .min(1)
        .max(50)
        .describe('Kurzer Titel, z.B. "Zwiebeln würfeln". Max 50 Zeichen.'),
    description: z
        .string()
        .describe(
            'Detaillierte Anleitung für diesen Schritt. Kann @[Zutatname](zutat-id) Mentions enthalten.',
        ),
    duration: z
        .number()
        .int()
        .positive()
        .nullable()
        .describe(
            'Dauer in Minuten, null wenn kein sinnvoller Zeitwert (z.B. reine Schneideschritte).',
        ),
    ingredientIds: z
        .array(z.string())
        .describe(
            'IDs der Zutaten aus dem ingredients-Array, die in diesem Schritt verwendet werden. Leer wenn keine Zutaten direkt zugeordnet.',
        ),
});

export const LaneSegmentAISchema = z.object({
    id: z
        .string()
        .min(1)
        .describe(
            'Eindeutige Segment-ID, z.B. "seg-start", "seg-gemuese-parallel", "seg-anbraten".',
        ),
    columnSpans: z
        .array(z.number().int().positive())
        .min(1)
        .describe(
            'Spaltenbreiten jeder Lane als ganze Zahlen. Summe = effektive Spaltenanzahl des Segments. ' +
                'Beispiele: [3] = eine volle Lane in 3-Spalten-Kontext, [2,1] = zwei Drittel + ein Drittel, [1,1,1] = drei gleiche. ' +
                'lanes.length MUSS columnSpans.length entsprechen.',
        ),
    lanes: z
        .array(z.array(LaneStepAISchema))
        .min(1)
        .describe(
            'lanes[laneIndex][stepIndex] = Schritt. Jede Lane ist ein Array von aufeinanderfolgenden Schritten. ' +
                'Leere Lane = leeres Array []. lanes.length MUSS columnSpans.length entsprechen.',
        ),
});

export const LaneGridAISchema = z.object({
    segments: z
        .array(LaneSegmentAISchema)
        .min(2)
        .describe(
            'Sequenz von Segmenten von oben nach unten. Jeder Split/Merge erzeugt ein neues Segment. ' +
                'Erstes Segment: eine Lane mit type="start". Letztes Segment: eine Lane mit type="servieren". ' +
                'Parallele Schritte → ein Segment mit mehreren Lanes. ' +
                'Zusammenführung → neues Segment mit einer Lane.',
        ),
});

// ============================================================================
// Zutaten-Schema (identisch zu openai-recipe-schema.ts)
// ============================================================================

export const IngredientSchema = z.object({
    id: z
        .string()
        .min(1)
        .describe(
            'Eindeutige ID, z.B. "zutat-zwiebel". Wird in ingredientIds der Schritte referenziert.',
        ),
    name: z
        .string()
        .min(1)
        .describe(
            'Name der Zutat auf DEUTSCH, z.B. "Zwiebeln", "Passierte Tomaten". NIEMALS englische Namen.',
        ),
    amount: z.number().positive().nullable().describe('Menge als Zahl, null wenn nicht klar.'),
    unit: z
        .string()
        .min(1)
        .nullable()
        .describe('Einheit, z.B. "g", "ml", "Stück", "EL". null wenn nicht klar.'),
    notes: z
        .string()
        .nullable()
        .describe('Zubereitungshinweis, z.B. "fein gehackt". null wenn nicht nötig.'),
});

// ============================================================================
// Haupt-Schema
// ============================================================================

export const ImportedRecipeWithLaneGridSchema = z.object({
    title: z.string().min(1).max(200).describe('Titel des Rezepts auf DEUTSCH.'),
    description: z.string().min(10).describe('Kurze Beschreibung des Gerichts (2–4 Sätze).'),
    category: z.enum(CATEGORIES).describe('Kategorie des Rezepts.'),
    tags: z.array(z.string().min(1)).min(1).max(10).describe('Schlagwörter auf DEUTSCH.'),
    prepTime: z.number().int().positive().describe('Vorbereitungszeit in Minuten.'),
    cookTime: z.number().int().nonnegative().describe('Kochzeit in Minuten.'),
    servings: z.number().int().positive().describe('Anzahl der Portionen.'),
    difficulty: z.enum(DIFFICULTIES).describe('Schwierigkeitsgrad.'),
    ingredients: z.array(IngredientSchema).min(1).describe('Alle Zutaten mit IDs.'),
    laneGrid: LaneGridAISchema,
});

// ============================================================================
// TypeScript Types
// ============================================================================

export type LaneStepAI = z.infer<typeof LaneStepAISchema>;
export type LaneSegmentAI = z.infer<typeof LaneSegmentAISchema>;
export type LaneGridAI = z.infer<typeof LaneGridAISchema>;
export type ImportedRecipeWithLaneGrid = z.infer<typeof ImportedRecipeWithLaneGridSchema>;

// ============================================================================
// JSON Schema für OpenAI Response Format (strict: true)
//
// strict: true erfordert ALLE Properties in required[].
// Optionale Felder → nullable statt weggelassen.
// ============================================================================

const laneStepJsonSchema = {
    type: 'object',
    properties: {
        id: { type: 'string', description: 'Eindeutige Schritt-ID, kurzer sprechender Slug.' },
        type: {
            type: 'string',
            enum: [...STEP_TYPES],
            description: '"start" nur einmal ganz oben, "servieren" nur einmal ganz unten.',
        },
        label: { type: 'string', description: 'Kurzer Titel, max 50 Zeichen.' },
        description: { type: 'string', description: 'Detaillierte Anleitung.' },
        duration: { type: ['integer', 'null'], description: 'Dauer in Minuten oder null.' },
        ingredientIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Zutaten-IDs die in diesem Schritt verwendet werden.',
        },
    },
    required: ['id', 'type', 'label', 'description', 'duration', 'ingredientIds'],
    additionalProperties: false,
} as const;

const laneSegmentJsonSchema = {
    type: 'object',
    properties: {
        id: { type: 'string', description: 'Eindeutige Segment-ID.' },
        columnSpans: {
            type: 'array',
            items: { type: 'integer' },
            description:
                'Spaltenbreiten der Lanes. Summe = effektive Spaltenanzahl. ' +
                '[3]=eine volle Lane, [2,1]=2/3+1/3, [1,1,1]=drei gleich. ' +
                'Länge MUSS lanes.length entsprechen.',
        },
        lanes: {
            type: 'array',
            items: { type: 'array', items: laneStepJsonSchema },
            description:
                'lanes[laneIndex][stepIndex]. Parallele Schritte = mehrere Lanes. ' +
                'Länge MUSS columnSpans.length entsprechen.',
        },
    },
    required: ['id', 'columnSpans', 'lanes'],
    additionalProperties: false,
} as const;

export function getOpenAIResponseFormat() {
    return {
        type: 'json_schema',
        json_schema: {
            name: 'recipe_import_lane_grid',
            description:
                'Strukturierte Rezeptdaten für KitchenPace. laneGrid ersetzt flowNodes/flowEdges — ' +
                'Segmente mit parallelen Lanes statt Graph-Struktur.',
            strict: true,
            schema: {
                type: 'object',
                properties: {
                    title: { type: 'string', description: 'Titel auf DEUTSCH.' },
                    description: { type: 'string', description: 'Kurze Beschreibung.' },
                    category: { type: 'string', enum: [...CATEGORIES] },
                    tags: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Schlagwörter auf DEUTSCH.',
                    },
                    prepTime: { type: 'integer', description: 'Vorbereitungszeit in Minuten.' },
                    cookTime: { type: 'integer', description: 'Kochzeit in Minuten.' },
                    servings: { type: 'integer', description: 'Portionen.' },
                    difficulty: { type: 'string', enum: [...DIFFICULTIES] },
                    ingredients: {
                        type: 'array',
                        description:
                            'Alle Zutaten. IDs werden in laneGrid.segments[].lanes[][].ingredientIds referenziert.',
                        items: {
                            type: 'object',
                            properties: {
                                id: {
                                    type: 'string',
                                    description: 'Kurzer Slug, z.B. "zutat-zwiebel".',
                                },
                                name: { type: 'string', description: 'Name auf DEUTSCH.' },
                                amount: { type: ['number', 'null'] },
                                unit: { type: ['string', 'null'] },
                                notes: { type: ['string', 'null'] },
                            },
                            required: ['id', 'name', 'amount', 'unit', 'notes'],
                            additionalProperties: false,
                        },
                    },
                    laneGrid: {
                        type: 'object',
                        description:
                            'Der gesamte Rezeptablauf als Segment-Grid. ' +
                            'Erstes Segment: start-Schritt. Letztes Segment: servieren-Schritt. ' +
                            'Split → neues Segment mit mehreren Lanes. Merge → neues Segment mit einer Lane.',
                        properties: {
                            segments: {
                                type: 'array',
                                items: laneSegmentJsonSchema,
                            },
                        },
                        required: ['segments'],
                        additionalProperties: false,
                    },
                },
                required: [
                    'title',
                    'description',
                    'category',
                    'tags',
                    'prepTime',
                    'cookTime',
                    'servings',
                    'difficulty',
                    'ingredients',
                    'laneGrid',
                ],
                additionalProperties: false,
            },
        },
    } as const;
}

export type OpenAIResponseFormat = ReturnType<typeof getOpenAIResponseFormat>;
