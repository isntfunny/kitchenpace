// Client-only module (imported only by 'use client' components).
// Manages a single shared EventSource connection so all hooks on the page
// share one HTTP connection rather than each opening their own.

type EventHandler = (event: MessageEvent) => void;

type StreamState = {
    eventSource: EventSource | null;
    refCount: number;
    handlers: Map<string, Set<EventHandler>>;
    url: string | null;
};

// Survive Next.js hot-module replacement in development via globalThis.
const g = globalThis as typeof globalThis & { __notifStream?: StreamState };

function logStream(message: string, details?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== 'development') {
        return;
    }

    if (details) {
        console.debug(`[SSE notifications] ${message}`, details);
        return;
    }

    console.debug(`[SSE notifications] ${message}`);
}

function getState(): StreamState {
    if (!g.__notifStream) {
        g.__notifStream = { eventSource: null, refCount: 0, handlers: new Map(), url: null };
    }
    return g.__notifStream;
}

function attachHandlers(es: EventSource) {
    const { handlers } = getState();
    for (const [type, set] of handlers) {
        for (const handler of set) {
            es.addEventListener(type, handler);
        }
    }
}

export function connectStream(url: string) {
    const state = getState();
    state.refCount++;

    if (state.eventSource && state.url && state.url !== url) {
        logStream('switching stream url', { from: state.url, to: url });
        state.eventSource.close();
        state.eventSource = null;
        state.url = null;
    }

    if (!state.eventSource) {
        logStream('connecting', { url, refCount: state.refCount });
        const eventSource = new EventSource(url);
        eventSource.addEventListener('open', () => {
            logStream('open', { url, readyState: eventSource.readyState });
        });
        eventSource.addEventListener('error', () => {
            logStream('error', { url, readyState: eventSource.readyState });
        });
        eventSource.addEventListener('ready', () => {
            logStream('ready');
        });

        state.eventSource = eventSource;
        state.url = url;
        attachHandlers(eventSource);
    }
}

export function disconnectStream() {
    const state = getState();
    state.refCount = Math.max(0, state.refCount - 1);

    if (state.refCount === 0 && state.eventSource) {
        logStream('closing', { url: state.url });
        state.eventSource.close();
        state.eventSource = null;
        state.url = null;
    }
}

export function onStreamEvent(type: string, handler: EventHandler): () => void {
    const state = getState();

    if (!state.handlers.has(type)) {
        state.handlers.set(type, new Set());
    }
    state.handlers.get(type)!.add(handler);
    state.eventSource?.addEventListener(type, handler);

    return () => {
        state.handlers.get(type)?.delete(handler);
        state.eventSource?.removeEventListener(type, handler);
    };
}
