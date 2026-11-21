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
     * Estimated cost in USD (all attempts), rates from shared/ai-models.ts
     */
    estimatedCostUsd: number | null;
    /** Raw OpenAI answers of all attempts — stored in ImportRun.rawApiResponse for auditing */
    rawApiResponse: unknown;
    /** 1, or 2 when the repair round ran */
    attempts: number;
    /** Accepted problems, e.g. a mention with an unknown id that became plain text */
    warnings: string[];
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
    | 'MENTION_VALIDATION_ERROR' // Zutaten-Erwähnungen fehlerhaft (unbekannte id, Zutat nie erwähnt)
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
    /** Token usage and cost of the failed attempts, when the API answered */
    metadata?: ImportRunMetadata;
}

/**
 * Union-Type für das Parse-Ergebnis
 */
export type RecipeParseResult = RecipeParseSuccess | RecipeParseFailure;
