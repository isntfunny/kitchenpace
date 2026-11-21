// src/lib/importer/openai-client.ts
// OpenAI calls of the recipe importer (KUC-115): one request with the G2M-1
// prompt, evaluation of the answer and exactly one repair round.

import OpenAI from 'openai';

import { AI_TEXT_MODEL, AI_TEXT_PRICING } from '@shared/ai-models';

import {
    buildImportRequestBody,
    buildRepairRequestBody,
    type ChatRequestBody,
    type ImportPromptContext,
} from './import-prompt';
import {
    acceptSoft,
    evaluateImportContent,
    formatDetails,
    type Evaluation,
} from './import-validation';
import type { ImportedRecipe } from './openai-recipe-schema';
import type { ImportRunMetadata, RecipeParseError, RecipeParseResult } from './types';

// ============================================================================
// Client
// ============================================================================

function createOpenAIClient(): OpenAI {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY ist nicht konfiguriert');
    }
    return new OpenAI({ apiKey, organization: process.env.OPENAI_ORG_ID });
}

let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
    if (!openaiClient) {
        openaiClient = createOpenAIClient();
    }
    return openaiClient;
}

// ============================================================================
// Cost
// ============================================================================

const PRICE_INPUT = AI_TEXT_PRICING.input / 1_000_000;
const PRICE_CACHED = AI_TEXT_PRICING.cachedInput / 1_000_000;
const PRICE_OUTPUT = AI_TEXT_PRICING.output / 1_000_000;

export function computeCost(
    inputTokens: number | null,
    cachedInputTokens: number | null,
    outputTokens: number | null,
): number | null {
    if (inputTokens == null || outputTokens == null) return null;
    const cached = cachedInputTokens ?? 0;
    return (
        (inputTokens - cached) * PRICE_INPUT + cached * PRICE_CACHED + outputTokens * PRICE_OUTPUT
    );
}

// ============================================================================
// Import with repair round
// ============================================================================

export interface ImportRecipeOptions {
    /** OpenAI model (default: AI_TEXT_MODEL) */
    model?: string;
    /** Fixed tag list and known ingredients for the context message */
    context?: ImportPromptContext;
    /** Called before the repair round with the problems sent back to the model */
    onRepair?: (problems: string[]) => void;
}

/** One model call: the answer text, its usage and the raw object for the audit log. */
export type ModelCall = (body: ChatRequestBody) => Promise<{
    content: string | null;
    usage: OpenAI.CompletionUsage | null | undefined;
    raw: unknown;
}>;

/**
 * Sends the request, evaluates the answer and, if it is not usable, sends it
 * back once with the problems. After the second answer, unknown mention ids
 * are accepted as warnings (they become plain text); everything else fails
 * with the validation details.
 */
export async function runImportWithRepair(
    body: ChatRequestBody,
    call: ModelCall,
    sourceUrl: string,
    onRepair?: (problems: string[]) => void,
): Promise<RecipeParseResult> {
    const usages: (OpenAI.CompletionUsage | null | undefined)[] = [];
    const raws: unknown[] = [];
    const metadata = (warnings: string[] = []): ImportRunMetadata | undefined => {
        if (raws.length === 0) return undefined;
        const sum = (pick: (u: OpenAI.CompletionUsage) => number | undefined) =>
            usages.every((u) => u && pick(u) != null)
                ? usages.reduce((total, u) => total + (pick(u!) ?? 0), 0)
                : null;
        const inputTokens = sum((u) => u.prompt_tokens);
        const cachedInputTokens = sum((u) => u.prompt_tokens_details?.cached_tokens ?? 0);
        const outputTokens = sum((u) => u.completion_tokens);
        return {
            model: body.model,
            sourceUrl,
            inputTokens,
            cachedInputTokens,
            outputTokens,
            estimatedCostUsd: computeCost(inputTokens, cachedInputTokens, outputTokens),
            rawApiResponse: { attempts: raws, warnings },
            attempts: raws.length,
            warnings,
        };
    };

    try {
        const first = await call(body);
        usages.push(first.usage);
        raws.push(first.raw);
        let evaluation: Evaluation<ImportedRecipe> = evaluateImportContent(first.content);

        if (!evaluation.ok) {
            const problems = formatDetails(evaluation.details);
            onRepair?.(problems);
            const second = await call(buildRepairRequestBody(body, first.content ?? '', problems));
            usages.push(second.usage);
            raws.push(second.raw);
            evaluation = acceptSoft(evaluateImportContent(second.content));
        }

        if (!evaluation.ok) {
            return {
                success: false,
                error: {
                    type: evaluation.errorType,
                    message: `${evaluation.message} (auch nach einer Korrekturrunde)`,
                    details: evaluation.details,
                },
                metadata: metadata(),
            };
        }
        return { success: true, data: evaluation.data, metadata: metadata(evaluation.warnings)! };
    } catch (error) {
        return { success: false, error: toParseError(error), metadata: metadata() };
    }
}

function toParseError(error: unknown): RecipeParseError {
    const apiError = error as { status?: number; code?: string; type?: string; message?: string };
    if (apiError?.status || apiError?.code) {
        return {
            type: 'OPENAI_API_ERROR',
            message: `OpenAI API Fehler: ${apiError.message ?? 'Unbekannter API Fehler'}`,
            details: { status: apiError.status, code: apiError.code, type: apiError.type },
        };
    }
    return {
        type: 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'Unbekannter Fehler',
    };
}

/** Error text for ImportRun.errorMessage: message plus validation details. */
export function describeParseError(error: RecipeParseError): string {
    if (!error.details) return error.message;
    const details = Array.isArray(error.details)
        ? error.details
              .map((d: { path?: string; message?: string }) =>
                  d.path ? `${d.path}: ${d.message}` : `${d.message}`,
              )
              .join('; ')
        : JSON.stringify(error.details);
    return `${error.message} — ${details}`;
}

/**
 * Imports a recipe from scraped markdown.
 */
export async function importRecipeFromMarkdown(
    markdown: string,
    sourceUrl: string,
    options: ImportRecipeOptions = {},
): Promise<RecipeParseResult> {
    const body = buildImportRequestBody({
        markdown,
        sourceUrl,
        context: options.context,
        model: options.model ?? AI_TEXT_MODEL,
    });
    const call: ModelCall = async (request) => {
        const completion = await getOpenAIClient().chat.completions.create(request);
        return {
            content: completion.choices[0]?.message?.content ?? null,
            usage: completion.usage,
            raw: completion,
        };
    };
    return runImportWithRepair(body, call, sourceUrl, options.onRepair);
}

/**
 * Same as importRecipeFromMarkdown, but streams the answer token by token
 * (both attempts). onDelta receives each raw text fragment.
 */
export async function streamRecipeFromMarkdown(
    markdown: string,
    sourceUrl: string,
    options: ImportRecipeOptions = {},
    onDelta: (text: string) => void,
): Promise<RecipeParseResult> {
    const body = buildImportRequestBody({
        markdown,
        sourceUrl,
        context: options.context,
        model: options.model ?? AI_TEXT_MODEL,
    });
    const call: ModelCall = async (request) => {
        const stream = await getOpenAIClient().chat.completions.create({
            ...request,
            stream: true,
            stream_options: { include_usage: true },
        });
        let content = '';
        let usage: OpenAI.CompletionUsage | undefined;
        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
                content += delta;
                onDelta(delta);
            }
            if (chunk.usage) usage = chunk.usage;
        }
        return { content, usage, raw: { content, usage } };
    };
    return runImportWithRepair(body, call, sourceUrl, options.onRepair);
}
