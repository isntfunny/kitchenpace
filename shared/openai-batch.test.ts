import assert from 'node:assert/strict';
import { test } from 'node:test';

import type OpenAI from 'openai';

import {
    batchRequestLine,
    buildBatchJsonl,
    chatCompletionContent,
    createOpenAIBatchApi,
    parseBatchOutputJsonl,
    responsesOutputText,
} from './openai-batch';

test('builds one request line per entry with the given endpoint', () => {
    const jsonl = buildBatchJsonl('/v1/chat/completions', [
        { customId: 'a', body: { model: 'm', messages: [] } },
        { customId: 'b', body: { model: 'm', messages: [] } },
    ]);
    assert.ok(jsonl.endsWith('\n'));
    const lines = jsonl
        .trim()
        .split('\n')
        .map((l) => JSON.parse(l));
    assert.deepEqual(lines[0], {
        custom_id: 'a',
        method: 'POST',
        url: '/v1/chat/completions',
        body: { model: 'm', messages: [] },
    });
    assert.equal(lines[1].custom_id, 'b');
    assert.equal(buildBatchJsonl('/v1/responses', []), '');
    assert.equal(JSON.parse(batchRequestLine('x', '/v1/responses', {})).url, '/v1/responses');
});

test('parses output: bodies of HTTP 200, errors otherwise, junk lines skipped', () => {
    const output = [
        JSON.stringify({
            custom_id: 'ok',
            response: {
                status_code: 200,
                body: { choices: [{ message: { content: '{"a":1}' } }] },
            },
            error: null,
        }),
        JSON.stringify({ custom_id: 'http', response: { status_code: 500, body: { error: 'x' } } }),
        JSON.stringify({ custom_id: 'err', error: { code: 'batch_expired' } }),
        'not json',
        JSON.stringify({ response: { status_code: 200, body: {} } }),
        '',
    ].join('\n');
    const entries = parseBatchOutputJsonl(output);
    assert.deepEqual(
        entries.map((e) => [e.customId, e.body !== undefined, e.error !== undefined]),
        [
            ['ok', true, false],
            ['http', false, true],
            ['err', false, true],
        ],
    );
    assert.equal(chatCompletionContent(entries[0].body), '{"a":1}');
    assert.match(entries[1].error!, /HTTP 500/);
    assert.match(entries[2].error!, /batch_expired/);
});

test('reads the answer text of both endpoints', () => {
    assert.equal(
        responsesOutputText({
            output: [
                { content: [{ type: 'output_text', text: '{"items":' }] },
                {
                    content: [
                        { type: 'reasoning', text: 'x' },
                        { type: 'output_text', text: '[]}' },
                    ],
                },
            ],
        }),
        '{"items":[]}',
    );
    assert.equal(responsesOutputText(undefined), '');
    assert.equal(chatCompletionContent({ choices: [] }), null);
});

test('API wrapper passes endpoint, window and metadata to OpenAI', async () => {
    const calls: unknown[] = [];
    const fake = {
        files: {
            create: async (args: { purpose: string }) => {
                calls.push(['upload', args.purpose]);
                return { id: 'file-1' };
            },
            content: async () => ({ text: async () => 'out' }),
        },
        batches: {
            create: async (args: unknown) => {
                calls.push(['create', args]);
                return { id: 'batch-1' };
            },
            retrieve: async (id: string) => ({ id, status: 'completed' }),
        },
    } as unknown as OpenAI;
    const api = createOpenAIBatchApi(fake);
    assert.equal(await api.uploadJsonl('{}\n', 'x.jsonl'), 'file-1');
    assert.equal(
        (await api.createBatch('file-1', '/v1/chat/completions', { purpose: 't' })).id,
        'batch-1',
    );
    assert.equal((await api.retrieveBatch('batch-1')).status, 'completed');
    assert.equal(await api.fileText('file-2'), 'out');
    assert.deepEqual(calls, [
        ['upload', 'batch'],
        [
            'create',
            {
                input_file_id: 'file-1',
                endpoint: '/v1/chat/completions',
                completion_window: '24h',
                metadata: { purpose: 't' },
            },
        ],
    ]);
});
