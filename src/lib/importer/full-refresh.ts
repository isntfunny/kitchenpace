/**
 * Full re-import of imported recipes via the OpenAI Batch API (KUC-115).
 *
 * Every selected recipe is rebuilt from its source page as if it were imported
 * by URL today: same prompt, same context, same evaluation and transform as
 * the direct import. Only id and slug (plus what users added) stay; the write
 * itself is `replaceImportedRecipe` in pipeline.ts. The repair round of the
 * direct import becomes a second batch with the invalid answers.
 *
 * No database access here; the CLI (scripts/refresh-recipe-flows.ts) does the I/O.
 */

import { AI_TEXT_MODEL, AI_TEXT_PRICING } from '@shared/ai-models';
import { chatCompletionContent, type BatchOutputEntry } from '@shared/openai-batch';
import { findListedTag, pickListedTags } from '@shared/tags/tag-list';

import {
    buildImportRequestBody,
    buildRepairRequestBody,
    type ChatRequestBody,
    type ImportPromptContext,
} from './import-prompt';
import { acceptSoft, evaluateImportContent, formatDetails } from './import-validation';
import { type AnalyzedRecipe, transformImportedRecipe } from './transform';

/** Below this the scraped page is treated as failed (blocked, cookie wall, …). */
export const MIN_SOURCE_MARKDOWN = 300;

/** Role of the accounts whose imports are refreshed (User.role is a plain string). */
export const FULL_REFRESH_AUTHOR_ROLE = 'admin';

/**
 * Selection: every recipe with a source URL whose author is an admin. Edits
 * since the import and updatedAt do not matter (decision of 21.11.).
 */
export function fullRefreshWhere(opts: { ids?: string[] }) {
    return {
        sourceUrl: { not: null },
        NOT: { sourceUrl: '' },
        author: { role: FULL_REFRESH_AUTHOR_ROLE },
        ...(opts.ids?.length ? { id: { in: opts.ids } } : {}),
    };
}

export interface TokenUsage {
    input: number;
    cached: number;
    output: number;
}

/** Token usage of a chat completion body from a batch output line. */
export function batchUsage(body: unknown): TokenUsage | undefined {
    const raw = (
        body as {
            usage?: {
                prompt_tokens?: number;
                completion_tokens?: number;
                prompt_tokens_details?: { cached_tokens?: number };
            };
        }
    )?.usage;
    if (!raw) return undefined;
    return {
        input: raw.prompt_tokens ?? 0,
        cached: raw.prompt_tokens_details?.cached_tokens ?? 0,
        output: raw.completion_tokens ?? 0,
    };
}

const addUsage = (a?: TokenUsage, b?: TokenUsage): TokenUsage | undefined =>
    a && b
        ? { input: a.input + b.input, cached: a.cached + b.cached, output: a.output + b.output }
        : (a ?? b);

