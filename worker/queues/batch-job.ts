// Shared plumbing of the worker jobs that run on the OpenAI Batch API
// (KUC-94, KUC-118): the saved batch lives in Redis, a lock keeps two runs
// apart, polls are scheduled without starting a second poll chain, and a
// finished batch is read the same way everywhere.
//
// Each job keeps its own request building and result import; only this
// bookkeeping is shared.

import { BATCH_RUNNING_STATUSES, type OpenAIBatchApi } from '@shared/openai-batch';

import { getRedis } from './connection';

/** Fields every saved batch has. */
export interface SavedBatch {
    batchId: string;
    inputFileId: string;
    createdAt: string;
    /** 0 = first batch, 1.. = retry rounds for failed entries */
    round: number;
    /** When the scheduled poll job is due; runs before that do not add another one */
    nextPollAt?: string;
}

export interface BatchStateStore<T> {
    get(): Promise<T | null>;
    set(state: T): Promise<void>;
    clear(): Promise<void>;
    lock(): Promise<boolean>;
    unlock(): Promise<void>;
}

const LOCK_SECONDS = 600;
/** A delayed poll job may start a little early compared to our clock */
const POLL_SLACK_MS = 5_000;

/** State under `<name>:batch`, lock under `<name>:lock`. */
export function redisBatchStore<T>(name: string): BatchStateStore<T> {
    const redis = getRedis();
    const stateKey = `${name}:batch`;
    const lockKey = `${name}:lock`;
    return {
        async get() {
            const raw = await redis.get(stateKey);
            return raw ? (JSON.parse(raw) as T) : null;
        },
        async set(state) {
            await redis.set(stateKey, JSON.stringify(state));
        },
        async clear() {
            await redis.del(stateKey);
        },
        async lock() {
            return (await redis.set(lockKey, '1', 'EX', LOCK_SECONDS, 'NX')) === 'OK';
        },
        async unlock() {
            await redis.del(lockKey);
        },
    };
}

/** Runs `run` under the store's lock; a second run at the same time is skipped. */
export async function withBatchLock(
    store: Pick<BatchStateStore<unknown>, 'lock' | 'unlock'>,
    run: () => Promise<Record<string, unknown>>,
): Promise<Record<string, unknown>> {
    if (!(await store.lock())) {
        return { step: 'skipped', message: 'Ein anderer Lauf ist aktiv' };
    }
    try {
        return await run();
    } finally {
        await store.unlock();
    }
}

/**
 * Schedules the next poll unless one is already pending for this batch, so a
 * cron or manual run during a running batch does not start a second chain.
 * A poll job runs at its due time and therefore always schedules the next.
 */
export async function schedulePollIfDue<T extends SavedBatch>(
    store: Pick<BatchStateStore<T>, 'set'>,
    state: T,
    delayMs: number,
    now: Date,
    schedule: () => Promise<void>,
): Promise<void> {
    if (delayMs <= 0) return;
    if (state.nextPollAt && now.getTime() < Date.parse(state.nextPollAt) - POLL_SLACK_MS) return;
    await schedule();
    await store.set({ ...state, nextPollAt: new Date(now.getTime() + delayMs).toISOString() });
}

export type BatchCheck =
    | {
          kind: 'running';
          status: string;
          requestCounts: { total: number; completed: number; failed: number } | null;
      }
    | { kind: 'completed'; status: string; outputJsonl: string };

/**
 * Looks at a saved batch. A batch that failed, expired or was cancelled is
 * forgotten (so the next run submits again) and reported as an error.
 */
export async function checkBatch(
    api: Pick<OpenAIBatchApi, 'retrieveBatch' | 'fileText'>,
    store: Pick<BatchStateStore<unknown>, 'clear'>,
    batchId: string,
): Promise<BatchCheck> {
    const batch = await api.retrieveBatch(batchId);
    if (BATCH_RUNNING_STATUSES.includes(batch.status)) {
        return {
            kind: 'running',
            status: batch.status,
            requestCounts: batch.request_counts ?? null,
        };
    }
    if (batch.status !== 'completed') {
        await store.clear();
        throw new Error(`Batch ${batchId} endete mit Status ${batch.status}`);
    }
    const outputJsonl = batch.output_file_id ? await api.fileText(batch.output_file_id) : '';
    return { kind: 'completed', status: batch.status, outputJsonl };
}
