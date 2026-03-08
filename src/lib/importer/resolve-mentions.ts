/**
 * Post-processing: resolves ingredient names in flow node descriptions
 * to @[Name](ingredientId) mention syntax.
 *
 * The AI generates `ingredientIds` per node (e.g. ["ingredient-0", "ingredient-2"])
 * pointing into the ingredients array by index. This module maps those AI-generated
 * IDs to real ingredient IDs and finds ingredient names in the description text,
 * replacing them with the mention syntax that DescriptionEditor/RecipeNode understand.
 */

interface IngredientRef {
    /** Real ID used in the app (e.g. "imported_0" or DB UUID) */
    id: string;
    name: string;
}

interface FlowNodeWithDescription {
    id: string;
    description: string;
    ingredientIds?: string[];
    [key: string]: unknown;
}

/**
 * Resolves ingredient mentions in all flow node descriptions.
 *
 * @param nodes - Flow nodes with AI-generated ingredientIds (e.g. "ingredient-0")
 * @param ingredients - Ordered list of ingredients with real IDs
 * @returns Nodes with descriptions containing @[Name](realId) mentions
 */
export function resolveIngredientMentions<T extends FlowNodeWithDescription>(
    nodes: T[],
    ingredients: IngredientRef[],
): T[] {
    // Build a map from AI ingredient ID → real ingredient
    // AI uses "ingredient-0", "ingredient-1", etc. matching array indices
    const aiIdToIngredient = new Map<string, IngredientRef>();
    for (let i = 0; i < ingredients.length; i++) {
        aiIdToIngredient.set(`ingredient-${i}`, ingredients[i]);
    }

    return nodes.map((node) => {
        if (!node.ingredientIds?.length) return node;

        // Collect ingredients referenced by this node
        const nodeIngredients: IngredientRef[] = [];
        for (const aiId of node.ingredientIds) {
            const ing = aiIdToIngredient.get(aiId);
            if (ing) nodeIngredients.push(ing);
        }

        if (nodeIngredients.length === 0) return node;

        // Replace ingredient names in description with mention syntax
        let description = node.description;
        for (const ing of nodeIngredients) {
            description = insertMention(description, ing.name, ing.id);
        }

        // Update ingredientIds to real IDs
        const resolvedIds = node.ingredientIds
            .map((aiId) => aiIdToIngredient.get(aiId)?.id)
            .filter((id): id is string => id != null);

        return { ...node, description, ingredientIds: resolvedIds };
    });
}

/**
 * Replaces the first occurrence of an ingredient name in a description
 * with @[Name](id) mention syntax. Uses case-insensitive matching.
 * Only replaces if the name isn't already inside a mention.
 */
function insertMention(description: string, name: string, id: string): string {
    // Don't insert if already mentioned
    if (description.includes(`@[${name}](`)) return description;

    // Escape regex special chars in the ingredient name
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Match the name as a word boundary (case-insensitive), only first occurrence
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    const match = description.match(regex);

    if (!match || match.index == null) return description;

    // Check we're not inside an existing mention (look for @[ before this position)
    const before = description.slice(0, match.index);
    const lastMentionOpen = before.lastIndexOf('@[');
    const lastMentionClose = before.lastIndexOf(')');
    if (lastMentionOpen > lastMentionClose) {
        // We're inside an existing mention — skip
        return description;
    }

    // Replace with mention syntax, preserving original casing from the text
    const originalText = match[0];
    return (
        description.slice(0, match.index) +
        `@[${originalText}](${id})` +
        description.slice(match.index + originalText.length)
    );
}
