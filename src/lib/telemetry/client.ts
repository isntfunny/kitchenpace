'use client';

export type ClientErrorSource = 'global' | 'route' | 'window' | 'promise' | 'boundary';

const ENDPOINT = '/api/telemetry/client-error';
const MAX_PER_PAGE = 20;
const CLIENT_RELEASE = process.env.NEXT_PUBLIC_RELEASE || 'dev';

let sentCount = 0;
const seen = new WeakSet<object>();
let clientContext: Record<string, string | boolean> = {};

export function setClientTelemetryContext(
    next: Record<string, string | boolean | undefined>,
): void {
    const cleaned: Record<string, string | boolean> = {};
    for (const [key, value] of Object.entries(next)) {
        if (typeof value === 'string' || typeof value === 'boolean') {
            cleaned[key] = value;
        }
    }
    clientContext = cleaned;
}

function normalizeError(error: unknown): { name: string; message: string; stack?: string } {
    if (error instanceof Error) {
        return {
            name: (error.name || 'Error').slice(0, 200),
            message: (error.message || 'Unknown error').slice(0, 2000),
            ...(error.stack ? { stack: error.stack.slice(0, 4000) } : {}),
        };
    }

    if (typeof error === 'object' && error !== null) {
        const record = error as { name?: unknown; message?: unknown; stack?: unknown };
        return {
            name:
                typeof record.name === 'string' && record.name
                    ? record.name.slice(0, 200)
                    : 'Error',
            message:
                typeof record.message === 'string' && record.message
                    ? record.message.slice(0, 2000)
                    : 'Unknown error',
            ...(typeof record.stack === 'string' ? { stack: record.stack.slice(0, 4000) } : {}),
        };
    }

    return {
        name: 'Error',
        message: typeof error === 'string' ? error.slice(0, 2000) : 'Unknown error',
    };
}

/**
 * Reports an unhandled browser error to the same-origin telemetry beacon endpoint.
 */
export function reportClientError(error: unknown, source: ClientErrorSource): void {
    if (typeof window === 'undefined' || sentCount >= MAX_PER_PAGE) return;

    if (typeof error === 'object' && error !== null) {
        if (seen.has(error)) return;
        seen.add(error);
    }

    sentCount++;

    try {
        const normalized = normalizeError(error);
        const digestRaw = (error as { digest?: unknown } | null)?.digest;
        const digest =
            typeof digestRaw === 'string' && digestRaw.length > 0
                ? digestRaw.slice(0, 200)
                : undefined;

        const payload = JSON.stringify({
            source,
            name: normalized.name,
            message: normalized.message,
            ...(normalized.stack ? { stack: normalized.stack } : {}),
            ...(digest ? { digest } : {}),
            path: window.location.pathname.slice(0, 500),
            release: CLIENT_RELEASE,
            ...(Object.keys(clientContext).length > 0 ? { context: clientContext } : {}),
        });

        const blob = new Blob([payload], { type: 'application/json' });
        if (!navigator.sendBeacon?.(ENDPOINT, blob)) {
            void fetch(ENDPOINT, {
                method: 'POST',
                body: payload,
                keepalive: true,
                headers: { 'Content-Type': 'application/json' },
            }).catch(() => {});
        }
    } catch {
        // Telemetry must never break the application.
    }
}
