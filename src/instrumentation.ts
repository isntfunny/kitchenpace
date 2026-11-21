import type { Instrumentation } from 'next';

export async function register(): Promise<void> {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { initTelemetry } = await import('@shared/telemetry/node-sdk');
        initTelemetry('kitchenpace-web');
    }
}

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
    if (process.env.NEXT_RUNTIME !== 'nodejs') return;

    const [{ recordError }, { RELEASE }] = await Promise.all([
        import('@shared/telemetry/tracing'),
        import('@shared/telemetry/release'),
    ]);

    const digest =
        typeof err === 'object' && err !== null && 'digest' in err && typeof err.digest === 'string'
            ? err.digest
            : undefined;

    recordError('request.error', err, {
        route: context.routePath,
        routerKind: context.routerKind,
        routeType: context.routeType,
        renderSource: context.renderSource,
        method: request.method,
        ...(digest ? { digest } : {}),
        release: RELEASE,
    });
};
