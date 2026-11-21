// Shared batch bookkeeping: poll scheduling and reading a batch. No OpenAI,
// no Redis (the store is a fake).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { checkBatch, schedulePollIfDue, type SavedBatch } from './batch-job';

const saved = (extra: Partial<SavedBatch> = {}): SavedBatch => ({
    batchId: 'b1',
    inputFileId: 'f1',
    createdAt: '2026-11-21T00:00:00.000Z',
    round: 0,
    ...extra,
});

test('a poll is scheduled once; runs before it is due add no second poll chain', async () => {
    let state = saved();
    const store = {
        set: async (next: SavedBatch) => {
            state = next;
        },
    };
    let scheduled = 0;
    const schedule = async () => {
        scheduled += 1;
    };
    const t0 = new Date('2026-11-21T05:30:00Z');

    await schedulePollIfDue(store, state, 600_000, t0, schedule);
    assert.equal(scheduled, 1);
    assert.equal(state.nextPollAt, '2026-11-21T05:40:00.000Z');

    // Cron or manual run while the poll is pending
    await schedulePollIfDue(store, state, 600_000, new Date('2026-11-21T05:35:00Z'), schedule);
    assert.equal(scheduled, 1);

    // The poll job itself (at its due time, a little early is fine)
    await schedulePollIfDue(store, state, 600_000, new Date('2026-11-21T05:39:58Z'), schedule);
    assert.equal(scheduled, 2);
    assert.equal(state.nextPollAt, '2026-11-21T05:49:58.000Z');

    // Polling switched off
    await schedulePollIfDue(store, saved(), 0, t0, schedule);
    assert.equal(scheduled, 2);
});

test('checkBatch: running, completed with output, failed clears the state', async () => {
    let status = 'in_progress';
    let cleared = 0;
    const api = {
        retrieveBatch: async () => ({
            status,
            output_file_id: status === 'completed' ? 'out-1' : null,
            request_counts: { total: 2, completed: 1, failed: 0 },
        }),
        fileText: async (fileId: string) => `text of ${fileId}`,
    };
    const store = {
        clear: async () => {
            cleared += 1;
        },
    };

    const running = await checkBatch(api, store, 'b1');
    assert.equal(running.kind, 'running');
    assert.deepEqual(running.kind === 'running' && running.requestCounts, {
        total: 2,
        completed: 1,
        failed: 0,
    });

    status = 'completed';
    const done = await checkBatch(api, store, 'b1');
    assert.equal(done.kind === 'completed' && done.outputJsonl, 'text of out-1');
    assert.equal(cleared, 0);

    status = 'expired';
    await assert.rejects(checkBatch(api, store, 'b1'), /Status expired/);
    assert.equal(cleared, 1);
});
