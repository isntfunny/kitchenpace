/** Safety margin before the longest dish is done, in minutes (KUC-109). */
export const START_BUFFER_MIN = 10;

export interface FlowNodeLike {
    id: string;
    duration?: number | null;
}
export interface FlowEdgeLike {
    source: string;
    target: string;
}

/**
 * Longest path through the flow by node duration (critical path), in minutes. Cycles are cut at
 * the edge that closes them. Returns 0 for missing or empty data.
 */
export function criticalPathMinutes(
    nodes: readonly FlowNodeLike[],
    edges: readonly FlowEdgeLike[],
): number {
    const duration = new Map<string, number>();
    for (const node of nodes) {
        const value = Number(node.duration ?? 0);
        duration.set(node.id, Number.isFinite(value) && value > 0 ? value : 0);
    }
    const next = new Map<string, string[]>();
    for (const edge of edges) {
        if (!duration.has(edge.source) || !duration.has(edge.target)) continue;
        next.set(edge.source, [...(next.get(edge.source) ?? []), edge.target]);
    }

    const memo = new Map<string, number>();
    const visiting = new Set<string>();
    const longestFrom = (id: string): number => {
        const known = memo.get(id);
        if (known !== undefined) return known;
        if (visiting.has(id)) return 0; // cycle: ignore the closing edge
        visiting.add(id);
        let best = 0;
        for (const target of next.get(id) ?? []) best = Math.max(best, longestFrom(target));
        visiting.delete(id);
        const total = (duration.get(id) ?? 0) + best;
        memo.set(id, total);
        return total;
    };

    let longest = 0;
    for (const id of duration.keys()) longest = Math.max(longest, longestFrom(id));
    return longest;
}

export interface RecipeTimes {
    flowNodes?: unknown;
    flowEdges?: unknown;
    totalTime?: number | null;
    prepTime?: number | null;
    cookTime?: number | null;
}

function asList<T>(value: unknown): T[] {
    return Array.isArray(value) ? (value as T[]) : [];
}

/**
 * Minutes a dish takes from start to serving: critical path of the flow, else `totalTime`, else
 * prep plus cook time, else 0 (unknown).
 */
export function cookDurationMinutes(recipe: RecipeTimes): number {
    const path = criticalPathMinutes(
        asList<FlowNodeLike>(recipe.flowNodes).filter(
            (node) => node && typeof node.id === 'string',
        ),
        asList<FlowEdgeLike>(recipe.flowEdges).filter(
            (edge) => edge && typeof edge.source === 'string',
        ),
    );
    if (path > 0) return Math.round(path);
    const total = Number(recipe.totalTime ?? 0);
    if (total > 0) return Math.round(total);
    const sum = Number(recipe.prepTime ?? 0) + Number(recipe.cookTime ?? 0);
    return sum > 0 ? Math.round(sum) : 0;
}
