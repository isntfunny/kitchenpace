/**
 * OpenAI Batch API helpers (KUC-115): upload a JSONL file, create a batch,
 * poll it and read its output. Shared by the shelf-life backfill
 * (worker/queues/shelf-life-processor.ts, /v1/responses) and the recipe flow
 * refresh (scripts/refresh-recipe-flows.ts, /v1/chat/completions).
 *
 * Callers build the request bodies themselves, with the same functions as
 * their direct calls, so a batch request never differs from a direct one.
 */

import OpenAI, { toFile } from 'openai';

export type BatchEndpoint = '/v1/responses' | '/v1/chat/completions';

export interface BatchInfo {
    status: string;
    output_file_id?: string | null;
    error_file_id?: string | null;
    request_counts?: { total: number; completed: number; failed: number } | null;
}

export interface OpenAIBatchApi {
    uploadJsonl(content: string, filename: string): Promise<string>;
    createBatch(
        inputFileId: string,
        endpoint: BatchEndpoint,
        metadata: Record<string, string>,
    ): Promise<{ id: string }>;
    retrieveBatch(batchId: string): Promise<BatchInfo>;
    fileText(fileId: string): Promise<string>;
}

/** Batch states in which the batch is still being worked on. */
export const BATCH_RUNNING_STATUSES: readonly string[] = [
    'validating',
    'in_progress',
    'finalizing',
    'cancelling',
];

export function createOpenAIBatchApi(client?: OpenAI): OpenAIBatchApi {
    const openai =
        client ??
        (() => {
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');
            return new OpenAI({ apiKey, organization: process.env.OPENAI_ORG_ID });
        })();
    return {
        async uploadJsonl(content, filename) {
            const file = await openai.files.create({
                file: await toFile(Buffer.from(content, 'utf8'), filename),
                purpose: 'batch',
            });
            return file.id;
        },
        createBatch: (inputFileId, endpoint, metadata) =>
            openai.batches.create({
                input_file_id: inputFileId,
                endpoint,
                completion_window: '24h',
                metadata,
            }),
        retrieveBatch: (batchId) => openai.batches.retrieve(batchId),
        async fileText(fileId) {
            const response = await openai.files.content(fileId);
            return response.text();
        },
    };
}

/** One line of the batch input file. */
export function batchRequestLine(customId: string, url: BatchEndpoint, body: unknown): string {
    return JSON.stringify({ custom_id: customId, method: 'POST', url, body });
}

/** Whole batch input file (one request per line, trailing newline; empty for no requests). */
export function buildBatchJsonl(
    url: BatchEndpoint,
    requests: { customId: string; body: unknown }[],
): string {
    const lines = requests.map((r) => batchRequestLine(r.customId, url, r.body));
    return lines.length > 0 ? `${lines.join('\n')}\n` : '';
}

export interface BatchOutputEntry {
    customId: string;
    /** Response body of a successful request (HTTP 200) */
    body?: unknown;
    /** Why the request has no usable body */
    error?: string;
}

/**
 * Entries of a batch output or error file. Lines that are no JSON or carry no
 * custom_id are skipped; requests that failed get `error` instead of `body`.
 */
export function parseBatchOutputJsonl(jsonl: string): BatchOutputEntry[] {
    const entries: BatchOutputEntry[] = [];
    for (const line of jsonl.split('\n')) {
        if (!line.trim()) continue;
        let entry: {
            custom_id?: string;
            error?: unknown;
            response?: { status_code?: number; body?: unknown };
        };
        try {
            entry = JSON.parse(line);
        } catch {
            continue;
        }
        if (!entry.custom_id) continue;
        if (entry.error || entry.response?.status_code !== 200 || !entry.response.body) {
            const reason = entry.error
                ? JSON.stringify(entry.error)
                : `HTTP ${entry.response?.status_code ?? '?'}${entry.response?.body ? ` ${JSON.stringify(entry.response.body).slice(0, 300)}` : ''}`;
            entries.push({ customId: entry.custom_id, error: reason });
            continue;
        }
        entries.push({ customId: entry.custom_id, body: entry.response.body });
    }
    return entries;
}

interface ResponsesBody {
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
}

/** Text of a /v1/responses answer (all output_text parts). */
export function responsesOutputText(body: unknown): string {
    return ((body as ResponsesBody)?.output ?? [])
        .flatMap((entry) => entry.content ?? [])
        .filter((content) => content.type === 'output_text')
        .map((content) => content.text ?? '')
        .join('');
}

/** Message text of a /v1/chat/completions answer, null when there is none. */
export function chatCompletionContent(body: unknown): string | null {
    const choices = (body as { choices?: Array<{ message?: { content?: string | null } }> })
        ?.choices;
    return choices?.[0]?.message?.content ?? null;
}
