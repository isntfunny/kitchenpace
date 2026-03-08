// src/lib/importer/types.ts
// Type-Definitionen für den Rezept-Importer

import type { ImportedRecipe } from './openai-recipe-schema';

// ============================================================================
// Ergebnis-Typen
// ============================================================================

export interface ImportRunMetadata {
    model: string;
    sourceUrl: string;
    /** Total prompt tokens (input + cached) */
    inputTokens: number | null;
    /** Tokens served from the prompt cache (subset of inputTokens) */
    cachedInputTokens: number | null;
    /** Completion tokens */
    outputTokens: number | null;
    /**
     * Estimated cost in USD.
     * Rates: input $2.50/1M, cached $0.25/1M, output $15.00/1M
     */
    estimatedCostUsd: number | null;
    /** Raw OpenAI completion object — stored in ImportRun.rawApiResponse for auditing */
    rawApiResponse: unknown;
}

/**
 * Erfolgreiches Parse-Ergebnis
 */
export interface RecipeParseSuccess {
    success: true;
    data: ImportedRecipe;
    metadata: ImportRunMetadata;
}

/**
 * Fehlertypen für den Importer
 */
export type ErrorType =
    | 'EMPTY_RESPONSE' // OpenAI hat keine Antwort zurückgegeben
    | 'JSON_PARSE_ERROR' // Antwort ist kein gültiges JSON
    | 'VALIDATION_ERROR' // Zod-Validierung fehlgeschlagen
    | 'FLOW_VALIDATION_ERROR' // Flow-Graph Validierung fehlgeschlagen
    | 'OPENAI_API_ERROR' // OpenAI API Fehler
    | 'UNKNOWN_ERROR'; // Unbekannter Fehler

/**
 * Fehler-Details
 */
export interface RecipeParseError {
    type: ErrorType;
    message: string;
    details?: unknown;
}

/**
 * Fehlgeschlagenes Parse-Ergebnis
 */
export interface RecipeParseFailure {
    success: false;
    error: RecipeParseError;
}

/**
 * Union-Type für das Parse-Ergebnis
 */
export type RecipeParseResult = RecipeParseSuccess | RecipeParseFailure;

// ============================================================================
// Scrapling Integration Types
// ============================================================================

/**
 * Ergebnis des Scrapling Markdown-Extraktions
 */
export interface ScraplingResult {
    /** Der extrahierte Markdown-Content */
    markdown: string;
    /** Metadaten der Quelle */
    metadata: {
        title?: string;
        url: string;
        timestamp: Date;
    };
}

/**
 * Interface für Scrapling-Adapter
 */
export interface ScraplingAdapter {
    /**
     * Extrahiert Markdown von einer URL
     * @param url - Die zu scrapende URL
     * @returns Promise<ScraplingResult>
     */
    extractMarkdown(url: string): Promise<ScraplingResult>;
}

// ============================================================================
// Konvertierungs-Types
// ============================================================================

/**
 * Konvertiert ein ImportedRecipe in das Datenbank-Format
 */
export interface RecipeConverter {
    /**
     * Konvertiert importierte Daten in das Prisma-Format
     * @param imported - Die importierten Rezeptdaten
     * @param authorId - ID des Autors
     * @returns Konvertierte Daten für createRecipe/updateRecipe
     */
    toPrismaInput(imported: ImportedRecipe, authorId: string): Promise<PrismaRecipeInput>;
}

/**
 * Input-Format für Prisma create/update
 */
export interface PrismaRecipeInput {
    title: string;
    description: string;
    servings: number;
    prepTime: number;
    cookTime: number;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    categoryIds: string[];
    tagIds: string[];
    ingredients: Array<{
        ingredientId: string;
        ingredientName?: string;
        amount: string;
        unit: string;
        notes?: string;
        isOptional: boolean;
    }>;
    flowNodes: Array<{
        id: string;
        type: string;
        label: string;
        description: string;
        duration?: number;
        ingredientIds?: string[];
        position: { x: number; y: number };
    }>;
    flowEdges: Array<{
        id: string;
        source: string;
        target: string;
    }>;
}
