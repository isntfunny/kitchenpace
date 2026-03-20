/**
 * Transforms the raw OpenAI ImportedRecipe into the app's AnalyzedRecipe format.
 * No Next.js dependencies — reusable from server actions and CLI.
 */

import type { FlowNodeInput, FlowEdgeInput } from '@app/components/recipe/recipeFormTypes';

import type { ImportedRecipe } from './openai-recipe-schema';
import { resolveIngredientMentions } from './resolve-mentions';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AnalyzedRecipe {
    title: string;
    description: string;
    imageUrl?: string;
    /** Import source URL (YouTube/TikTok/website) for embeds on recipe page */
    sourceUrl?: string;
    servings?: number;
    prepTime?: number;
    cookTime?: number;
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
    categoryIds: string[];
    /** Tag names from the AI — existing tags will be matched, new ones created */
    tags: string[];
    ingredients: AnalyzedIngredient[];
    flowNodes: FlowNodeInput[];
    flowEdges: FlowEdgeInput[];
}

export interface AnalyzedIngredient {
    name: string;
    amount: string;
    unit: string;
    notes?: string;
    isOptional: boolean;
}

export type { FlowNodeInput, FlowEdgeInput };

// ─────────────────────────────────────────────────────────────────────────────
// Transform
// ─────────────────────────────────────────────────────────────────────────────

/** Maps AI category name -> DB slug */
function categoryToSlug(category: string): string {
    const map: Record<string, string> = {
        Hauptgericht: 'hauptgericht',
        Beilage: 'beilage',
        Backen: 'backen',
        Dessert: 'dessert',
        Frühstück: 'fruehstueck',
        Getränk: 'getraenk',
        Vorspeise: 'vorspeise',
        Salat: 'salat',
    };
    return map[category] ?? 'hauptgericht';
}

/**
 * Transforms a validated ImportedRecipe (from OpenAI) into AnalyzedRecipe.
 */
export function transformImportedRecipe(data: ImportedRecipe): AnalyzedRecipe {
    const difficultyMap: Record<string, 'EASY' | 'MEDIUM' | 'HARD'> = {
        Einfach: 'EASY',
        Mittel: 'MEDIUM',
        Schwer: 'HARD',
    };

    // Build ingredient refs for mention resolution
    const ingredientRefs = data.ingredients.map((ing, idx) => ({
        id: `imported_${idx}`,
        name: ing.name,
    }));

    const rawNodes = data.flowNodes.map((node) => ({
        id: node.id,
        type: node.type,
        label: node.label,
        description: node.description,
        duration: node.duration ?? undefined,
        ingredientIds: node.ingredientIds,
    }));

    const resolvedNodes = resolveIngredientMentions(rawNodes, ingredientRefs);

    return {
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl ?? undefined,
        servings: data.servings,
        prepTime: data.prepTime,
        cookTime: data.cookTime,
        difficulty: difficultyMap[data.difficulty] ?? 'MEDIUM',
        categoryIds: data.categories.map(categoryToSlug),
        tags: data.tags,
        ingredients: data.ingredients.map((ing) => ({
            name: ing.name,
            amount: ing.amount != null ? String(ing.amount) : '',
            unit: ing.unit ?? 'Stück',
            notes: ing.notes ?? undefined,
            isOptional: false,
        })),
        flowNodes: resolvedNodes,
        flowEdges: data.flowEdges.map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
        })),
    };
}
