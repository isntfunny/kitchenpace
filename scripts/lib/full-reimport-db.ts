/**
 * Database reads of the full re-import dry run (KUC-115): the recipes as
 * they are now and the catalogue ingredients a write would create.
 */
import { prisma } from '../../shared/prisma';
import { createIngredient } from '../../src/components/recipe/ingredientActions';
import type { FullRefreshProposal } from '../../src/lib/importer/full-refresh';
import type { CurrentRecipeSummary } from '../../src/lib/importer/full-refresh-report';
import type { ResolveIngredient } from '../../src/lib/importer/pipeline';
import { matchExistingIngredient } from '../../src/lib/ingredients/match-ingredient';

export async function currentSummaries(ids: string[]): Promise<Map<string, CurrentRecipeSummary>> {
    const rows = await prisma.recipe.findMany({
        where: { id: { in: ids } },
        select: {
            id: true,
            title: true,
            flowNodes: true,
            recipeIngredients: { select: { ingredientId: true } },
            tags: { select: { tag: { select: { name: true } } } },
        },
    });
    return new Map(
        rows.map((r) => [
            r.id,
            {
                title: r.title,
                ingredientCount: r.recipeIngredients.length,
                ingredientIds: r.recipeIngredients.map((ri) => ri.ingredientId),
                nodeCount: Array.isArray(r.flowNodes) ? r.flowNodes.length : 0,
                tags: r.tags.map((t) => t.tag.name),
            },
        ]),
    );
}

/**
 * Catalogue lookup (no write) of every proposal's ingredients: the existing
 * catalogue id per ingredient (null if the apply would create it) and the
 * canonical names of the ones it would create.
 */
export async function matchProposalIngredients(proposals: FullRefreshProposal[]) {
    const cache = new Map<string, { id: string | null; name: string }>();
    const ids = new Map<string, (string | null)[]>();
    const newNames = new Map<string, string[]>();
    for (const p of proposals) {
        if (!p.recipe) continue;
        const recipeIds: (string | null)[] = [];
        const names: string[] = [];
        for (const ing of p.recipe.ingredients) {
            const key = ing.name.trim().toLocaleLowerCase('de');
            if (!key) continue;
            if (!cache.has(key)) {
                const match = await matchExistingIngredient(ing.name);
                cache.set(key, {
                    id: match.existing?.id ?? null,
                    name: match.existing?.name ?? match.canonicalName,
                });
            }
            const hit = cache.get(key)!;
            recipeIds.push(hit.id);
            if (!hit.id && !names.includes(hit.name)) names.push(hit.name);
        }
        ids.set(p.recipeId, recipeIds);
        if (names.length) newNames.set(p.recipeId, names);
    }
    return { ids, newNames };
}

/** createIngredient with a name → ingredient cache for the whole run. */
export function cachedIngredientResolver(): ResolveIngredient {
    const cache = new Map<string, Promise<{ id: string }>>();
    return (name) => {
        const key = name.trim().toLocaleLowerCase('de');
        let hit = cache.get(key);
        if (!hit) {
            hit = createIngredient(name);
            // a failed lookup must not stick
            hit.catch(() => cache.delete(key));
            cache.set(key, hit);
        }
        return hit;
    };
}
