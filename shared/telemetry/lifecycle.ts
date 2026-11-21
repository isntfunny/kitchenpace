interface LifecycleState {
    flush?: () => Promise<void>;
    schedule?: (fn: () => Promise<void>) => void;
    pending?: Promise<void>;
    generation?: number;
}

declare global {
    var __kitchenpaceTelemetryLifecycle: LifecycleState | undefined;
}

// Next.js instrumentation and route bundles can have separate module caches.
const state = (globalThis.__kitchenpaceTelemetryLifecycle ??= {});

export function configureTelemetryFlush(fn: (() => Promise<void>) | undefined): void {
    state.flush = fn;
}

export function configureFlushScheduler(
    fn: ((task: () => Promise<void>) => void) | undefined,
): void {
    state.schedule = fn;
}

/**
 * Flushes buffered telemetry batches, coalescing concurrent flush calls.
 */
export function flushTelemetry(timeoutMs = 1500): Promise<void> {
    if (!state.flush) return Promise.resolve();
    state.generation = (state.generation ?? 0) + 1;
    if (state.pending) return state.pending;

    state.pending = (async () => {
        const deadline = Date.now() + timeoutMs;
        let completed = -1;
        try {
            while (completed !== state.generation && Date.now() < deadline) {
                const generation = state.generation!;
                let timer: ReturnType<typeof setTimeout> | undefined;
                try {
                    await Promise.race([
                        state.flush!(),
                        new Promise<void>((resolve) => {
                            timer = setTimeout(resolve, Math.max(1, deadline - Date.now()));
                        }),
                    ]);
                    completed = generation;
                } finally {
                    clearTimeout(timer);
                }
            }
        } catch {
            // Exporter health reports export failures directly to stderr.
        } finally {
            state.pending = undefined;
        }
    })();

    return state.pending;
}

/**
 * Schedules a non-blocking flush when a request-scoped scheduler (e.g. Next after()) is active.
 */
export function scheduleTelemetryFlush(): void {
    if (!state.flush || !state.schedule) return;
    try {
        state.schedule(() => flushTelemetry());
    } catch {
        // Ignore outside a request lifecycle.
    }
}
