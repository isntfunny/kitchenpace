// Merges duplicate catalogue ingredients into one kept ingredient (KUC-114).
// Every reference is moved: recipe occurrences (with flow mentions, KUC-88),
// shopping list items (with history, pantry and snoozes, KUC-98) and filter sets. The other entries' names become aliases
// of the kept ingredient; nothing else on the kept ingredient changes.

import type { Prisma } from '@prisma/client';

import { moveIngredientShoppingReferences } from '@app/lib/shopping/merge-ingredient';

import { duplicateKey } from './duplicate-groups';
import { mergeRecipeIngredientOccurrences } from './merge-occurrences';

export interface MergeGroupPreview {
    keep: { id: string; name: string };
    merge: Array<{
        id: string;
        name: string;
        recipeIngredients: number;
        shoppingItems: number;
        filterSets: number;
    }>;
    /** Distinct recipes whose rows get moved to the kept ingredient */
    affectedRecipeIds: string[];
}

export interface MergedIngredientRecord {
    id: string;
    name: string;
    slug: string;
    normalizedName: string | null;
    aliases: string[];
    recipeIngredientIds: string[];
    shoppingItemIds: string[];
    filterSetIds: string[];
}

export interface MergeGroupResult {
    keepId: string;
    aliases: string[];
    merged: MergedIngredientRecord[];
    affectedRecipeIds: string[];
}

type Db = Prisma.TransactionClient;

function assertDistinct(keepId: string, mergeIds: string[]) {
    if (mergeIds.length === 0) throw new Error('Keine Zutaten zum Zusammenführen');
    if (mergeIds.includes(keepId)) throw new Error('Die behaltene Zutat ist auch in der Liste');
    if (new Set(mergeIds).size !== mergeIds.length) throw new Error('Doppelte Zutat in der Liste');
}

/** Loads all members and checks they still share the same normalized name. */
async function loadMembers(db: Db, keepId: string, mergeIds: string[]) {
    const rows = await db.ingredient.findMany({
        where: { id: { in: [keepId, ...mergeIds] } },
        select: { id: true, name: true, slug: true, normalizedName: true, aliases: true },
    });
    const keep = rows.find((row) => row.id === keepId);
    if (!keep) throw new Error('Behaltene Zutat nicht gefunden');
    const others = mergeIds.map((id) => rows.find((row) => row.id === id));
    if (others.some((row) => !row)) throw new Error('Eine Zutat der Gruppe existiert nicht mehr');
    const key = keep.normalizedName ? duplicateKey(keep.normalizedName) : null;
    for (const row of others) {
        if (!key || !row!.normalizedName || duplicateKey(row!.normalizedName) !== key) {
            throw new Error(`„${row!.name}“ gehört nicht mehr zu dieser Gruppe`);
        }
    }
    return { keep, others: others as NonNullable<(typeof others)[number]>[] };
}

export async function previewIngredientGroupMerge(
    db: Db,
    keepId: string,
    mergeIds: string[],
): Promise<MergeGroupPreview> {
    assertDistinct(keepId, mergeIds);
    const { keep, others } = await loadMembers(db, keepId, mergeIds);
    const [recipeRows, shopping, filters] = await Promise.all([
        db.recipeIngredient.findMany({
            where: { ingredientId: { in: mergeIds } },
            select: { ingredientId: true, recipeId: true },
        }),
        db.shoppingItem.groupBy({
            by: ['ingredientId'],
            where: { ingredientId: { in: mergeIds } },
            _count: { _all: true },
        }),
        db.filterSetIngredient.groupBy({
            by: ['ingredientId'],
            where: { ingredientId: { in: mergeIds } },
            _count: { _all: true },
        }),
    ]);
    return {
        keep: { id: keep.id, name: keep.name },
        merge: others.map((row) => ({
            id: row.id,
            name: row.name,
            recipeIngredients: recipeRows.filter((r) => r.ingredientId === row.id).length,
            shoppingItems: shopping.find((s) => s.ingredientId === row.id)?._count._all ?? 0,
            filterSets: filters.find((f) => f.ingredientId === row.id)?._count._all ?? 0,
        })),
        affectedRecipeIds: [...new Set(recipeRows.map((r) => r.recipeId))],
    };
}

/** Mergeable aliases: lower-cased names and aliases of the merged entries. */
export function mergedAliases(
    keep: { name: string; aliases: string[] },
    others: Array<{ name: string; aliases: string[] }>,
): string[] {
    const keepName = keep.name.toLowerCase().trim();
    return Array.from(
        new Set(
            [...keep.aliases, ...others.flatMap((row) => [row.name, ...row.aliases])]
                .map((alias) => alias.toLowerCase().trim())
                .filter(Boolean),
        ),
    ).filter((alias) => alias !== keepName);
}

/** Run inside a transaction. */
export async function mergeIngredientGroup(
    tx: Db,
    keepId: string,
    mergeIds: string[],
): Promise<MergeGroupResult> {
    assertDistinct(keepId, mergeIds);
    const { keep, others } = await loadMembers(tx, keepId, mergeIds);
    const merged: MergedIngredientRecord[] = [];
    const affected = new Set<string>();

    for (const source of others) {
        const [recipeRows, filterRows] = await Promise.all([
            tx.recipeIngredient.findMany({
                where: { ingredientId: source.id },
                select: { id: true, recipeId: true },
            }),
            tx.filterSetIngredient.findMany({
                where: { ingredientId: source.id },
                select: { filterSetId: true },
            }),
        ]);
        recipeRows.forEach((row) => affected.add(row.recipeId));

        // Recipe rows keep their id, amount and flow mentions (KUC-88)
        await mergeRecipeIngredientOccurrences(tx, source.id, keepId);
        // Would be set to null (shopping, history, pantry) or deleted (filter sets) on
        // delete otherwise; a list that already has the kept ingredient absorbs the entry
        const { shoppingItemIds } = await moveIngredientShoppingReferences(tx, source.id, keepId);
        if (filterRows.length > 0) {
            await tx.filterSetIngredient.createMany({
                data: filterRows.map((row) => ({
                    filterSetId: row.filterSetId,
                    ingredientId: keepId,
                })),
                skipDuplicates: true,
            });
        }
        await tx.ingredient.delete({ where: { id: source.id } });

        merged.push({
            id: source.id,
            name: source.name,
            slug: source.slug,
            normalizedName: source.normalizedName,
            aliases: source.aliases,
            recipeIngredientIds: recipeRows.map((row) => row.id),
            shoppingItemIds,
            filterSetIds: filterRows.map((row) => row.filterSetId),
        });
    }

    const aliases = mergedAliases(keep, others);
    await tx.ingredient.update({ where: { id: keepId }, data: { aliases } });

    return { keepId, aliases, merged, affectedRecipeIds: [...affected] };
}
