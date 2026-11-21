/**
 * Binds an analyzed import's flow to its ingredient rows (KUC-115): the AI's
 * import ids become the RecipeIngredient ids, display text and partial
 * amounts stay, and every mention must resolve. Pure, so the save path and
 * the dry-run evaluation of the full re-import check a flow the same way.
 */

import { repairIngredientMentions, type MentionIssue } from '@app/lib/ingredients/recipe-mentions';

import { bindMentions } from './import-mentions';
import type { AnalyzedRecipe } from './transform';

export function bindImportedFlow(
    data: Pick<AnalyzedRecipe, 'ingredients' | 'flowNodes'>,
    /** import ingredient id → RecipeIngredient id */
    referenceIds: ReadonlyMap<string, string>,
) {
    if (referenceIds.size !== data.ingredients.length)
        throw new Error('Doppelte Import-Zutaten-ID');
    // Unknown ids are kept so the check below reports them.
    const mapped = bindMentions(
        data.flowNodes.map((node) => ({ ...node, description: node.description ?? '' })),
        referenceIds,
        { unknown: 'keep' },
    );
    // Ingredients picked for a step in the review keep their place in ingredientIds.
    const mappedNodes = mapped.nodes.map((node, index) => ({
        ...node,
        ingredientIds: [
            ...new Set([
                ...node.ingredientIds,
                ...(data.flowNodes[index].ingredientIds ?? []).map(
                    (id) => referenceIds.get(id) ?? id,
                ),
            ]),
        ],
    }));
    return repairIngredientMentions(
        mappedNodes,
        data.ingredients.map((ing) => ({
            ...ing,
            id: referenceIds.get(ing.id)!,
            sourceId: ing.id,
        })),
        new Map(),
        { allowNameFallback: false },
    );
}

const REASONS: Record<MentionIssue['reason'], string> = {
    missing: 'verweist auf keine Zutat der Liste',
    ambiguous: 'ist nicht eindeutig',
    'multiple-source-ids': 'verweist auf mehrere Zutaten',
};

export const describeIssue = (issue: MentionIssue) =>
    `nodes.${issue.nodeId}: Erwähnung "${issue.name ?? issue.reference}" ${REASONS[issue.reason]}`;

/** Problems of a flow as text, checked with placeholder row ids (no database). */
export function importedFlowProblems(
    data: Pick<AnalyzedRecipe, 'ingredients' | 'flowNodes'>,
): string[] {
    const ids = new Map(data.ingredients.map((ing, index) => [ing.id, `row-${index}`]));
    if (ids.size !== data.ingredients.length) return ['Doppelte Import-Zutaten-ID'];
    return bindImportedFlow(data, ids).issues.map(describeIssue);
}
