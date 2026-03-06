import type { FlowEdgeSerialized, FlowNodeSerialized } from '../editor/editorTypes';

export interface RecipeStepsViewerProps {
    nodes: FlowNodeSerialized[];
    edges: FlowEdgeSerialized[];
    ingredients?: { id: string; name: string; amount?: string; unit?: string }[];
}

export interface TimerState {
    remaining: number; // seconds left
    running: boolean;
    total: number; // total seconds
}

export interface ViewerState {
    completed: Set<string>;
    timers: Map<string, TimerState>;
}

export type ViewerAction =
    | { type: 'toggle'; nodeId: string }
    | { type: 'timerStart'; nodeId: string }
    | { type: 'timerPause'; nodeId: string }
    | { type: 'timerReset'; nodeId: string }
    | { type: 'timerTick' }
    | { type: 'init'; timers: Map<string, TimerState> };

export function viewerReducer(state: ViewerState, action: ViewerAction): ViewerState {
    switch (action.type) {
        case 'toggle': {
            const next = new Set(state.completed);
            const t = state.timers.get(action.nodeId);
            if (next.has(action.nodeId)) {
                next.delete(action.nodeId);
                // Reset timer when uncompleting so the card isn't left in timerDone visual state
                if (t && t.total > 0) {
                    const nextTimers = new Map(state.timers);
                    nextTimers.set(action.nodeId, {
                        remaining: t.total,
                        running: false,
                        total: t.total,
                    });
                    return { completed: next, timers: nextTimers };
                }
                return { ...state, completed: next };
            }
            next.add(action.nodeId);
            // Finish the timer when marking as done
            if (t && (t.running || t.remaining > 0)) {
                const nextTimers = new Map(state.timers);
                nextTimers.set(action.nodeId, { ...t, running: false, remaining: 0 });
                return { completed: next, timers: nextTimers };
            }
            return { ...state, completed: next };
        }
        case 'timerStart': {
            const t = state.timers.get(action.nodeId);
            if (!t || t.remaining === 0) return state;
            const next = new Map(state.timers);
            next.set(action.nodeId, { ...t, running: true });
            return { ...state, timers: next };
        }
        case 'timerPause': {
            const t = state.timers.get(action.nodeId);
            if (!t) return state;
            const next = new Map(state.timers);
            next.set(action.nodeId, { ...t, running: false });
            return { ...state, timers: next };
        }
        case 'timerReset': {
            const t = state.timers.get(action.nodeId);
            if (!t) return state;
            const next = new Map(state.timers);
            next.set(action.nodeId, { remaining: t.total, running: false, total: t.total });
            return { ...state, timers: next };
        }
        case 'timerTick': {
            let changed = false;
            const next = new Map(state.timers);
            for (const [id, t] of next) {
                if (!t.running) continue;
                if (t.remaining <= 0) {
                    next.set(id, { ...t, running: false });
                    changed = true;
                } else {
                    next.set(id, { ...t, remaining: t.remaining - 1 });
                    changed = true;
                }
            }
            return changed ? { ...state, timers: next } : state;
        }
        case 'init':
            return { ...state, timers: action.timers };
        default:
            return state;
    }
}
