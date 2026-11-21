import assert from 'node:assert/strict';
import http from 'node:http';
import { afterEach, test } from 'node:test';

import { createLogger } from '../../shared/logger';
import { observeExporter } from '../../shared/telemetry/exporter-health';
import { flushTelemetry } from '../../shared/telemetry/lifecycle';
import { initTelemetry, shutdownTelemetry } from '../../shared/telemetry/node-sdk';
import {
    isNextControlFlowError,
    REDACTED,
    sanitizeError,
    sanitizeMeta,
} from '../../shared/telemetry/redact';
import { recordError, withSpan } from '../../shared/telemetry/tracing';
import { POST as postClientError } from '../../src/app/api/telemetry/client-error/route';

afterEach(async () => {
    await shutdownTelemetry();
});

test('sanitizeMeta and sanitizeError redact sensitive fields and URL credentials', () => {
    const circular: Record<string, unknown> = { ok: true, password: 'secret-password' };
    circular.self = circular;

    const sanitized = sanitizeMeta({
        token: 'tok-123',
        nested: {
            authorization: 'Bearer my-jwt-token',
            apiKey: 'sk-test-key',
            safeCount: 4,
        },
        circular,
    });

    assert.equal(sanitized.token, REDACTED);
    assert.deepEqual(sanitized.nested, {
        authorization: REDACTED,
        apiKey: REDACTED,
        safeCount: 4,
    });
    assert.equal((sanitized.circular as Record<string, unknown>).password, REDACTED);
    assert.equal((sanitized.circular as Record<string, unknown>).self, '[circular]');

    const err = new Error(
        'Failed connecting to https://admin:supersecret@db.internal:5432/app with Bearer abc.def.ghi',
    );
    const safeErr = sanitizeError(err);
    assert.ok(!safeErr.message.includes('supersecret'));
    assert.ok(!safeErr.message.includes('abc.def.ghi'));
    assert.ok(safeErr.message.includes(REDACTED));
});

test('isNextControlFlowError detects Next.js control flow digests and ignores regular errors', () => {
    assert.equal(isNextControlFlowError({ digest: 'NEXT_REDIRECT;replace;/login;307;' }), true);
    assert.equal(isNextControlFlowError({ digest: 'NEXT_HTTP_ERROR_FALLBACK;404' }), true);
    assert.equal(isNextControlFlowError({ digest: 'DYNAMIC_SERVER_USAGE' }), true);
    assert.equal(isNextControlFlowError({ $$typeof: Symbol.for('react.postpone') }), true);
    assert.equal(isNextControlFlowError(new Error('Real boom')), false);
    assert.equal(isNextControlFlowError(null), false);
});

test('observeExporter reports first failure, throttles repeats, and reports recovery', () => {
    const lines: string[] = [];
    let currentTime = 1_000;
    let nextCode = 1;

    const observed = observeExporter(
        'traces',
        {
            export(_items: unknown[], cb) {
                cb({
                    code: nextCode,
                    error: nextCode === 0 ? undefined : new Error('HTTP 502 Bad Gateway'),
                });
            },
        },
        (line) => lines.push(line),
        () => currentTime,
    );

    observed.export([1], () => {});
    currentTime += 10_000;
    observed.export([2], () => {});
    currentTime += 60_000;
    observed.export([3], () => {});
    nextCode = 0;
    observed.export([4], () => {});

    assert.equal(lines.length, 3);
    assert.match(lines[0] ?? '', /export failed, data dropped: HTTP 502/);
    assert.match(lines[1] ?? '', /still failing: 3 batches dropped/);
    assert.match(lines[2] ?? '', /recovered after 3 failed batches/);
    assert.equal(observed.health.failing, 0);
    assert.equal(observed.health.failedTotal, 3);
});

test('POST /api/telemetry/client-error returns 204 for valid, invalid, and oversized bodies', async () => {
    const validReq = new Request('http://localhost/api/telemetry/client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            source: 'window',
            name: 'TypeError',
            message: 'Cannot read properties of undefined',
            path: '/recipes?secret=ignored',
            release: 'abc1234',
        }),
    });
    const validRes = await postClientError(validReq);
    assert.equal(validRes.status, 204);

    const invalidReq = new Request('http://localhost/api/telemetry/client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{not-json',
    });
    assert.equal((await postClientError(invalidReq)).status, 204);

    const oversizedReq = new Request('http://localhost/api/telemetry/client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'window', message: 'x'.repeat(20_000) }),
    });
    assert.equal((await postClientError(oversizedReq)).status, 204);
});

