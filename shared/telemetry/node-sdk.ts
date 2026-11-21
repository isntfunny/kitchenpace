import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPMetricExporter as JsonMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPMetricExporter as ProtoMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { OTLPTraceExporter as JsonTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPTraceExporter as ProtoTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { AwsInstrumentation } from '@opentelemetry/instrumentation-aws-sdk';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { IORedisInstrumentation } from '@opentelemetry/instrumentation-ioredis';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { RuntimeNodeInstrumentation } from '@opentelemetry/instrumentation-runtime-node';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { defaultResource, envDetector, resourceFromAttributes } from '@opentelemetry/resources';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';

import { observeExporter } from './exporter-health';
import { configureTelemetryFlush } from './lifecycle';
import { RELEASE } from './release';

declare global {
    var __kitchenpaceTelemetrySDK: NodeSDK | undefined;
}

const DIAG_LEVELS: Record<string, DiagLogLevel> = {
    NONE: DiagLogLevel.NONE,
    ERROR: DiagLogLevel.ERROR,
    WARN: DiagLogLevel.WARN,
    INFO: DiagLogLevel.INFO,
    DEBUG: DiagLogLevel.DEBUG,
    VERBOSE: DiagLogLevel.VERBOSE,
    ALL: DiagLogLevel.ALL,
};

function isTelemetryInfraUrl(rawUrl: string): boolean {
    if (!rawUrl) return false;
    return (
        rawUrl.includes('/v1/traces') ||
        rawUrl.includes('/v1/logs') ||
        rawUrl.includes('/v1/metrics') ||
        rawUrl.includes('/api/health')
    );
}

function getOtlpSignalTargets(env: NodeJS.ProcessEnv): Array<{ host: string; pathname: string }> {
    const targets: Array<{ host: string; pathname: string }> = [];
    const base = env.OTEL_EXPORTER_OTLP_ENDPOINT;
    if (base) {
        try {
            const parsed = new URL(base);
            const prefix = parsed.pathname.replace(/\/$/, '');
            targets.push(
                { host: parsed.host, pathname: `${prefix}/v1/traces` },
                { host: parsed.host, pathname: `${prefix}/v1/logs` },
                { host: parsed.host, pathname: `${prefix}/v1/metrics` },
            );
        } catch {
            // ignore malformed URL; exporter will surface error
        }
    }

    const explicit = [
        env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
        env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT,
        env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
    ];
    for (const candidate of explicit) {
        if (!candidate) continue;
        try {
            const parsed = new URL(candidate);
            targets.push({ host: parsed.host, pathname: parsed.pathname });
        } catch {
            // ignore malformed URL; exporter will surface error
        }
    }
    return targets;
}

/**
 * Initializes the OpenTelemetry NodeSDK for traces, logs, metrics, and auto-instrumentation.
 * Returns true if telemetry was activated, false when disabled or already started.
 */
export function initTelemetry(fallbackService: string): boolean {
    const env = process.env;
    const hasEndpoint = Boolean(
        env.OTEL_EXPORTER_OTLP_ENDPOINT ||
        env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
        env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT ||
        env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
    );

    if (
        !hasEndpoint ||
        env.OTEL_SDK_DISABLED === 'true' ||
        env.NEXT_PHASE === 'phase-production-build' ||
        globalThis.__kitchenpaceTelemetrySDK
    ) {
        return false;
    }

    const diagLevel =
        DIAG_LEVELS[(env.OTEL_LOG_LEVEL ?? 'WARN').toUpperCase()] ?? DiagLogLevel.WARN;
    diag.setLogger(new DiagConsoleLogger(), diagLevel);

    const traceProtocol =
        env.OTEL_EXPORTER_OTLP_TRACES_PROTOCOL ??
        env.OTEL_EXPORTER_OTLP_PROTOCOL ??
        'http/protobuf';
    if (traceProtocol !== 'http/json' && traceProtocol !== 'http/protobuf') {
        throw new Error('Unsupported OTLP traces protocol; use http/json or http/protobuf');
    }

    const metricProtocol =
        env.OTEL_EXPORTER_OTLP_METRICS_PROTOCOL ??
        env.OTEL_EXPORTER_OTLP_PROTOCOL ??
        'http/protobuf';
    if (metricProtocol !== 'http/json' && metricProtocol !== 'http/protobuf') {
        throw new Error('Unsupported OTLP metrics protocol; use http/json or http/protobuf');
    }

    const tracesEnabled =
        env.OTEL_TRACES_EXPORTER !== 'none' &&
        Boolean(env.OTEL_EXPORTER_OTLP_ENDPOINT || env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT);
    const logsEnabled =
        env.OTEL_LOGS_EXPORTER !== 'none' &&
        Boolean(env.OTEL_EXPORTER_OTLP_ENDPOINT || env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT);
    const metricsEnabled =
        env.OTEL_METRICS_EXPORTER !== 'none' &&
        Boolean(env.OTEL_EXPORTER_OTLP_ENDPOINT || env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT);

    if (!tracesEnabled && !logsEnabled && !metricsEnabled) {
        return false;
    }

    const TraceExporter = traceProtocol === 'http/json' ? JsonTraceExporter : ProtoTraceExporter;
    const MetricExporter =
        metricProtocol === 'http/json' ? JsonMetricExporter : ProtoMetricExporter;

    const spanProcessors = tracesEnabled
        ? [new BatchSpanProcessor(observeExporter('traces', new TraceExporter()))]
        : [];
    const logRecordProcessors = logsEnabled
        ? [
              new BatchLogRecordProcessor({
                  exporter: observeExporter('logs', new OTLPLogExporter()),
              }),
          ]
        : [];

    const exportIntervalMillis = Number(env.OTEL_METRIC_EXPORT_INTERVAL ?? 60_000);
    const exportTimeoutMillis = Math.min(
        Number(env.OTEL_METRIC_EXPORT_TIMEOUT ?? 30_000),
        exportIntervalMillis,
    );
    const metricReaders = metricsEnabled
        ? [
              new PeriodicExportingMetricReader({
                  exporter: observeExporter('metrics', new MetricExporter()),
                  exportIntervalMillis,
                  exportTimeoutMillis,
              }),
          ]
        : [];

    // Avoid duplicate Next.js fetch spans when UndiciInstrumentation handles outbound fetch.
    if (tracesEnabled) {
        env.NEXT_OTEL_FETCH_DISABLED ??= '1';
    }

    const envAttrs = envDetector.detect().attributes ?? {};
    const environment =
        envAttrs['deployment.environment.name'] ?? envAttrs['deployment.environment'];
    const otlpTargets = getOtlpSignalTargets(env);

    const isIgnoredOutgoingTarget = (originOrHost: string, path: string): boolean => {
        const cleanPath = path.split('?')[0] ?? '';
        if (isTelemetryInfraUrl(cleanPath)) return true;
        if (!originOrHost) return false;
        for (const target of otlpTargets) {
            if (originOrHost.includes(target.host) && cleanPath === target.pathname) {
                return true;
            }
        }
        return false;
    };

    const sdk = new NodeSDK({
        autoDetectResources: false,
        resource: defaultResource().merge(
            resourceFromAttributes({
                ...envAttrs,
                ...(environment
                    ? {
                          'deployment.environment': environment,
                          'deployment.environment.name': environment,
                      }
                    : {}),
                'service.name': env.OTEL_SERVICE_NAME || fallbackService,
                'service.version': RELEASE,
            }),
        ),
        instrumentations: [
            new PgInstrumentation({
                requireParentSpan: true,
                enhancedDatabaseReporting: false,
            }),
            new IORedisInstrumentation({
                requireParentSpan: true,
            }),
            new UndiciInstrumentation({
                ignoreRequestHook: (req) => isIgnoredOutgoingTarget(req.origin, req.path),
            }),
            new HttpInstrumentation({
                disableIncomingRequestInstrumentation: true,
                ignoreOutgoingRequestHook: (req) => {
                    const host = String(req.host ?? req.hostname ?? '');
                    const path = String(req.path ?? '');
                    return isIgnoredOutgoingTarget(host, path);
                },
            }),
            new AwsInstrumentation({
                suppressInternalInstrumentation: true,
            }),
            ...(metricsEnabled ? [new RuntimeNodeInstrumentation()] : []),
        ],
        spanProcessors,
        logRecordProcessors,
        metricReaders,
    });

    sdk.start();
    globalThis.__kitchenpaceTelemetrySDK = sdk;

    configureTelemetryFlush(async () => {
        await Promise.all([
            ...spanProcessors.map((p) => p.forceFlush()),
            ...logRecordProcessors.map((p) => p.forceFlush()),
            ...metricReaders.map((r) => r.forceFlush()),
        ]);
    });

    process.once('beforeExit', () => {
        void shutdownTelemetry();
    });

    return true;
}

export async function shutdownTelemetry(): Promise<void> {
    const sdk = globalThis.__kitchenpaceTelemetrySDK;
    if (!sdk) return;
    globalThis.__kitchenpaceTelemetrySDK = undefined;
    configureTelemetryFlush(undefined);
    try {
        await sdk.shutdown();
    } catch (error) {
        console.error('[otel] shutdown failed:', error instanceof Error ? error.message : error);
    }
}
