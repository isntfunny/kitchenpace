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
    /** Job data of the poll job, so the poll cron can re-enqueue the same run */
    pollData?: Record<string, unknown>;
    /** No automatic polling (pollMinutes 0, or kept after a dry run): the poll cron leaves it alone */
    pollStopped?: boolean;
}

export interface BatchStateStore<T> {
    get(): Promise<T | null>;
    set(state: T): Promise<void>;
    clear(): Promise<void>;
    lock(): Promise<boolean>;
    unlock(): Promise<void>;
}

const LOCK_SECONDS = 600;
/** Delay for a run re-enqueued because another run held the lock */
export const LOCKED_REQUEUE_DELAY_MS = 60_000;
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

/**
 * Runs `run` under the store's lock. A second run at the same time is skipped;
 * if a batch is saved, `requeue` adds it again for later so a skipped poll
 * does not end the poll chain.
 */
export async function withBatchLock(
    store: Pick<BatchStateStore<unknown>, 'lock' | 'unlock' | 'get'>,
    run: () => Promise<Record<string, unknown>>,
    requeue?: () => Promise<unknown>,
): Promise<Record<string, unknown>> {
    if (!(await store.lock())) {
        const pending = requeue && (await store.get()) ? requeue : null;
        if (pending) await pending();
        return {
            step: 'skipped',
            message: 'Ein anderer Lauf ist aktiv',
            requeued: Boolean(pending),
        };
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
    pollData?: Record<string, unknown>,
): Promise<void> {
    if (delayMs <= 0) {
        if (!state.pollStopped) await store.set({ ...state, pollStopped: true });
        return;
    }
    if (state.nextPollAt && now.getTime() < Date.parse(state.nextPollAt) - POLL_SLACK_MS) return;
    await schedule();
    await store.set({
        ...state,
        nextPollAt: new Date(now.getTime() + delayMs).toISOString(),
        pollStopped: false,
        ...(pollData ? { pollData: { ...pollData, reset: false } } : {}),
    });
}

/** A saved batch whose poll is overdue (or was never scheduled). */
export function pollOverdue(state: SavedBatch, now: Date, graceMs: number): boolean {
    return !state.nextPollAt || now.getTime() > Date.parse(state.nextPollAt) + graceMs;
}

export interface PollTarget {
    job: string;
    store: Pick<BatchStateStore<SavedBatch>, 'get'>;
    enqueue(data: Record<string, unknown>): Promise<void>;
}

/**
 * poll-openai-batches (cron): re-enqueues the job of every saved batch whose
 * poll chain broke (failed poll job, lost delayed job). Never submits; jobs
 * without a saved batch are left alone.
 */
export async function pollOverdueBatches(
    targets: PollTarget[],
    now: Date,
    graceMs: number,
): Promise<{ requeued: string[]; pending: string[] }> {
    const requeued: string[] = [];
    const pending: string[] = [];
    for (const target of targets) {
        const state = await target.store.get();
        if (!state || state.pollStopped) continue;
        pending.push(target.job);
        if (!pollOverdue(state, now, graceMs)) continue;
        await target.enqueue({ ...(state.pollData ?? {}), reset: false });
        requeued.push(target.job);
    }
    return { requeued, pending };
}

export type BatchCheck =
    | {
          kind: 'running';
          status: string;
          requestCounts: { total: number; completed: number; failed: number } | null;
      }
    | { kind: 'completed'; status: string; outputJsonl: string };

/**
 * Looks at a saved batch. An expired batch counts as completed: its partial
 * output is paid for and gets imported, the callers ask again for the rest.
 * A batch that failed or was cancelled is forgotten (so the next run submits
 * again) and reported as an error.
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
    if (batch.status !== 'completed' && batch.status !== 'expired') {
        await store.clear();
        throw new Error(`Batch ${batchId} endete mit Status ${batch.status}`);
    }
    const outputJsonl = batch.output_file_id ? await api.fileText(batch.output_file_id) : '';
    return { kind: 'completed', status: batch.status, outputJsonl };
}
