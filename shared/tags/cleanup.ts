// Tag cleanup against the fixed tag list (KUC-116).
//
// Every database tag is sorted into: list tag (kept, renamed to the canonical
// spelling if needed), old name merged into a list tag, dropped tag, or unknown
// (reported, never touched). Merges move recipe, filter set and collection
// links to the kept tag and skip links that already exist. Missing list tags
// are created so the database holds the whole list. Running it twice changes
// nothing the second time.

import type { Prisma, PrismaClient } from '@prisma/client';

import { type DropReason, resolveTag, TAG_LIST } from './tag-list';

type Db = Prisma.TransactionClient | PrismaClient;

export interface DbTagRow {
    id: string;
    name: string;
    slug: string;
    recipeIds: string[];
    filterSetIds: string[];
    collectionIds: string[];
}

export interface PlannedTarget {
    name: string;
    slug: string;
    group: string;
    /** Existing tag that is kept (and renamed if name or slug differ); null = create */
    keep: DbTagRow | null;
    /** Old tags merged into the kept tag and then deleted */
    sources: DbTagRow[];
}

export interface TagCleanupPlan {
    targets: PlannedTarget[];
    drops: Array<DbTagRow & { reason: DropReason }>;
    unknown: DbTagRow[];
}

interface TagRef {
    id: string;
    name: string;
    slug: string;
}

export interface TagCleanupReport {
    mode: 'dry-run' | 'write';
    created: Array<{ name: string; slug: string; group: string }>;
    renamed: Array<{
        id: string;
        from: { name: string; slug: string };
        to: { name: string; slug: string };
    }>;
    merged: Array<{
        from: TagRef;
        to: { name: string; slug: string };
        /** Recipe links of the old tag */
        recipes: number;
        /** Of those, recipes that already had the target tag (link skipped) */
        alreadyTagged: number;
        filterSets: number;
        collections: number;
    }>;
    dropped: Array<
        TagRef & { reason: DropReason; recipes: number; filterSets: number; collections: number }
    >;
    unknown: Array<TagRef & { recipes: number }>;
    /** Recipes whose tag names change; resync these in OpenSearch */
    affectedRecipeIds: string[];
}

/** Picks the existing tag to keep: same slug, then exact name, then most recipes. */
function pickKeep(candidates: DbTagRow[], name: string, slug: string): DbTagRow | null {
    if (candidates.length === 0) return null;
    return (
        candidates.find((c) => c.slug === slug) ??
        candidates.find((c) => c.name === name) ??
        [...candidates].sort(
            (a, b) => b.recipeIds.length - a.recipeIds.length || a.id.localeCompare(b.id),
        )[0]
    );
}

export function planTagCleanup(rows: DbTagRow[]): TagCleanupPlan {
    const candidates = new Map<string, DbTagRow[]>();
    const drops: TagCleanupPlan['drops'] = [];
    const unknown: DbTagRow[] = [];

    for (const row of rows) {
        const resolution = resolveTag(row.name, row.slug);
        if (resolution.kind === 'list' || resolution.kind === 'merge') {
            const list = candidates.get(resolution.tag.slug) ?? [];
            list.push(row);
            candidates.set(resolution.tag.slug, list);
        } else if (resolution.kind === 'drop') {
            drops.push({ ...row, reason: resolution.reason });
        } else {
            unknown.push(row);
        }
    }

    const targets = TAG_LIST.map((tag) => {
        const rowsForTag = candidates.get(tag.slug) ?? [];
        const keep = pickKeep(rowsForTag, tag.name, tag.slug);
        return {
            name: tag.name,
            slug: tag.slug,
            group: tag.group,
            keep,
            sources: rowsForTag.filter((r) => r !== keep),
        };
    });

    return { targets, drops, unknown };
}

const ref = (row: DbTagRow): TagRef => ({ id: row.id, name: row.name, slug: row.slug });

export function describeTagCleanup(
    plan: TagCleanupPlan,
    mode: TagCleanupReport['mode'],
): TagCleanupReport {
    const report: TagCleanupReport = {
        mode,
        created: [],
        renamed: [],
        merged: [],
        dropped: [],
        unknown: plan.unknown.map((row) => ({ ...ref(row), recipes: row.recipeIds.length })),
        affectedRecipeIds: [],
    };
    const affected = new Set<string>();

    for (const target of plan.targets) {
        const to = { name: target.name, slug: target.slug };
        if (!target.keep) {
            report.created.push({ ...to, group: target.group });
        } else if (target.keep.name !== target.name || target.keep.slug !== target.slug) {
            report.renamed.push({
                id: target.keep.id,
                from: { name: target.keep.name, slug: target.keep.slug },
                to,
            });
            target.keep.recipeIds.forEach((id) => affected.add(id));
        }
        const tagged = new Set(target.keep?.recipeIds ?? []);
        for (const source of target.sources) {
            report.merged.push({
                from: ref(source),
                to,
                recipes: source.recipeIds.length,
                alreadyTagged: source.recipeIds.filter((id) => tagged.has(id)).length,
                filterSets: source.filterSetIds.length,
                collections: source.collectionIds.length,
            });
            source.recipeIds.forEach((id) => {
                tagged.add(id);
                affected.add(id);
            });
        }
    }

    for (const drop of plan.drops) {
        report.dropped.push({
            ...ref(drop),
            reason: drop.reason,
            recipes: drop.recipeIds.length,
            filterSets: drop.filterSetIds.length,
            collections: drop.collectionIds.length,
        });
        drop.recipeIds.forEach((id) => affected.add(id));
    }

    report.affectedRecipeIds = [...affected].sort();
    return report;
}

