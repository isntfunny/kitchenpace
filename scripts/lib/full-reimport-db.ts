/**
 * Database reads of the full re-import dry run (KUC-115): the recipes as
 * they are now and the catalogue ingredients a write would create.
 */
import { prisma } from '../../shared/prisma';
import { createIngredient } from '../../src/components/recipe/ingredientActions';
import type { FullRefreshProposal } from '../../src/lib/importer/full-refresh';
import type {
    CurrentRecipeSummary,
    IngredientRef,
} from '../../src/lib/importer/full-refresh-report';
import type { ResolveIngredient } from '../../src/lib/importer/pipeline';
import { matchExistingIngredient } from '../../src/lib/ingredients/match-ingredient';

export async function currentSummaries(ids: string[]): Promise<Map<string, CurrentRecipeSummary>> {
    const rows = await prisma.recipe.findMany({
        where: { id: { in: ids } },
        select: {
            id: true,
            title: true,
            flowNodes: true,
            recipeIngredients: {
                select: { ingredientId: true, ingredient: { select: { name: true } } },
            },
            tags: { select: { tag: { select: { name: true } } } },
        },
    });
    return new Map(
        rows.map((r) => [
            r.id,
            {
                title: r.title,
                ingredientCount: r.recipeIngredients.length,
                ingredients: r.recipeIngredients.map((ri) => ({
                    id: ri.ingredientId,
                    name: ri.ingredient.name,
                })),
                nodeCount: Array.isArray(r.flowNodes) ? r.flowNodes.length : 0,
                tags: r.tags.map((t) => t.tag.name),
            },
        ]),
    );
}

/**
 * Catalogue lookup (no write) of every proposal's ingredients: the existing
 * catalogue id and name per ingredient (id null if the apply would create
 * it) and the canonical names of the ones it would create.
 */
export async function matchProposalIngredients(proposals: FullRefreshProposal[]) {
    const cache = new Map<string, { id: string | null; name: string }>();
    const refs = new Map<string, IngredientRef[]>();
    const newNames = new Map<string, string[]>();
    for (const p of proposals) {
        if (!p.recipe) continue;
        const recipeRefs: IngredientRef[] = [];
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
            recipeRefs.push(hit);
            if (!hit.id && !names.includes(hit.name)) names.push(hit.name);
        }
        refs.set(p.recipeId, recipeRefs);
        if (names.length) newNames.set(p.recipeId, names);
    }
    return { refs, newNames };
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
