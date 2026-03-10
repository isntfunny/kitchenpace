/**
 * Transforms the raw OpenAI ImportedRecipe into the app's AnalyzedRecipe format.
 * No Next.js dependencies — reusable from server actions and CLI.
 */

import type { ImportedRecipe } from './openai-recipe-schema';
import { resolveIngredientMentions } from './resolve-mentions';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AnalyzedRecipe {
    title: string;
    description: string;
    imageUrl?: string;
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

export interface FlowNodeInput {
    id: string;
    type: string;
    label: string;
    description: string;
    duration?: number;
    ingredientIds?: string[];
    photoKey?: string;
    // NOTE: No position — Dagre handles layout
}

export interface FlowEdgeInput {
    id: string;
    source: string;
    target: string;
}

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
        servings: data.servings,
        prepTime: data.prepTime,
        cookTime: data.cookTime,
        difficulty: difficultyMap[data.difficulty] ?? 'MEDIUM',
        categoryIds: [categoryToSlug(data.category)],
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

// ─────────────────────────────────────────────────────────────────────────────
// Fallback Parser (when AI is unavailable)
// ─────────────────────────────────────────────────────────────────────────────

export function parseRecipeMarkdownFallback(markdown: string): AnalyzedRecipe {
    const lines = markdown.split('\n').filter((l) => l.trim());

    const titleLine = lines.find((l) => l.startsWith('#'));
    const title = titleLine ? titleLine.replace(/^#+\s*/, '').trim() : 'Unbenanntes Rezept';

    // Description: non-list text after title before first list/heading
    const descLines: string[] = [];
    let pastTitle = false;
    for (const line of lines) {
        if (line.startsWith('#')) {
            if (!pastTitle) {
                pastTitle = true;
                continue;
            }
            break;
        }
        if (pastTitle && !line.startsWith('-') && !line.startsWith('*') && !/^\d+\./.test(line)) {
            descLines.push(line.trim());
        }
    }
    const description = descLines.slice(0, 2).join(' ');

    // Ingredients: bullet list items
    const ingredients: AnalyzedIngredient[] = lines
        .filter((l) => /^[-*]\s/.test(l))
        .slice(0, 15)
        .map((line) => {
            const text = line.replace(/^[-*]\s*/, '').trim();
            const match = text.match(/^([\d,./ ]+)\s*([a-zA-ZäöüÄÖÜß]+)?\s*/);
            return {
                name: text.replace(/^[\d,./ ]+[a-zA-ZäöüÄÖÜß]*\s*/, '').trim() || text,
                amount: match?.[1]?.trim() ?? '',
                unit: match?.[2]?.trim() ?? 'Stück',
                isOptional: text.toLowerCase().includes('optional'),
            };
        });

    // Flow nodes: numbered steps
    const stepLines = lines.filter((l) => /^\d+\./.test(l)).slice(0, 10);

    const flowNodes: FlowNodeInput[] = [
        {
            id: 'start',
            type: 'start',
            label: "Los geht's!",
            description: 'Beginne mit der Zubereitung',
        },
        ...stepLines.map((line, idx) => ({
            id: `step-${idx + 1}`,
            type: idx === stepLines.length - 1 ? 'anrichten' : 'kochen',
            label: line.replace(/^\d+\.\s*/, '').slice(0, 50),
            description: line.replace(/^\d+\.\s*/, ''),
        })),
        { id: 'servieren', type: 'servieren', label: 'Servieren', description: 'Guten Appetit!' },
    ];

    const allIds = flowNodes.map((n) => n.id);
    const flowEdges: FlowEdgeInput[] = allIds.slice(0, -1).map((id, idx) => ({
        id: `edge-${idx}`,
        source: id,
        target: allIds[idx + 1],
    }));

    return {
        title,
        description,
        servings: 4,
        difficulty: 'MEDIUM',
        categoryIds: ['hauptgericht'],
        tags: [],
        ingredients,
        flowNodes,
        flowEdges,
    };
}
