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
 * Shares are overlap coefficients (common / smaller set). Title below this
 * share and catalogue ingredients too: the source page counts as a different
 * recipe (404 page, start page, other recipe served with HTTP 200) →
 * `mismatch`. Title below it but ingredients above: probably the same dish
 * renamed, but checked by hand → `review`.
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

/**
 * Basic ingredients nearly every savoury or sweet recipe has. They say little
 * about whether the source is still the same dish, so the ingredient
 * comparison leaves them out.
 */
const STAPLE_INGREDIENTS = new Set([
    'salz',
    'meersalz',
    'pfeffer',
    'schwarzer pfeffer',
    'salz und pfeffer',
    'zwiebel',
    'zwiebeln',
    'rote zwiebel',
    'knoblauch',
    'knoblauchzehe',
    'knoblauchzehen',
    'butter',
    'zucker',
    'brauner zucker',
    'puderzucker',
    'wasser',
    'mehl',
    'weizenmehl',
    'ei',
    'eier',
    'eigelb',
    'eiweiss',
    'milch',
    'backpulver',
    'natron',
    'bruehe',
    'gemuesebruehe',
]);

const foldName = (name: string) =>
    name
        .toLocaleLowerCase('de')
        .replace(/\(.*?\)|,.*$/g, '')
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        .replace(/\s+/g, ' ')
        .trim();

/** Salt, pepper, oil, onion, garlic, butter, sugar, water, flour, egg, milk and the like. */
export function isStapleIngredient(name: string): boolean {
    const folded = foldName(name);
    // Öl, Olivenöl, Rapsöl, Sonnenblumenöl …
    return STAPLE_INGREDIENTS.has(folded) || /(^|[a-z])oel$/.test(folded);
}

/** One ingredient row for the comparison: catalogue id (null = not in the catalogue yet) and name. */
export interface IngredientRef {
    id: string | null;
    name: string;
}

export interface SourceSimilarity {
    title: number;
    /** null when the stored recipe has no ingredients beyond basic ones to compare */
    ingredients: number | null;
}

export function sourceSimilarity(
    before: { title: string; ingredients: readonly IngredientRef[] },
    after: { title: string; ingredients: readonly IngredientRef[] },
): SourceSimilarity {
    const distinctive = (list: readonly IngredientRef[]) =>
        list.filter((ing) => !isStapleIngredient(ing.name));
    const oldIds = new Set(
        distinctive(before.ingredients)
            .map((ing) => ing.id)
            .filter((id) => id !== null),
    );
    return {
        title: overlap(titleStems(before.title), titleStems(after.title)),
        ingredients:
            oldIds.size === 0
                ? null
                : overlap(
                      oldIds,
                      // new catalogue entries (null) count as no match
                      new Set(distinctive(after.ingredients).map((ing, i) => ing.id ?? `new-${i}`)),
                  ),
    };
}

export type SourceVerdict = 'same' | 'review' | 'mismatch';

export function judgeSource(similarity: SourceSimilarity): SourceVerdict {
    if (similarity.title >= SOURCE_MATCH_THRESHOLD) return 'same';
    return similarity.ingredients !== null && similarity.ingredients >= SOURCE_MATCH_THRESHOLD
        ? 'review'
        : 'mismatch';
}

const pct = (x: number | null) => (x === null ? '–' : `${Math.round(x * 100)} %`);

/**
 * Checks ready proposals against the stored recipe: the similarity is kept
 * on the proposal; a different-looking title becomes `review`, a different
 * recipe `mismatch`.
 */
export function applySourceCheck(
    proposals: FullRefreshProposal[],
    before: ReadonlyMap<string, { title: string; ingredients: readonly IngredientRef[] }>,
    /** recipeId → the new ingredients with their catalogue match */
    newIngredients: ReadonlyMap<string, readonly IngredientRef[]>,
): FullRefreshProposal[] {
    return proposals.map((p) => {
        const old = before.get(p.recipeId);
        if (p.status !== 'ready' || !p.recipe || !old) return p;
        const similarity = sourceSimilarity(old, {
            title: p.recipe.title,
            ingredients: newIngredients.get(p.recipeId) ?? [],
        });
        const verdict = judgeSource(similarity);
        if (verdict === 'same') return { ...p, sourceCheck: similarity };
        const shares = `Titel ${pct(similarity.title)}, Zutaten ${pct(similarity.ingredients)} gemeinsam (ohne Grundzutaten, Schwelle ${pct(SOURCE_MATCH_THRESHOLD)})`;
        return {
            ...p,
            status: verdict,
            sourceCheck: similarity,
            warnings: [
                verdict === 'mismatch'
                    ? `Quelle passt nicht mehr: ${shares}`
                    : `Titel weicht ab, bitte prüfen: ${shares}`,
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
    /** Catalogue ingredients of the stored rows (source check) */
    ingredients: IngredientRef[];
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
    /** Source check of the fetch (ready, review, mismatch) */
    similarity: SourceSimilarity | null;
    notes: string[];
}

export interface FullReport {
    batchId: string;
    createdAt: string;
    summary: {
        recipes: number;
        ready: number;
        review: number;
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
                similarity: p.sourceCheck ?? null,
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
                similarity: null,
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
            review: count('review'),
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

/** review and mismatch cases, least similar title first. */
function sourceCheckSection(rows: FullReportRow[]): string[] {
    const flagged = rows
        .filter((r) => r.status === 'review' || r.status === 'mismatch')
        .sort((a, b) => (a.similarity?.title ?? 0) - (b.similarity?.title ?? 0));
    if (flagged.length === 0) return [];
    const threshold = pct(SOURCE_MATCH_THRESHOLD);
    return [
        `## Quelle prüfen (${flagged.length})`,
        '',
        `Titel-Wortstämme unter ${threshold} gemeinsam (Anteil an der kleineren Menge), sortiert nach Titel-Ähnlichkeit. review: die Zutaten (ohne Grundzutaten wie Salz, Öl, Zwiebel) passen noch zu ${threshold} oder mehr, apply schreibt sie nur mit --include-review. mismatch: auch die Zutaten passen nicht, apply schreibt sie nur mit --include-mismatch. Beide auch ausdrücklich per --ids.`,
        '',
        '| Rezept | Status | Titel | Zutaten | Titel alt → neu | Quelle |',
        '|---|---|---|---|---|---|',
        ...flagged.map(
            (r) =>
                `| ${r.recipeId} | ${r.status} | ${pct(r.similarity?.title ?? null)} | ${pct(r.similarity?.ingredients ?? null)} | ${cell(`${r.title.old} → ${r.title.new ?? '–'}`, 200)} | ${cell(r.source ?? '–', 120)} |`,
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
        `Rezepte: ${s.recipes} · bereit: ${s.ready} · prüfen: ${s.review} · Quelle passt nicht: ${s.mismatch} · ungültig: ${s.invalid} · fehlgeschlagen: ${s.failed} · erneut zu senden: ${s.repairable} · übersprungen: ${s.skipped} · Kosten ca. $${s.costUsd.toFixed(3)} (Batch-Preis)`,
        '',
        `Neu anzulegende Zutaten: ${s.newIngredients.length}${s.newIngredients.length ? ` — ${s.newIngredients.join(', ')}` : ''}`,
        '',
        ...sourceCheckSection(report.rows),
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