/** Cost in USD at Batch price (half the direct price). */
export function batchCostUsd(usages: (TokenUsage | undefined)[]): number {
    return usages.reduce((sum, usage) => {
        if (!usage) return sum;
        const { input, cached, output } = usage;
        return (
            sum +
            ((input - cached) * AI_TEXT_PRICING.input +
                cached * AI_TEXT_PRICING.cachedInput +
                output * AI_TEXT_PRICING.output) /
                2 /
                1e6
        );
    }, 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Requests
// ─────────────────────────────────────────────────────────────────────────────

export interface FullRefreshRequest {
    customId: string;
    recipeId: string;
    /** Title before the refresh */
    title: string;
    sourceUrl: string;
    /** Image the scraper found; used when the AI names none (like analyzeWithAI) */
    scrapedImageUrl?: string;
    markdownLength: number;
    /** 1 = first answer, 2 = repair round */
    attempt: 1 | 2;
}

/** A recipe left out before the batch (scrape failed or page too short). */
export interface FullRefreshSkip {
    recipeId: string;
    title: string;
    sourceUrl: string | null;
    reason: string;
}

export function fullCustomIdFor(recipeId: string, attempt: 1 | 2 = 1): string {
    return attempt === 1 ? `full-${recipeId}` : `full-${recipeId}-repair`;
}

/**
 * Whether a scraped page is usable as import source; otherwise the reason.
 * A failed scrape is never replaced by the stored recipe (decision of 21.11.).
 */
export function checkScrapedSource(markdown: string | undefined): string | null {
    const length = markdown?.trim().length ?? 0;
    if (length < MIN_SOURCE_MARKDOWN) return `Seite zu kurz (${length} Zeichen)`;
    return null;
}

/** Request body exactly like the URL import, plus the state to evaluate the answer. */
export function buildFullRefreshRequest(
    recipe: { id: string; title: string; sourceUrl: string },
    scraped: { markdown: string; imageUrl?: string },
    context: ImportPromptContext,
    model: string = AI_TEXT_MODEL,
): { request: FullRefreshRequest; body: ChatRequestBody } {
    return {
        body: buildImportRequestBody({
            markdown: scraped.markdown,
            sourceUrl: recipe.sourceUrl,
            context,
            model,
        }),
        request: {
            customId: fullCustomIdFor(recipe.id),
            recipeId: recipe.id,
            title: recipe.title,
            sourceUrl: recipe.sourceUrl,
            ...(scraped.imageUrl ? { scrapedImageUrl: scraped.imageUrl } : {}),
            markdownLength: scraped.markdown.length,
            attempt: 1,
        },
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Evaluation
// ─────────────────────────────────────────────────────────────────────────────

export type FullRefreshStatus = 'ready' | 'invalid' | 'failed';

export interface FullRefreshProposal {
    recipeId: string;
    /** Title before the refresh */
    title: string;
    sourceUrl: string;
    status: FullRefreshStatus;
    attempt: 1 | 2;
    /** The recipe as the import would save it (status 'ready') */
    recipe?: AnalyzedRecipe;
    warnings: string[];
    errors: string[];
    /** Usage of all attempts so far */
    usage?: TokenUsage;
    /** Answer text of an invalid attempt, for the repair round */
    content?: string;
}

/**
 * Judges one batch answer like the direct import: strict on the first
 * attempt (every problem is a reason for the repair round), soft problems
 * accepted as warnings on the second.
 */
export function evaluateFullRefreshEntry(
    request: FullRefreshRequest,
    entry: BatchOutputEntry | undefined,
): FullRefreshProposal {
    const base = {
        recipeId: request.recipeId,
        title: request.title,
        sourceUrl: request.sourceUrl,
        attempt: request.attempt,
    };
    if (!entry)
        return { ...base, status: 'failed', warnings: [], errors: ['keine Antwort im Batch'] };
    if (entry.error || entry.body === undefined)
        return {
            ...base,
            status: 'failed',
            warnings: [],
            errors: [entry.error ?? 'leere Antwort'],
        };

    const usage = batchUsage(entry.body);
    const content = chatCompletionContent(entry.body);
    const first = evaluateImportContent(content);
    const evaluation = request.attempt === 2 ? acceptSoft(first) : first;
    if (!evaluation.ok)
        return {
            ...base,
            status: 'invalid',
            warnings: [],
            errors: [evaluation.message, ...formatDetails(evaluation.details)],
            usage,
            ...(content ? { content } : {}),
        };

    const transformed = transformImportedRecipe(evaluation.data);
    const { warnings: transformWarnings = [], ...recipe } = transformed;
    return {
        ...base,
        status: 'ready',
        recipe: {
            ...recipe,
            sourceUrl: request.sourceUrl,
            imageUrl: recipe.imageUrl || request.scrapedImageUrl || undefined,
        },
        warnings: [...evaluation.warnings, ...transformWarnings],
        errors: [],
        usage,
    };
}

/**
 * Repair round: the first request, the invalid answer and its problems go
 * back to the model once (same body as the direct import's repair).
 */
export function buildFullRepairRequest(
    request: FullRefreshRequest,
    body: ChatRequestBody,
    proposal: FullRefreshProposal,
): { request: FullRefreshRequest; body: ChatRequestBody } {
    const problems = proposal.errors.slice(1);
    return {
        body: buildRepairRequestBody(
            body,
            proposal.content ?? '',
            problems.length > 0 ? problems : proposal.errors,
        ),
        request: { ...request, customId: fullCustomIdFor(request.recipeId, 2), attempt: 2 },
    };
}

/** Invalid first answers with text: the candidates for the repair round. */
export function repairCandidates(proposals: FullRefreshProposal[]): FullRefreshProposal[] {
    return proposals.filter((p) => p.status === 'invalid' && p.attempt === 1 && p.content);
}

/**
 * Proposals after the repair round: repaired recipes replace their first
 * answer, the usage of both attempts is summed for the cost.
 */
export function mergeRepairProposals(
    previous: FullRefreshProposal[],
    repaired: FullRefreshProposal[],
): FullRefreshProposal[] {
    const byId = new Map(repaired.map((p) => [p.recipeId, p]));
    return previous.map((p) => {
        const next = byId.get(p.recipeId);
        return next ? { ...next, usage: addUsage(p.usage, next.usage) } : p;
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Dry-run report
// ─────────────────────────────────────────────────────────────────────────────

export interface CurrentRecipeSummary {
    title: string;
    ingredientCount: number;
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

export function renderFullReportMarkdown(report: FullReport): string {
    const s = report.summary;
    const lines = [
        `# Voll-Neuimport Trockenlauf (Batch ${report.batchId})`,
        '',
        `Rezepte: ${s.recipes} · bereit: ${s.ready} · ungültig: ${s.invalid} (davon reparierbar: ${s.repairable}) · fehlgeschlagen: ${s.failed} · übersprungen: ${s.skipped} · Kosten ca. $${s.costUsd.toFixed(3)} (Batch-Preis)`,
        '',
        `Neu anzulegende Zutaten: ${s.newIngredients.length}${s.newIngredients.length ? ` — ${s.newIngredients.join(', ')}` : ''}`,
        '',
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

// ─────────────────────────────────────────────────────────────────────────────
// Backup (full)
// ─────────────────────────────────────────────────────────────────────────────

/** Recipe columns the full refresh overwrites, as stored before it. */
export interface FullBackupRecipeFields {
    title: string;
    description: string | null;
    servings: number;
    prepTime: number;
    cookTime: number;
    totalTime: number;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    imageKey: string | null;
    flowNodes: unknown;
    flowEdges: unknown;
    caloriesPerServing: number | null;
    proteinPerServing: number | null;
    fatPerServing: number | null;
    carbsPerServing: number | null;
    fiberPerServing: number | null;
    nutritionCompleteness: number | null;
}

export interface FullBackupEntry {
    id: string;
    recipe: FullBackupRecipeFields;
    recipeIngredients: {
        id: string;
        sourceId: string | null;
        ingredientId: string;
        unitId: string;
        amount: string;
        notes: string | null;
        position: number;
        isOptional: boolean;
    }[];
    recipeTags: { tagId: string; createdAt: string }[];
    recipeCategories: { categoryId: string; position: number }[];
}

export interface FullBackup {
    kind: 'full';
    createdAt: string;
    recipes: FullBackupEntry[];
}

export function isFullBackup(value: unknown): value is FullBackup {
    return (
        typeof value === 'object' &&
        value !== null &&
        (value as { kind?: unknown }).kind === 'full' &&
        Array.isArray((value as { recipes?: unknown }).recipes)
    );
}
