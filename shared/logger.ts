import { context, trace } from '@opentelemetry/api';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';

import { isNextControlFlowError, sanitizeError, sanitizeMeta } from './telemetry/redact';
import { getActiveTraceContext, recordSpanException, toFlatAttributes } from './telemetry/tracing';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};

const OTEL_SEVERITY: Record<LogLevel, [string, SeverityNumber]> = {
    debug: ['DEBUG', SeverityNumber.DEBUG],
    info: ['INFO', SeverityNumber.INFO],
    warn: ['WARN', SeverityNumber.WARN],
    error: ['ERROR', SeverityNumber.ERROR],
};

const CONSOLE_COLOR: Record<LogLevel, string> = {
    debug: '\x1b[36m',
    info: '\x1b[32m',
    warn: '\x1b[33m',
    error: '\x1b[31m',
};

const RESET_COLOR = '\x1b[0m';

function getMinLevel(): LogLevel {
    const configured = process.env.LOG_LEVEL?.toLowerCase();
    if (
        configured === 'debug' ||
        configured === 'info' ||
        configured === 'warn' ||
        configured === 'error'
    ) {
        return configured;
    }
    return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

function writeConsole(
    level: LogLevel,
    moduleName: string,
    message: string,
    safeMeta: Record<string, unknown>,
    traceIds?: { trace_id: string; span_id: string },
): void {
    const sink = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;

    if (process.env.NODE_ENV === 'production') {
        sink(
            JSON.stringify({
                timestamp: new Date().toISOString(),
                level,
                module: moduleName,
                message,
                ...traceIds,
                ...safeMeta,
            }),
        );
        return;
    }

    const ts = new Date().toISOString();
    const color = CONSOLE_COLOR[level];
    const traceSuffix = traceIds ? ` trace=${traceIds.trace_id.slice(0, 8)}` : '';
    const metaStr = Object.keys(safeMeta).length > 0 ? ` ${JSON.stringify(safeMeta)}` : '';
    sink(
        `${ts} ${color}[${level}]${RESET_COLOR} [${moduleName}]${traceSuffix} ${message}${metaStr}`,
    );
}

function extractError(meta?: Record<string, unknown>): unknown {
    if (!meta) return undefined;
    if (meta.error instanceof Error) return meta.error;
    if (meta.err instanceof Error) return meta.err;
    return undefined;
}

function emitLog(
    level: LogLevel,
    moduleName: string,
    message: string,
    meta?: Record<string, unknown>,
): void {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[getMinLevel()]) return;

    const rawError = level === 'error' ? extractError(meta) : undefined;
    const safeMeta = sanitizeMeta(meta);
    const traceIds = getActiveTraceContext();

    writeConsole(level, moduleName, message, safeMeta, traceIds);

    try {
        const [severityText, severityNumber] = OTEL_SEVERITY[level];
        const flatAttrs = toFlatAttributes(safeMeta);
        const safeErr =
            rawError && !isNextControlFlowError(rawError) ? sanitizeError(rawError) : undefined;

        let ownedSpan: ReturnType<ReturnType<typeof trace.getTracer>['startSpan']> | undefined;
        let emitContext = context.active();

        if (safeErr && rawError) {
            const active = trace.getActiveSpan();
            if (active?.isRecording()) {
                recordSpanException(active, rawError);
            } else {
                ownedSpan = trace.getTracer('kitchenpace').startSpan('error.logged');
                recordSpanException(ownedSpan, rawError);
                emitContext = trace.setSpan(emitContext, ownedSpan);
            }
        }

        logs.getLogger('kitchenpace').emit({
            context: emitContext,
            severityText,
            severityNumber,
            body: `[${moduleName}] ${message}`,
            attributes: {
                module: moduleName,
                'service.module': moduleName,
                ...flatAttrs,
                ...(safeErr
                    ? {
                          'exception.type': safeErr.name,
                          'exception.message': safeErr.message,
                          ...(safeErr.stack ? { 'exception.stacktrace': safeErr.stack } : {}),
                      }
                    : {}),
            },
        });

        ownedSpan?.end();
    } catch {
        // Logging must never break application execution.
    }
}

export const createLogger = (module: string) => ({
    debug: (message: string, meta?: Record<string, unknown>) =>
        emitLog('debug', module, message, meta),
    info: (message: string, meta?: Record<string, unknown>) =>
        emitLog('info', module, message, meta),
    warn: (message: string, meta?: Record<string, unknown>) =>
        emitLog('warn', module, message, meta),
    error: (message: string, meta?: Record<string, unknown>) =>
        emitLog('error', module, message, meta),
});
