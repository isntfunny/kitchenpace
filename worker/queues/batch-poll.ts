// poll-openai-batches (every 15 min, KUC-118): safety net for the poll chains
// of the batch jobs. If a saved batch has no pending poll (poll job failed
// for good, delayed job lost), the job is enqueued again with its saved data.
// Nothing is submitted here; jobs without a saved batch are left alone.

import type { Job } from 'bullmq';

import { pollOverdueBatches, redisBatchStore, type PollTarget, type SavedBatch } from './batch-job';
import { EMBEDDINGS_JOB_NAME, EMBEDDINGS_STORE_NAME } from './embeddings-backfill';
import { ENRICHMENT_JOB_NAME, ENRICHMENT_STORE_NAME } from './enrichment-backfill';
import { getOpenSearchQueue, getScheduledQueue } from './queue';
import { SHELF_LIFE_JOB_NAME, SHELF_LIFE_STORE_NAME } from './shelf-life-processor';

/** A poll this late is treated as lost */
const GRACE_MS = 5 * 60_000;

function target(
    job: string,
    storeName: string,
    queue: () => ReturnType<typeof getScheduledQueue>,
): PollTarget {
    return {
        job,
        store: redisBatchStore<SavedBatch>(storeName),
        enqueue: async (data) => {
            await queue().add(job, data);
        },
    };
}

export async function processPollOpenAIBatches(_job: Job): Promise<Record<string, unknown>> {
    const result = await pollOverdueBatches(
        [
            target(SHELF_LIFE_JOB_NAME, SHELF_LIFE_STORE_NAME, getScheduledQueue),
            target(ENRICHMENT_JOB_NAME, ENRICHMENT_STORE_NAME, getScheduledQueue),
            target(EMBEDDINGS_JOB_NAME, EMBEDDINGS_STORE_NAME, getOpenSearchQueue),
        ],
        new Date(),
        GRACE_MS,
    );
    if (result.requeued.length > 0) {
        console.log(`[BatchPoll] re-enqueued: ${result.requeued.join(', ')}`);
    }
    return result;
}
