import assert from 'node:assert/strict';
import { test } from 'node:test';

import { splitByExistingEnrichJob } from '@worker/queues/scheduled-processor';

import { enqueueIngredientEnrichment, setEnrichmentEnqueuerForTests } from './enqueue-enrichment';

test('enqueueIngredientEnrichment calls the enqueuer and returns true', async () => {
    const called: string[] = [];
    setEnrichmentEnqueuerForTests(async (id) => {
        called.push(id);
    });
    try {
        const ok = await enqueueIngredientEnrichment('ing-1');
        assert.equal(ok, true);
        assert.deepEqual(called, ['ing-1']);
    } finally {
        setEnrichmentEnqueuerForTests();
    }
});

test('enqueueIngredientEnrichment swallows queue errors so saving stays unaffected', async () => {
    setEnrichmentEnqueuerForTests(async () => {
        throw new Error('Redis connection refused');
    });
    try {
        const ok = await enqueueIngredientEnrichment('ing-2');
        assert.equal(ok, false);
    } finally {
        setEnrichmentEnqueuerForTests();
    }
});

test('splitByExistingEnrichJob sorts missing, failed, waiting and completed jobs', async () => {
    interface FakeJob {
        id: string;
        getState(): Promise<string>;
        retry(state?: 'failed' | 'completed'): Promise<void>;
        remove(): Promise<void>;
    }

    const removed: string[] = [];
    const requestedJobIds: string[] = [];

    const makeJob = (id: string, state: string): FakeJob => ({
        id,
        getState: async () => state,
        retry: async () => {},
        remove: async () => {
            removed.push(id);
        },
    });

    const jobs = new Map<string, FakeJob>([
        ['enrich-nutrition-b', makeJob('b', 'failed')],
        ['enrich-nutrition-c', makeJob('c', 'waiting')],
        ['enrich-nutrition-d', makeJob('d', 'completed')],
    ]);

    const { toAdd, toRetry } = await splitByExistingEnrichJob(
        ['a', 'b', 'c', 'd'],
        async (jobId) => {
            requestedJobIds.push(jobId);
            return jobs.get(jobId) ?? null;
        },
    );

    assert.deepEqual(requestedJobIds, [
        'enrich-nutrition-a',
        'enrich-nutrition-b',
        'enrich-nutrition-c',
        'enrich-nutrition-d',
    ]);
    assert.deepEqual(toAdd, ['a', 'd']);
    assert.deepEqual(
        toRetry.map((job) => job.id),
        ['b'],
    );
    assert.deepEqual(removed, ['d']);
});
