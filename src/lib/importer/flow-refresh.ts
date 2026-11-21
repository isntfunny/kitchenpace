/**
 * Flow-only refresh of imported recipes via the OpenAI Batch API (KUC-115).
 *
 * Only the flow is rebuilt; the recipe's ingredient list stays as it is. The
 * prompt gets the ingredients with temporary ids ("ingredient-N"), the answer
 * is judged by the same evaluation as the import and the ids are mapped back
 * to the real RecipeIngredient ids. No database access here; the CLI
 * (scripts/refresh-recipe-flows.ts) does the I/O.
 */

import { AI_TEXT_MODEL } from '@shared/ai-models';
import { chatCompletionContent, type BatchOutputEntry } from '@shared/openai-batch';

import { applyFlowPositions } from '../flow-layout';

import { bindMentions, parseMentions } from './import-mentions';
import {
    buildFlowOnlyRequestBody,
    type ChatRequestBody,
    type PromptIngredient,
} from './import-prompt';
import { acceptSoft, evaluateFlowOnlyContent, formatDetails } from './import-validation';
import { toFlowEdges } from './transform';

export interface RefreshIngredientRow {
    /** RecipeIngredient.id */
    id: string;
    name: string;
    amount: string;
    unit: string | null;
    notes: string | null;
}

export interface StoredFlowNode {
    id: string;
    type: string;
    label?: string;
    description?: string;
    duration?: number;
    ingredientIds?: string[];
    position?: { x: number; y: number };
    [key: string]: unknown;
}

export interface StoredFlowEdge {
    id: string;
    source: string;
    target: string;
}

export interface RefreshRecipe {
    id: string;
    title: string;
    description: string | null;
    sourceUrl: string | null;
    ingredients: RefreshIngredientRow[];
    flowNodes: StoredFlowNode[];
}

/** One planned request: what the CLI keeps in its state file to evaluate the answer later. */
export interface RefreshRequest {
    customId: string;
    recipeId: string;
    title: string;
    source: 'scrape' | 'fallback';
    /** Why the fallback was used */
    sourceNote?: string;
    /** temporary id → RecipeIngredient.id */
    idMap: Record<string, string>;
    /** ingredient list as sent to the model, for the mention check */
    ingredients: { id: string; name: string }[];
}

export function customIdFor(recipeId: string): string {
    return `flow-${recipeId}`;
}

/** Ingredient rows with temporary ids for the prompt. */
export function promptIngredients(rows: RefreshIngredientRow[]): {
    list: PromptIngredient[];
    idMap: Record<string, string>;
} {
    const list = rows.map((row, index) => ({
        id: `ingredient-${index}`,
        name: row.name,
        amount: row.amount || null,
        unit: row.unit,
        notes: row.notes,
    }));
    return {
        list,
        idMap: Object.fromEntries(list.map((ing, index) => [ing.id, rows[index].id])),
    };
}

const plainText = (description: string) =>
    parseMentions(description).reduce(
        (text, m) => text.replace(m.full, m.part ? `${m.text} (${m.part})` : m.text),
        description,
    );

/**
 * Stand-in when the source page cannot be scraped any more: the recipe as
 * stored today (title, description, ingredient list, previous flow as steps).
 */
export function fallbackMarkdown(recipe: RefreshRecipe): string {
    const ingredients = recipe.ingredients
        .map((row) => {
            const head = [row.amount, row.unit, row.name].filter((x) => x?.trim()).join(' ');
            return `- ${head}${row.notes ? ` (${row.notes})` : ''}`;
        })
        .join('\n');
    const steps = recipe.flowNodes
        .filter((node) => node.description?.trim() || node.label?.trim())
        .map((node, index) => {
            const duration = node.duration ? ` (${node.duration} Minuten)` : '';
            return `${index + 1}. ${node.label ?? ''}${duration}: ${plainText(node.description ?? '')}`;
        })
        .join('\n');
    return `# ${recipe.title}\n\n${recipe.description ?? ''}\n\n## Zutaten\n${ingredients}\n\n## Zubereitung\nDie Schritte stammen aus dem bisherigen Ablauf der App, nicht aus der Originalseite.\n${steps}\n`;
}

/** Request body (same builder as a direct call) and the state needed to evaluate the answer. */
export function buildRefreshRequest(
    recipe: RefreshRecipe,
    markdown: string,
    source: 'scrape' | 'fallback',
    sourceNote?: string,
    model: string = AI_TEXT_MODEL,
): { request: RefreshRequest; body: ChatRequestBody } {
    const { list, idMap } = promptIngredients(recipe.ingredients);
    return {
        body: buildFlowOnlyRequestBody({ markdown, ingredients: list, model }),
        request: {
            customId: customIdFor(recipe.id),
            recipeId: recipe.id,
            title: recipe.title,
            source,
            ...(sourceNote ? { sourceNote } : {}),
            idMap,
            ingredients: list.map((ing) => ({ id: ing.id, name: ing.name })),
        },
    };
}

