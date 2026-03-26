import type { TiptapJSON } from './types';

const RECIPE_NODE_TYPES = new Set([
    'recipeCard',
    'recipeCardWithText',
    'recipeSlider',
    'featuredTrio',
    'topList',
    'randomPick',
    'recipeFlow',
]);

export function extractRecipeIdsFromBlocks(doc: TiptapJSON | null | undefined): string[] {
    if (!doc) return [];
    const ids = new Set<string>();

    function walk(node: TiptapJSON) {
        if (RECIPE_NODE_TYPES.has(node.type)) {
            const attrs = node.attrs ?? {};
            if (typeof attrs.recipeId === 'string' && attrs.recipeId) {
                ids.add(attrs.recipeId);
            }
            if (Array.isArray(attrs.recipeIds)) {
                for (const id of attrs.recipeIds) {
                    if (typeof id === 'string' && id) ids.add(id);
                }
            }
        }
        if (node.content) {
            for (const child of node.content) walk(child);
        }
    }

    walk(doc);
    return Array.from(ids);
}

export function extractTextFromBlocks(doc: TiptapJSON | null | undefined): string {
    if (!doc) return '';
    const parts: string[] = [];

    function walk(node: TiptapJSON) {
        if (node.text) parts.push(node.text);
        if (node.content) {
            for (const child of node.content) walk(child);
        }
    }

    walk(doc);
    return parts.join(' ');
}
