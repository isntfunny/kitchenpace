// Client-only module (imported only by 'use client' components).
// Manages a single shared EventSource connection so all hooks on the page
// share one HTTP connection rather than each opening their own.

type EventHandler = (event: MessageEvent) => void;

type StreamState = {
    eventSource: EventSource | null;
    refCount: number;
    handlers: Map<string, Set<EventHandler>>;
};

// Survive Next.js hot-module replacement in development via globalThis.
const g = globalThis as typeof globalThis & { __notifStream?: StreamState };

function getState(): StreamState {
    if (!g.__notifStream) {
        g.__notifStream = { eventSource: null, refCount: 0, handlers: new Map() };
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

    if (!state.eventSource) {
        state.eventSource = new EventSource(url);
        attachHandlers(state.eventSource);
    }
}

export function disconnectStream() {
    const state = getState();
    state.refCount = Math.max(0, state.refCount - 1);

    if (state.refCount === 0 && state.eventSource) {
        state.eventSource.close();
        state.eventSource = null;
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
