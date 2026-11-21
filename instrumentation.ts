import type { Instrumentation } from 'next';

export async function register(): Promise<void> {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const [{ after }, { configureFlushScheduler }, { initTelemetry }] = await Promise.all([
            import('next/server'),
            import('./shared/telemetry/lifecycle'),
            import('./shared/telemetry/node-sdk'),
        ]);

        configureFlushScheduler((task) => {
            try {
                after(task);
            } catch {
                // Outside a Next.js request context (e.g. startup)
            }
        });

        initTelemetry('kitchenpace-web');
    }
}

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
    if (process.env.NEXT_RUNTIME !== 'nodejs') return;

    const [{ recordError }, { RELEASE }] = await Promise.all([
        import('./shared/telemetry/tracing'),
        import('./shared/telemetry/release'),
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
