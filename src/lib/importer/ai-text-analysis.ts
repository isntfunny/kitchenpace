/**
 * AI Text Analysis for Recipe Flow Generation
 *
 * This module provides client-side AI analysis for converting recipe text
 * into structured flow data for the Recipe Editor.
 */

/**
 * AIAnalysisResult is the same shape as AnalyzedRecipe from the transform pipeline.
 * Re-exported here so the FlowEditor / AiConversionDialog can import from one place.
 */
import type { AnalyzedRecipe } from './transform';

export type AIAnalysisResult = AnalyzedRecipe;

/** Which metadata fields the user wants to apply from the AI result */
export interface ApplySelection {
    title: boolean;
    description: boolean;
    category: boolean;
    tags: boolean;
    prepTime: boolean;
    cookTime: boolean;
    servings: boolean;
    difficulty: boolean;
    ingredients: boolean;
}

export interface AIAnalysisSuccess {
    success: true;
    data: AIAnalysisResult;
}

export interface AIAnalysisError {
    success: false;
    error: {
        message: string;
        type?: string;
    };
}

export type AIAnalysisResponse = AIAnalysisSuccess | AIAnalysisError;

/**
 * Analyzes recipe text using OpenAI and returns structured flow data
 */
export async function analyzeRecipeText(text: string): Promise<AIAnalysisResponse> {
    try {
        const response = await fetch('/api/ai/analyze-recipe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
        });

        if (!response.ok) {
            const error = await response.text();
            return {
                success: false,
                error: {
                    message: `API Error: ${error}`,
                    type: 'API_ERROR',
                },
            };
        }

        const result = await response.json();

        if (result.error) {
            return {
                success: false,
                error: {
                    message: result.error,
                    type: result.errorType || 'ANALYSIS_ERROR',
                },
            };
        }

        return {
            success: true,
            data: result.data,
        };
    } catch (error) {
        return {
            success: false,
            error: {
                message: error instanceof Error ? error.message : 'Unknown error',
                type: 'UNKNOWN_ERROR',
            },
        };
    }
}