export type RefreshStatus = 'changed' | 'unchanged' | 'invalid' | 'failed';

export interface RefreshProposal {
    recipeId: string;
    title: string;
    source: 'scrape' | 'fallback';
    status: RefreshStatus;
    /** RecipeIngredient ids the model was given (values of the request's idMap) */
    ingredientRowIds: string[];
    flowNodes?: StoredFlowNode[];
    flowEdges?: StoredFlowEdge[];
    warnings: string[];
    errors: string[];
    usage?: { input: number; cached: number; output: number };
}

const comparable = (nodes: StoredFlowNode[], edges: { source: string; target: string }[]) =>
    JSON.stringify({
        nodes: nodes.map(({ position: _position, ...rest }) => rest),
        edges: edges.map((e) => [e.source, e.target]),
    });

/**
 * Judges one batch answer like the import does and turns it into stored
 * nodes/edges with real ingredient ids and Dagre positions.
 */
export function evaluateRefreshEntry(
    request: RefreshRequest,
    entry: BatchOutputEntry | undefined,
    current: { flowNodes: StoredFlowNode[]; flowEdges: StoredFlowEdge[] } | null,
): RefreshProposal {
    const base = {
        recipeId: request.recipeId,
        title: request.title,
        source: request.source,
        ingredientRowIds: Object.values(request.idMap),
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

    const usageRaw = (
        entry.body as {
            usage?: {
                prompt_tokens?: number;
                completion_tokens?: number;
                prompt_tokens_details?: { cached_tokens?: number };
            };
        }
    ).usage;
    const usage = usageRaw
        ? {
              input: usageRaw.prompt_tokens ?? 0,
              cached: usageRaw.prompt_tokens_details?.cached_tokens ?? 0,
              output: usageRaw.completion_tokens ?? 0,
          }
        : undefined;

    const evaluation = acceptSoft(
        evaluateFlowOnlyContent(chatCompletionContent(entry.body), request.ingredients),
    );
    if (!evaluation.ok)
        return {
            ...base,
            status: 'invalid',
            warnings: [],
            errors: [evaluation.message, ...formatDetails(evaluation.details)],
            usage,
        };

    const bound = bindMentions(
        evaluation.data.nodes.map((node) => ({
            id: node.id,
            type: node.type,
            label: node.label,
            description: node.description,
            ...(node.duration != null ? { duration: node.duration } : {}),
        })),
        new Map(Object.entries(request.idMap)),
        { unknown: 'text' },
    );
    const flowEdges = toFlowEdges(evaluation.data.edges);
    const flowNodes = applyFlowPositions(bound.nodes, flowEdges);
    const unchanged =
        current !== null &&
        comparable(current.flowNodes, current.flowEdges) === comparable(flowNodes, flowEdges);
    return {
        ...base,
        status: unchanged ? 'unchanged' : 'changed',
        flowNodes,
        flowEdges,
        warnings: [...evaluation.warnings, ...bound.warnings],
        errors: [],
        usage,
    };
}

/**
 * Ingredient rows that changed since the batch was built: rows the proposal
 * refers to or was given that the recipe no longer has, and rows added to the
 * recipe since then (the new flow would never mention them). Any entry means
 * the proposal is stale and must not be written.
 */
export function staleIngredientRefs(
    proposal: RefreshProposal,
    rowIds: ReadonlySet<string>,
): string[] {
    const given = new Set(proposal.ingredientRowIds);
    const refs = (proposal.flowNodes ?? []).flatMap((node) => node.ingredientIds ?? []);
    const removed = [...new Set([...given, ...refs])].filter((id) => !rowIds.has(id));
    const added = [...rowIds].filter((id) => !given.has(id));
    return [...removed, ...added];
}

export interface FlowBackupEntry {
    id: string;
    flowNodes: unknown;
    flowEdges: unknown;
}

/**
 * Writes the backed-up flows back one recipe at a time. A failing recipe does
 * not stop the others; the failures are returned for the report. `null` stays
 * `null` (recipes that had no flow); the caller maps it to a database NULL.
 */
export async function restoreFlowBackup(
    recipes: FlowBackupEntry[],
    write: (entry: FlowBackupEntry) => Promise<unknown>,
): Promise<{ restored: string[]; failed: { id: string; error: string }[] }> {
    const restored: string[] = [];
    const failed: { id: string; error: string }[] = [];
    for (const entry of recipes) {
        try {
            await write({
                id: entry.id,
                flowNodes: entry.flowNodes ?? null,
                flowEdges: entry.flowEdges ?? null,
            });
            restored.push(entry.id);
        } catch (error) {
            failed.push({
                id: entry.id,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    return { restored, failed };
}
