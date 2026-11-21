/**
 * Dry run of the full re-import (KUC-115): does the source page still show
 * the same recipe, and the report per recipe. Pure; the CLI does the I/O.
 */

import { findListedTag, pickListedTags } from '@shared/tags/tag-list';

import {
    batchCostUsd,
    repairCandidates,
    type FullRefreshProposal,
    type FullRefreshSkip,
    type FullRefreshStatus,
} from './full-refresh';

// ─────────────────────────────────────────────────────────────────────────────
// Is the source still the same recipe?
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Below this share for BOTH title stems and catalogue ingredients the source
 * page counts as a different recipe (404 page, start page, other recipe
 * served with HTTP 200). Shares are overlap coefficients: common / smaller set.
 */
export const SOURCE_MATCH_THRESHOLD = 0.3;

const TITLE_STOPWORDS = new Set([
    'und',
    'mit',
    'der',
    'die',
    'das',
    'den',
    'dem',
    'des',
    'ein',
    'eine',
    'einer',
    'von',
    'vom',
    'aus',
    'auf',
    'für',
    'nach',
    'art',
    'zum',
    'zur',
    'im',
    'in',
    'an',
    'oder',
    'ohne',
    'wie',
    'rezept',
    'einfach',
    'schnell',
    'beste',
    'klassisch',
]);

/** Rough German word stems of a title: lower case, umlauts folded, first 5 letters. */
export function titleStems(title: string): Set<string> {
    const folded = title
        .toLocaleLowerCase('de')
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss');
    return new Set(
        folded
            .split(/[^a-z0-9]+/)
            .filter(
                (word) =>
                    word.length >= 3 &&
                    !TITLE_STOPWORDS.has(word) &&
                    !TITLE_STOPWORDS.has(word.replace(/(e|es|en|er|em|s)$/, '')),
            )
            .map((word) => word.slice(0, 5)),
    );
}

const overlap = (a: ReadonlySet<string>, b: ReadonlySet<string>): number => {
    if (a.size === 0 || b.size === 0) return 0;
    let common = 0;
    for (const value of a) if (b.has(value)) common++;
    return common / Math.min(a.size, b.size);
};

export interface SourceSimilarity {
    title: number;
    /** null when the stored recipe has no ingredients to compare */
    ingredients: number | null;
}

export function sourceSimilarity(
    before: { title: string; ingredientIds: readonly string[] },
    after: { title: string; ingredientIds: readonly (string | null)[] },
): SourceSimilarity {
    const oldIds = new Set(before.ingredientIds);
    return {
        title: overlap(titleStems(before.title), titleStems(after.title)),
        ingredients:
            oldIds.size === 0
                ? null
                : overlap(
                      oldIds,
                      // new catalogue entries (null) count as no match
                      new Set(after.ingredientIds.map((id, i) => id ?? `new-${i}`)),
                  ),
    };
}

export function isSourceMismatch(similarity: SourceSimilarity): boolean {
    return (
        similarity.title < SOURCE_MATCH_THRESHOLD &&
        (similarity.ingredients === null || similarity.ingredients < SOURCE_MATCH_THRESHOLD)
    );
}

