import assert from 'node:assert/strict';
import { test } from 'node:test';

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
