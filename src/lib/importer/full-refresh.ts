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
import {
    BATCH_RUNNING_STATUSES,
    chatCompletionContent,
    type BatchOutputEntry,
} from '@shared/openai-batch';

import { importedFlowProblems } from './import-flow-binding';
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

/**
 * Why a batch cannot be evaluated yet, or null. Finished batches are
 * evaluated even when expired, cancelled or failed, as long as they have an
 * output or error file: requests without an answer count as failed.
 */
export function batchNotEvaluable(batch: {
    status: string;
    output_file_id?: string | null;
    error_file_id?: string | null;
}): string | null {
    if (BATCH_RUNNING_STATUSES.includes(batch.status)) return `läuft noch (${batch.status})`;
    if (batch.status === 'completed' || batch.output_file_id || batch.error_file_id) return null;
    return `endete mit ${batch.status} ohne Ausgabedatei`;
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

/**
 * ready: can be written; mismatch: valid, but the source page seems to be a
 * different recipe now (written only on request); invalid / failed: no usable
 * answer (candidates for the second attempt).
 */
export type FullRefreshStatus = 'ready' | 'mismatch' | 'invalid' | 'failed';

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
    // The save binds mentions to rows and rejects what does not resolve: check
    // that now with placeholder ids, so the repair round can still fix it.
    const flowProblems = importedFlowProblems(recipe);
    if (flowProblems.length > 0)
        return {
            ...base,
            status: 'invalid',
            warnings: [],
            errors: [
                `Zutaten-Erwähnungen lassen sich nicht speichern: ${flowProblems.length} Problem(e)`,
                ...flowProblems,
            ],
            usage,
            ...(content ? { content } : {}),
        };
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
 * Second and last attempt. An invalid answer goes back with its problems
 * (same body as the direct import's repair round); a request that failed or
 * got no answer (API error, missing line) is sent again unchanged.
 */
export function buildFullRepairRequest(
    request: FullRefreshRequest,
    body: ChatRequestBody,
    proposal: FullRefreshProposal,
): { request: FullRefreshRequest; body: ChatRequestBody } {
    const problems = proposal.errors.slice(1);
    return {
        body:
            proposal.status === 'invalid' && proposal.content
                ? buildRepairRequestBody(
                      body,
                      proposal.content,
                      problems.length > 0 ? problems : proposal.errors,
                  )
                : body,
        request: { ...request, customId: fullCustomIdFor(request.recipeId, 2), attempt: 2 },
    };
}

/**
 * Candidates for the second attempt (at most one per recipe): invalid first
 * answers with text, and first requests that failed or got no answer.
 */
export function repairCandidates(proposals: FullRefreshProposal[]): FullRefreshProposal[] {
    return proposals.filter(
        (p) =>
            p.attempt === 1 &&
            ((p.status === 'invalid' && p.content !== undefined) || p.status === 'failed'),
    );
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

/**
 * Proposals apply writes: ready ones, plus mismatches when asked for with
 * --include-mismatch or by naming them in --ids. --ids limits either way.
 */
export function writableProposals(
    proposals: FullRefreshProposal[],
    opts: { ids?: string[]; includeMismatch?: boolean },
): FullRefreshProposal[] {
    const only = opts.ids?.length ? new Set(opts.ids) : null;
    return proposals.filter((p) => {
        if (!p.recipe || (only && !only.has(p.recipeId))) return false;
        if (p.status === 'ready') return true;
        return p.status === 'mismatch' && (opts.includeMismatch === true || only !== null);
    });
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