/** Marks ready proposals whose source no longer matches the stored recipe. */
export function applySourceCheck(
    proposals: FullRefreshProposal[],
    before: ReadonlyMap<string, { title: string; ingredientIds: readonly string[] }>,
    /** recipeId → catalogue id per new ingredient (null: not in the catalogue yet) */
    newIngredientIds: ReadonlyMap<string, readonly (string | null)[]>,
): FullRefreshProposal[] {
    return proposals.map((p) => {
        const old = before.get(p.recipeId);
        if (p.status !== 'ready' || !p.recipe || !old) return p;
        const similarity = sourceSimilarity(old, {
            title: p.recipe.title,
            ingredientIds: newIngredientIds.get(p.recipeId) ?? [],
        });
        if (!isSourceMismatch(similarity)) return p;
        const pct = (x: number | null) => (x === null ? '–' : `${Math.round(x * 100)} %`);
        return {
            ...p,
            status: 'mismatch',
            warnings: [
                `Quelle passt nicht mehr: Titel ${pct(similarity.title)}, Zutaten ${pct(similarity.ingredients)} gemeinsam (Schwelle ${pct(SOURCE_MATCH_THRESHOLD)})`,
                ...p.warnings,
            ],
        };
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Dry-run report
// ─────────────────────────────────────────────────────────────────────────────

export interface CurrentRecipeSummary {
    title: string;
    ingredientCount: number;
    /** Catalogue ids of the stored ingredient rows (source check) */
    ingredientIds: string[];
    nodeCount: number;
    tags: string[];
}

export interface FullReportRow {
    recipeId: string;
    status: FullRefreshStatus | 'skipped';
    source: string | null;
    title: { old: string; new: string | null };
    ingredients: { old: number | null; new: number | null };
    nodes: { old: number | null; new: number | null };
    tags: { old: string[]; new: string[] };
    /** Ingredient names the apply would add to the catalogue */
    newIngredients: string[];
    notes: string[];
}

export interface FullReport {
    batchId: string;
    createdAt: string;
    summary: {
        recipes: number;
        ready: number;
        mismatch: number;
        invalid: number;
        failed: number;
        skipped: number;
        repairable: number;
        costUsd: number;
        /** Distinct catalogue ingredients the apply would create */
        newIngredients: string[];
    };
    rows: FullReportRow[];
}

export function buildFullReport(input: {
    batchId: string;
    proposals: FullRefreshProposal[];
    skipped: FullRefreshSkip[];
    current: ReadonlyMap<string, CurrentRecipeSummary>;
    /** recipeId → canonical names of ingredients not yet in the catalogue */
    newIngredients: ReadonlyMap<string, string[]>;
    now?: Date;
}): FullReport {
    const rows: FullReportRow[] = [
        ...input.proposals.map((p): FullReportRow => {
            const before = input.current.get(p.recipeId);
            // Tags as the save keeps them: only the fixed list (KUC-116)
            const aiTags = p.recipe?.tags ?? [];
            const listed = pickListedTags(aiTags).map((t) => t.name);
            const dropped = aiTags.filter((name) => !findListedTag(name));
            return {
                recipeId: p.recipeId,
                status: p.status,
                source: p.sourceUrl,
                title: { old: before?.title ?? p.title, new: p.recipe?.title ?? null },
                ingredients: {
                    old: before?.ingredientCount ?? null,
                    new: p.recipe?.ingredients.length ?? null,
                },
                nodes: { old: before?.nodeCount ?? null, new: p.recipe?.flowNodes.length ?? null },
                tags: { old: before?.tags ?? [], new: listed },
                newIngredients: input.newIngredients.get(p.recipeId) ?? [],
                notes: [
                    ...p.errors,
                    ...p.warnings,
                    ...(dropped.length
                        ? [`Tags verworfen (nicht in der Liste): ${dropped.join(', ')}`]
                        : []),
                ],
            };
        }),
        ...input.skipped.map(
            (s): FullReportRow => ({
                recipeId: s.recipeId,
                status: 'skipped',
                source: s.sourceUrl,
                title: { old: s.title, new: null },
                ingredients: {
                    old: input.current.get(s.recipeId)?.ingredientCount ?? null,
                    new: null,
                },
                nodes: { old: input.current.get(s.recipeId)?.nodeCount ?? null, new: null },
                tags: { old: input.current.get(s.recipeId)?.tags ?? [], new: [] },
                newIngredients: [],
                notes: [s.reason],
            }),
        ),
    ];
    const count = (status: FullReportRow['status']) =>
        rows.filter((r) => r.status === status).length;
    const distinct = new Map<string, string>();
    for (const names of input.newIngredients.values())
        for (const name of names) distinct.set(name.toLowerCase(), name);
    return {
        batchId: input.batchId,
        createdAt: (input.now ?? new Date()).toISOString(),
        summary: {
            recipes: rows.length,
            ready: count('ready'),
            mismatch: count('mismatch'),
            invalid: count('invalid'),
            failed: count('failed'),
            skipped: count('skipped'),
            repairable: repairCandidates(input.proposals).length,
            costUsd: batchCostUsd(input.proposals.map((p) => p.usage)),
            newIngredients: [...distinct.values()].sort((a, b) => a.localeCompare(b, 'de')),
        },
        rows,
    };
}

const cell = (text: string, max = 300) =>
    text
        .replace(/\|/g, '/')
        .replace(/\s*\n\s*/g, ' ')
        .slice(0, max);

function mismatchSection(rows: FullReportRow[]): string[] {
    const mismatches = rows.filter((r) => r.status === 'mismatch');
    if (mismatches.length === 0) return [];
    return [
        `## Quelle passt nicht mehr (${mismatches.length})`,
        '',
        `Titel-Wortstämme und Katalog-Zutaten haben beide weniger als ${Math.round(SOURCE_MATCH_THRESHOLD * 100)} % gemeinsam (Anteil an der kleineren Menge). Diese Rezepte schreibt apply nur mit --include-mismatch oder ausdrücklich per --ids.`,
        '',
        '| Rezept | Quelle | Titel alt → neu | Hinweis |',
        '|---|---|---|---|',
        ...mismatches.map(
            (r) =>
                `| ${r.recipeId} | ${cell(r.source ?? '–', 120)} | ${cell(`${r.title.old} → ${r.title.new ?? '–'}`, 200)} | ${cell(r.notes[0] ?? '')} |`,
        ),
        '',
        '## Alle Rezepte',
        '',
    ];
}

export function renderFullReportMarkdown(report: FullReport): string {
    const s = report.summary;
    const lines = [
        `# Voll-Neuimport Trockenlauf (Batch ${report.batchId})`,
        '',
        `Rezepte: ${s.recipes} · bereit: ${s.ready} · Quelle passt nicht: ${s.mismatch} · ungültig: ${s.invalid} · fehlgeschlagen: ${s.failed} · erneut zu senden: ${s.repairable} · übersprungen: ${s.skipped} · Kosten ca. $${s.costUsd.toFixed(3)} (Batch-Preis)`,
        '',
        `Neu anzulegende Zutaten: ${s.newIngredients.length}${s.newIngredients.length ? ` — ${s.newIngredients.join(', ')}` : ''}`,
        '',
        ...mismatchSection(report.rows),
        '| Rezept | Status | Quelle | Titel alt → neu | Zutaten alt → neu | Knoten alt → neu | Tags neu | Neue Zutaten | Hinweise |',
        '|---|---|---|---|---|---|---|---|---|',
        ...report.rows.map((r) => {
            const arrow = (a: number | string | null, b: number | string | null) =>
                `${a ?? '–'} → ${b ?? '–'}`;
            return `| ${r.recipeId} | ${r.status} | ${cell(r.source ?? '–', 120)} | ${cell(arrow(r.title.old, r.title.new), 200)} | ${arrow(r.ingredients.old, r.ingredients.new)} | ${arrow(r.nodes.old, r.nodes.new)} | ${cell(r.tags.new.join(', '))} | ${cell(r.newIngredients.join(', '))} | ${cell(r.notes.join('; '))} |`;
        }),
    ];
    return `${lines.join('\n')}\n`;
}
