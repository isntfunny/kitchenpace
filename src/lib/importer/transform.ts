/**
 * Transforms the raw OpenAI ImportedRecipe into the app's AnalyzedRecipe format.
 * No Next.js dependencies — reusable from server actions and CLI.
 */

import { randomUUID } from 'node:crypto';

import type { FlowNodeInput, FlowEdgeInput } from '@app/components/recipe/recipeFormTypes';

import { bindMentions } from './import-mentions';
import type { ImportedRecipe } from './openai-recipe-schema';

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
    /** Accepted problems of the AI answer, e.g. a mention that became plain text */
    warnings?: string[];
}

export interface AnalyzedIngredient {
    /** Stable source identity; retain when reordering/removing/replacing ingredients. */
    id: string;
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

/** Edge list of the AI (source/target only) with stable ids. */
export function toFlowEdges(edges: { source: string; target: string }[]): FlowEdgeInput[] {
    return edges.map((edge, index) => ({
        id: `edge-${index + 1}`,
        source: edge.source,
        target: edge.target,
    }));
}

/**
 * Transforms a validated ImportedRecipe (from OpenAI) into AnalyzedRecipe.
 * The temporary ingredient ids of the AI ("ingredient-N") become fresh
 * import ids; mentions keep their display text and partial amount, and
 * each step's ingredientIds are derived from its mentions.
 */
export function transformImportedRecipe(data: ImportedRecipe): AnalyzedRecipe {
    const difficultyMap: Record<string, 'EASY' | 'MEDIUM' | 'HARD'> = {
        Einfach: 'EASY',
        Mittel: 'MEDIUM',
        Schwer: 'HARD',
    };

    const ingredientIds = new Map(
        data.ingredients.map((ing, idx) => [ing.id, `imported_${idx}_${randomUUID()}`]),
    );

    const bound = bindMentions(
        data.nodes.map((node) => ({
            id: node.id,
            type: node.type,
            label: node.label,
            description: node.description,
            duration: node.duration ?? undefined,
        })),
        ingredientIds,
        { unknown: 'text' },
    );

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
            id: ingredientIds.get(ing.id)!,
            name: ing.name,
            amount: ing.amount != null ? String(ing.amount) : '',
            unit: ing.unit ?? 'Stück',
            notes: ing.notes ?? undefined,
            isOptional: false,
        })),
        flowNodes: bound.nodes,
        flowEdges: toFlowEdges(data.edges),
        ...(bound.warnings.length > 0 ? { warnings: bound.warnings } : {}),
    };
}
