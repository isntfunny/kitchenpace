import { AwsInstrumentation } from '@opentelemetry/instrumentation-aws-sdk';
import { IORedisInstrumentation } from '@opentelemetry/instrumentation-ioredis';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { RuntimeNodeInstrumentation } from '@opentelemetry/instrumentation-runtime-node';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';

import { RELEASE } from './release';

declare global {
    var __kitchenpaceTelemetrySDK: NodeSDK | undefined;
}

/**
 * Initializes the OpenTelemetry NodeSDK using standard OTEL_* environment variables.
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

    const sdk = new NodeSDK({
        serviceName: env.OTEL_SERVICE_NAME || fallbackService,
        resource: defaultResource().merge(
            resourceFromAttributes({
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
            new UndiciInstrumentation(),
            new AwsInstrumentation({
                suppressInternalInstrumentation: true,
            }),
            new RuntimeNodeInstrumentation(),
        ],
    });

    sdk.start();
    globalThis.__kitchenpaceTelemetrySDK = sdk;

    process.once('beforeExit', () => {
        void shutdownTelemetry();
    });

    return true;
}

export async function shutdownTelemetry(): Promise<void> {
    const sdk = globalThis.__kitchenpaceTelemetrySDK;
    if (!sdk) return;
    globalThis.__kitchenpaceTelemetrySDK = undefined;
    try {
        await sdk.shutdown();
    } catch (error) {
        console.error('[otel] shutdown failed:', error instanceof Error ? error.message : error);
    }
}