test('NodeSDK exports parent spans, Undici auto-instrumentation, exception events, and correlated logs', async () => {
    const tracePayloads: Array<Record<string, unknown>> = [];
    const logPayloads: Array<Record<string, unknown>> = [];
    let pingTraceparent: string | undefined;

    const server = http.createServer((req, res) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk) => chunks.push(chunk as Buffer));
        req.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf8');
            if (req.url === '/ping') {
                pingTraceparent = req.headers.traceparent as string | undefined;
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end('{"ok":true}');
                return;
            }
            if (req.url === '/v1/traces') {
                tracePayloads.push(JSON.parse(raw) as Record<string, unknown>);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end('{}');
                return;
            }
            if (req.url === '/v1/logs') {
                logPayloads.push(JSON.parse(raw) as Record<string, unknown>);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end('{}');
                return;
            }
            res.writeHead(404);
            res.end();
        });
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const prevEnv = {
        OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
        OTEL_EXPORTER_OTLP_PROTOCOL: process.env.OTEL_EXPORTER_OTLP_PROTOCOL,
        OTEL_METRICS_EXPORTER: process.env.OTEL_METRICS_EXPORTER,
        OTEL_SERVICE_NAME: process.env.OTEL_SERVICE_NAME,
        OTEL_RESOURCE_ATTRIBUTES: process.env.OTEL_RESOURCE_ATTRIBUTES,
        OTEL_SDK_DISABLED: process.env.OTEL_SDK_DISABLED,
        LOG_LEVEL: process.env.LOG_LEVEL,
    };

    try {
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT = baseUrl;
        process.env.OTEL_EXPORTER_OTLP_PROTOCOL = 'http/json';
        process.env.OTEL_METRICS_EXPORTER = 'none';
        process.env.OTEL_SERVICE_NAME = 'kitchenpace-test';
        process.env.OTEL_RESOURCE_ATTRIBUTES = 'deployment.environment=test';
        process.env.OTEL_SDK_DISABLED = 'false';
        process.env.LOG_LEVEL = 'debug';

        const started = initTelemetry('kitchenpace-test');
        assert.equal(started, true);

        const log = createLogger('telemetry-test');

        await withSpan('test.parent', async () => {
            const res = await fetch(`${baseUrl}/ping`);
            assert.equal(res.status, 200);

            log.info('sync step', {
                recipeCount: 3,
                password: 'must-not-leak-password',
            });

            log.error('step failed', {
                token: 'must-not-leak-token',
                error: new Error('Query failed on postgresql://user:dbsecret@pg/app'),
            });

            recordError(
                'test.recorded',
                new Error('Recorded exception with Bearer secret-bearer'),
                { customFlag: true },
            );
        });

        await flushTelemetry(3000);
        await shutdownTelemetry();

        assert.ok(pingTraceparent, 'Expected W3C traceparent header on outbound fetch');

        const spans = tracePayloads.flatMap((payload) => {
            const resourceSpans = (payload.resourceSpans ?? []) as Array<{
                scopeSpans?: Array<{ spans?: Array<Record<string, unknown>> }>;
            }>;
            return resourceSpans.flatMap((rs) =>
                (rs.scopeSpans ?? []).flatMap((ss) => ss.spans ?? []),
            );
        });

        const parentSpan = spans.find((s) => s.name === 'test.parent');
        assert.ok(parentSpan, 'Expected test.parent span');

        const childHttpSpan = spans.find(
            (s) => s.parentSpanId === parentSpan.spanId && s.spanId !== parentSpan.spanId,
        );
        assert.ok(childHttpSpan, 'Expected auto-instrumented Undici HTTP child span');

        const events = (parentSpan.events ?? []) as Array<{ name?: string }>;
        assert.ok(
            events.some((e) => e.name === 'exception'),
            'Expected exception span event on test.parent',
        );

        const logRecords = logPayloads.flatMap((payload) => {
            const resourceLogs = (payload.resourceLogs ?? []) as Array<{
                scopeLogs?: Array<{ logRecords?: Array<Record<string, unknown>> }>;
            }>;
            return resourceLogs.flatMap((rl) =>
                (rl.scopeLogs ?? []).flatMap((sl) => sl.logRecords ?? []),
            );
        });

        assert.ok(logRecords.length >= 2, 'Expected exported OTLP log records');
        const infoLog = logRecords.find((r) => {
            const body = r.body as { stringValue?: string } | undefined;
            return body?.stringValue?.includes('sync step');
        });
        assert.ok(infoLog, 'Expected correlated info log record');
        assert.equal(infoLog.traceId, parentSpan.traceId);
        assert.equal(infoLog.spanId, parentSpan.spanId);

        const serializedLogs = JSON.stringify(logRecords);
        assert.ok(!serializedLogs.includes('must-not-leak-password'));
        assert.ok(!serializedLogs.includes('must-not-leak-token'));
        assert.ok(!serializedLogs.includes('dbsecret'));
        assert.ok(!serializedLogs.includes('secret-bearer'));
    } finally {
        for (const [key, val] of Object.entries(prevEnv)) {
            if (val === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = val;
            }
        }
        await new Promise<void>((resolve) => server.close(() => resolve()));
    }
});
