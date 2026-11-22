// Shared batch bookkeeping: poll scheduling and reading a batch. No OpenAI,
// no Redis (the store is a fake).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    BATCH_BACKFILL_DEFAULTS,
    checkBatch,
    pollOverdueBatches,
    schedulePollIfDue,
    submitBatch,
    withBatchLock,
    type SavedBatch,
} from './batch-job';

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

    // Expired: the partial output is paid for and gets imported
    status = 'expired';
    const expired = await checkBatch(api, store, 'b1');
    assert.equal(expired.kind, 'completed');
    assert.equal(expired.status, 'expired');
    assert.equal(cleared, 0);

    status = 'cancelled';
    await assert.rejects(checkBatch(api, store, 'b1'), /Status cancelled/);
    assert.equal(cleared, 1);
});

test('expired batch without output file: everything counts as missing', async () => {
    const api = {
        retrieveBatch: async () => ({ status: 'expired', output_file_id: null }),
        fileText: async () => {
            throw new Error('no file');
        },
    };
    const result = await checkBatch(api, { clear: async () => {} }, 'b1');
    assert.deepEqual(result, { kind: 'completed', status: 'expired', outputJsonl: '' });
});

test('pollMinutes 0 marks the batch as not polled automatically', async () => {
    let state = saved();
    await schedulePollIfDue(
        {
            set: async (next: SavedBatch) => {
                state = next;
            },
        },
        state,
        0,
        new Date(),
        async () => assert.fail('no poll with pollMinutes 0'),
    );
    assert.equal(state.pollStopped, true);
});

test('skipped run (lock held) re-enqueues only when a batch is saved', async () => {
    let requeued = 0;
    const requeue = async () => {
        requeued += 1;
    };
    const locked = (state: SavedBatch | null) => ({
        lock: async () => false,
        unlock: async () => assert.fail('not locked by us'),
        get: async () => state,
    });

    const withBatch = await withBatchLock(locked(saved()), async () => assert.fail(), requeue);
    assert.equal(withBatch.step, 'skipped');
    assert.equal(withBatch.requeued, true);
    assert.equal(requeued, 1);

    const withoutBatch = await withBatchLock(locked(null), async () => assert.fail(), requeue);
    assert.equal(withoutBatch.requeued, false);
    assert.equal(requeued, 1);

    let unlocked = false;
    const ran = await withBatchLock(
        {
            lock: async () => true,
            unlock: async () => {
                unlocked = true;
            },
            get: async () => null,
        },
        async () => ({ step: 'idle' }),
        requeue,
    );
    assert.equal(ran.step, 'idle');
    assert.ok(unlocked);
});

test('poll cron re-enqueues only saved batches whose poll is overdue, with their data', async () => {
    const now = new Date('2026-11-21T06:00:00Z');
    const enqueued: Array<[string, Record<string, unknown>]> = [];
    const targetFor = (job: string, state: SavedBatch | null) => ({
        job,
        store: { get: async () => state },
        enqueue: async (data: Record<string, unknown>) => {
            enqueued.push([job, data]);
        },
    });
    const result = await pollOverdueBatches(
        [
            targetFor(
                'lost',
                saved({ nextPollAt: '2026-11-21T05:40:00Z', pollData: { write: true } }),
            ),
            targetFor('pending', saved({ nextPollAt: '2026-11-21T05:58:00Z' })),
            targetFor('never-scheduled', saved()),
            targetFor('manual', saved({ pollStopped: true })),
            targetFor('none', null),
        ],
        now,
        5 * 60_000,
    );
    assert.deepEqual(result.requeued, ['lost', 'never-scheduled']);
    assert.deepEqual(result.pending, ['lost', 'pending', 'never-scheduled']);
    assert.deepEqual(enqueued, [
        ['lost', { write: true, reset: false }],
        ['never-scheduled', { reset: false }],
    ]);
});

test('scheduled polls store the job data for the poll cron', async () => {
    let state = saved();
    await schedulePollIfDue(
        {
            set: async (next: SavedBatch) => {
                state = next;
            },
        },
        state,
        60_000,
        new Date('2026-11-21T06:00:00Z'),
        async () => {},
        { write: true, reset: true },
    );
    assert.deepEqual(state.pollData, { write: true, reset: false });
    assert.equal(state.pollStopped, false);
});

test('submitBatch uploads, creates on the endpoint and saves the state with the extra fields', async () => {
    const calls: unknown[] = [];
    let saved: unknown = null;
    type State = SavedBatch & { model: string; requests: Record<string, string[]> };
    const state = await submitBatch<State>(
        {
            api: {
                uploadJsonl: async (content, filename) => {
                    calls.push(['upload', content, filename]);
                    return 'file-1';
                },
                createBatch: async (file, endpoint, metadata) => {
                    calls.push(['create', file, endpoint, metadata]);
                    return { id: 'batch-1' };
                },
            },
            store: {
                set: async (value) => {
                    saved = value;
                },
            },
            now: () => new Date('2026-11-22T10:00:00Z'),
        },
        {
            jsonl: '{}\n',
            filename: 'x-r1.jsonl',
            endpoint: '/v1/responses',
            metadata: { purpose: 'test', round: '1' },
            round: 1,
            extra: { model: 'm', requests: { 'r1-0': ['a'] } },
        },
    );
    assert.deepEqual(calls, [
        ['upload', '{}\n', 'x-r1.jsonl'],
        ['create', 'file-1', '/v1/responses', { purpose: 'test', round: '1' }],
    ]);
    assert.deepEqual(state, {
        batchId: 'batch-1',
        inputFileId: 'file-1',
        model: 'm',
        requests: { 'r1-0': ['a'] },
        createdAt: '2026-11-22T10:00:00.000Z',
        round: 1,
    });
    assert.deepEqual(saved, state);
    assert.deepEqual(BATCH_BACKFILL_DEFAULTS, {
        write: false,
        limit: 0,
        pollMinutes: 10,
        reset: false,
    });
});
