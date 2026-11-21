import {
    type Attributes,
    context,
    type Span,
    type SpanKind,
    SpanStatusCode,
    trace,
} from '@opentelemetry/api';
import { type AnyValueMap, logs, SeverityNumber } from '@opentelemetry/api-logs';

import { isNextControlFlowError, type SanitizedError, sanitizeError, sanitizeMeta } from './redact';

const TRACER_NAME = 'kitchenpace';
const EMPTY_TRACE_ID = '00000000000000000000000000000000';
const recordedSpans = new WeakSet<Span>();

export interface TraceContextIds {
    trace_id: string;
    span_id: string;
}

export function getActiveTraceContext(): TraceContextIds | undefined {
    const ctx = trace.getActiveSpan()?.spanContext();
    if (!ctx?.traceId || ctx.traceId === EMPTY_TRACE_ID) return undefined;
    return { trace_id: ctx.traceId, span_id: ctx.spanId };
}

export function toFlatAttributes(meta?: Record<string, unknown>): AnyValueMap {
    const safe = sanitizeMeta(meta);
    const attrs: AnyValueMap = {};
    for (const [key, value] of Object.entries(safe)) {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            attrs[key] = value;
        } else if (value !== null && value !== undefined) {
            try {
                attrs[key] = JSON.stringify(value);
            } catch {
                attrs[key] = String(value);
            }
        }
    }
    return attrs;
}

export function recordSpanException(span: Span, error: unknown): SanitizedError {
    const safe = sanitizeError(error);
    if (!recordedSpans.has(span)) {
        recordedSpans.add(span);
        span.recordException(safe);
        span.setStatus({ code: SpanStatusCode.ERROR, message: safe.message });
    }
    return safe;
}

export interface WithSpanOptions {
    attributes?: Attributes;
    kind?: SpanKind;
    tracerName?: string;
}

export async function withSpan<T>(
    name: string,
    fn: (span: Span) => T | Promise<T>,
    opts: WithSpanOptions = {},
): Promise<T> {
    const tracer = trace.getTracer(opts.tracerName ?? TRACER_NAME);
    return tracer.startActiveSpan(
        name,
        {
            ...(opts.kind !== undefined ? { kind: opts.kind } : {}),
            ...(opts.attributes ? { attributes: opts.attributes } : {}),
        },
        async (span) => {
            try {
                return await fn(span);
            } catch (err) {
                if (isNextControlFlowError(err)) {
                    throw err;
                }
                recordSpanException(span, err);
                throw err;
            } finally {
                span.end();
            }
        },
    );
}

export interface RecordErrorOptions {
    ownSpan?: boolean;
    module?: string;
}

/**
 * Records an error as an OpenTelemetry span exception event plus a correlated OTLP error log.
 */
export function recordError(
    event: string,
    error: unknown,
    attributes: Record<string, unknown> = {},
    opts: RecordErrorOptions = {},
): void {
    if (isNextControlFlowError(error)) return;

    const moduleName = opts.module ?? event.split('.')[0] ?? 'app';
    const flatAttrs = toFlatAttributes(attributes);

    const recordOnSpan = (span: Span) => {
        const safe = recordSpanException(span, error);
        span.setAttribute('app.event', event);
        for (const [k, v] of Object.entries(flatAttrs)) {
            if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
                span.setAttribute(k, v);
            }
        }

        const activeCtx = trace.setSpan(context.active(), span);
        logs.getLogger(TRACER_NAME).emit({
            context: activeCtx,
            severityText: 'ERROR',
            severityNumber: SeverityNumber.ERROR,
            body: `${event}: ${safe.message}`,
            attributes: {
                event,
                module: moduleName,
                ...flatAttrs,
                'exception.type': safe.name,
                'exception.message': safe.message,
                ...(safe.stack ? { 'exception.stacktrace': safe.stack } : {}),
            },
        });

        const spanCtx = span.spanContext();
        const traceIds =
            spanCtx.traceId && spanCtx.traceId !== EMPTY_TRACE_ID
                ? { trace_id: spanCtx.traceId, span_id: spanCtx.spanId }
                : {};

        console.error(
            JSON.stringify({
                timestamp: new Date().toISOString(),
                level: 'error',
                module: moduleName,
                event,
                message: safe.message,
                error: safe,
                ...traceIds,
                ...flatAttrs,
            }),
        );
    };

    const active = trace.getActiveSpan();
    if (active?.isRecording() && !opts.ownSpan) {
        recordOnSpan(active);
        return;
    }

    trace.getTracer(TRACER_NAME).startActiveSpan(event, (span) => {
        try {
            recordOnSpan(span);
        } finally {
            span.end();
        }
    });
}
