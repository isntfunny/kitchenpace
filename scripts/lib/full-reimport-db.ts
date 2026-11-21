/**
 * Database reads of the full re-import dry run (KUC-115): the recipes as
 * they are now and the catalogue ingredients a write would create.
 */
import { prisma } from '../../shared/prisma';
import { matchExistingIngredient } from '../../src/components/recipe/ingredientActions';
import type {
    CurrentRecipeSummary,
    FullRefreshProposal,
} from '../../src/lib/importer/full-refresh';

export async function currentSummaries(ids: string[]): Promise<Map<string, CurrentRecipeSummary>> {
    const rows = await prisma.recipe.findMany({
        where: { id: { in: ids } },
        select: {
            id: true,
            title: true,
            flowNodes: true,
            _count: { select: { recipeIngredients: true } },
            tags: { select: { tag: { select: { name: true } } } },
        },
    });
    return new Map(
        rows.map((r) => [
            r.id,
            {
                title: r.title,
                ingredientCount: r._count.recipeIngredients,
                nodeCount: Array.isArray(r.flowNodes) ? r.flowNodes.length : 0,
                tags: r.tags.map((t) => t.tag.name),
            },
        ]),
    );
}

/** recipeId → canonical names the apply would add to the catalogue (lookup only, no write). */
export async function plannedNewIngredients(proposals: FullRefreshProposal[]) {
    const cache = new Map<string, string | null>();
    const result = new Map<string, string[]>();
    for (const p of proposals) {
        if (!p.recipe) continue;
        const names: string[] = [];
        for (const ing of p.recipe.ingredients) {
            const key = ing.name.trim().toLowerCase();
            if (!key) continue;
            if (!cache.has(key)) {
                const match = await matchExistingIngredient(ing.name);
                cache.set(key, match.existing ? null : match.canonicalName);
            }
            const created = cache.get(key);
            if (created && !names.includes(created)) names.push(created);
        }
        if (names.length) result.set(p.recipeId, names);
    }
    return result;
}