export async function loadTagRows(db: Db): Promise<DbTagRow[]> {
    const tags = await db.tag.findMany({
        select: {
            id: true,
            name: true,
            slug: true,
            recipes: { select: { recipeId: true } },
            filterSets: { select: { filterSetId: true } },
            collectionTags: { select: { collectionId: true } },
        },
        orderBy: { id: 'asc' },
    });
    return tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        recipeIds: tag.recipes.map((r) => r.recipeId),
        filterSetIds: tag.filterSets.map((f) => f.filterSetId),
        collectionIds: tag.collectionTags.map((c) => c.collectionId),
    }));
}

/** Run inside a transaction. */
export async function applyTagCleanup(
    tx: Prisma.TransactionClient,
    plan: TagCleanupPlan,
): Promise<void> {
    for (const target of plan.targets) {
        const keepId =
            target.keep?.id ??
            (
                await tx.tag.create({
                    data: { name: target.name, slug: target.slug },
                    select: { id: true },
                })
            ).id;

        for (const source of target.sources) {
            if (source.recipeIds.length > 0) {
                await tx.recipeTag.createMany({
                    data: source.recipeIds.map((recipeId) => ({ recipeId, tagId: keepId })),
                    skipDuplicates: true,
                });
            }
            if (source.filterSetIds.length > 0) {
                await tx.filterSetTag.createMany({
                    data: source.filterSetIds.map((filterSetId) => ({
                        filterSetId,
                        tagId: keepId,
                    })),
                    skipDuplicates: true,
                });
            }
            if (source.collectionIds.length > 0) {
                await tx.collectionTag.createMany({
                    data: source.collectionIds.map((collectionId) => ({
                        collectionId,
                        tagId: keepId,
                    })),
                    skipDuplicates: true,
                });
            }
            // Cascades the old links
            await tx.tag.delete({ where: { id: source.id } });
        }

        // After the sources are gone, so their name/slug no longer collide
        if (target.keep && (target.keep.name !== target.name || target.keep.slug !== target.slug)) {
            await tx.tag.update({
                where: { id: keepId },
                data: { name: target.name, slug: target.slug },
            });
        }
    }

    if (plan.drops.length > 0) {
        await tx.tag.deleteMany({ where: { id: { in: plan.drops.map((d) => d.id) } } });
    }
}

/** Dry run by default; with write: true the whole cleanup runs in one transaction. */
export async function runTagCleanup(
    prisma: PrismaClient,
    options: { write: boolean },
): Promise<TagCleanupReport> {
    if (!options.write) {
        return describeTagCleanup(planTagCleanup(await loadTagRows(prisma)), 'dry-run');
    }
    return prisma.$transaction(
        async (tx) => {
            const plan = planTagCleanup(await loadTagRows(tx));
            await applyTagCleanup(tx, plan);
            return describeTagCleanup(plan, 'write');
        },
        { timeout: 300_000, maxWait: 10_000 },
    );
}

export function formatTagCleanupReport(report: TagCleanupReport): string {
    const lines = [
        `Modus: ${report.mode === 'write' ? 'SCHREIBEN' : 'Trockenlauf'}`,
        `Neu angelegt: ${report.created.length}`,
        `Umbenannt: ${report.renamed.length}`,
        `Zusammengeführt: ${report.merged.length} alte Tags (${report.merged.reduce((s, m) => s + m.recipes, 0)} Rezept-Zuordnungen, davon ${report.merged.reduce((s, m) => s + m.alreadyTagged, 0)} schon vorhanden)`,
        `Entfernt: ${report.dropped.length} Tags (${report.dropped.reduce((s, d) => s + d.recipes, 0)} Rezept-Zuordnungen)`,
        `Betroffene Rezepte: ${report.affectedRecipeIds.length}`,
        `Unbekannt (nicht angefasst): ${report.unknown.length}`,
    ];
    for (const r of report.renamed) {
        lines.push(`  umbenannt: ${r.from.name} (${r.from.slug}) -> ${r.to.name} (${r.to.slug})`);
    }
    for (const u of report.unknown) {
        lines.push(`  unbekannt: ${u.name} (${u.slug}, ${u.recipes} Rezepte)`);
    }
    const linked = report.dropped.filter((d) => d.filterSets > 0 || d.collections > 0);
    for (const d of linked) {
        lines.push(
            `  Achtung, entfernt mit Filter/Sammlung: ${d.name} (${d.filterSets} Filtersets, ${d.collections} Sammlungen)`,
        );
    }
    return lines.join('\n');
}
