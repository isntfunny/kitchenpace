import type { FlowEdgeSerialized, FlowNodeSerialized } from '../editorTypes';

import type { LaneGrid, LaneSegment, LaneStep } from './types';

/**
 * flowToLaneGrid — projects the existing xyflow recipe graph
 * (`Recipe.flowNodes` / `Recipe.flowEdges`) into the Lane-Wizard's
 * segment/lane model **for read-only display**.
 *
 * This is intentionally ONE-WAY and best-effort:
 *  - the xyflow data stays the single source of truth (nothing is persisted),
 *  - a clean series-parallel DAG (linear spine + parallel branches that
 *    fork and re-merge) maps losslessly onto segments + lanes,
 *  - anything that is NOT cleanly series-parallel (nested forks, cross-lane
 *    edges, multiple roots, cycles) falls back to a single-lane topological
 *    list so the viewer degrades gracefully instead of crashing.
 *
 * Because it is display-only, we never hit the lossy round-trip problem that
 * a real DAG<->lane *migration* would have.
 */
export interface FlowToLaneGridResult {
    grid: LaneGrid;
    /** true = clean series-parallel mapping; false = degraded linear fallback */
    clean: boolean;
    /** human-readable reason when `clean` is false (for dev/telemetry) */
    reason?: string;
}

const toStep = (n: FlowNodeSerialized): LaneStep => ({
    id: n.id,
    type: n.type,
    label: n.label,
    description: n.description,
    duration: n.duration,
    ingredientIds: n.ingredientIds,
});

const laneDuration = (lane: FlowNodeSerialized[]): number =>
    lane.reduce((acc, n) => acc + (n.duration ?? 0), 0);

/** Distribute a total column count `m` across `n` lanes (sum stays = m). */
function columnSpansFor(n: number, m: number): number[] {
    if (n <= 1) return [m];
    if (n >= m) return Array.from({ length: n }, () => 1);
    const base = Math.floor(m / n);
    const rem = m % n;
    return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
}

export function flowToLaneGrid(
    nodes: FlowNodeSerialized[],
    edges: FlowEdgeSerialized[],
): FlowToLaneGridResult {
    if (!nodes || nodes.length === 0) {
        return { grid: { segments: [] }, clean: true };
    }

    const nodeById = new Map<string, FlowNodeSerialized>();
    const outgoing = new Map<string, string[]>();
    const incoming = new Map<string, string[]>();
    for (const n of nodes) {
        nodeById.set(n.id, n);
        outgoing.set(n.id, []);
        incoming.set(n.id, []);
    }
    for (const e of edges) {
        if (!nodeById.has(e.source) || !nodeById.has(e.target)) continue;
        outgoing.get(e.source)!.push(e.target);
        incoming.get(e.target)!.push(e.source);
    }

    const fallback = (reason: string): FlowToLaneGridResult => ({
        grid: linearFallback(nodes, outgoing, incoming),
        clean: false,
        reason,
    });

    // Single root required for a clean series-parallel walk.
    const roots = nodes.filter((n) => (incoming.get(n.id)!.length ?? 0) === 0);
    if (roots.length !== 1) {
        return fallback(`expected 1 root, found ${roots.length}`);
    }
    const start = roots[0];

    // Longest-path rank (for "nearest" common merge selection). Needs a DAG.
    const rank = computeRanks(nodes, outgoing, incoming);
    if (!rank) return fallback('graph contains a cycle');

    const segments: FlowNodeSerialized[][][] = []; // segment -> lane -> nodes
    const visited = new Set<string>();
    let cursor: FlowNodeSerialized | null = start;
    let guard = 0;
    const guardMax = nodes.length * 4 + 8;

    while (cursor && guard++ < guardMax) {
        // 1) Walk a single-lane chain until a fork, an end, or an upcoming merge.
        const chain: FlowNodeSerialized[] = [];
        let node: FlowNodeSerialized | null = cursor;
        while (node) {
            if (visited.has(node.id)) return fallback('revisited node in spine');
            visited.add(node.id);
            chain.push(node);
            const outs: string[] = outgoing.get(node.id)!;
            if (outs.length === 0) {
                node = null;
                break;
            }
            if (outs.length > 1) break; // fork — `node` stays as the fork point
            const next: FlowNodeSerialized = nodeById.get(outs[0])!;
            if ((incoming.get(next.id)!.length ?? 0) > 1) {
                // `next` is a merge → it begins the following segment
                node = next;
                break;
            }
            node = next;
        }
        if (chain.length) segments.push([chain]);

        if (!node) break;

        const outs = outgoing.get(node.id)!;
        if (outs.length > 1) {
            // 2) Fork: collect one linear lane per branch up to the common merge.
            const merge = nearestCommonMerge(outs, outgoing, rank);
            const laneChains: FlowNodeSerialized[][] = [];
            for (const branchStart of outs) {
                const lane = collectBranch(
                    branchStart,
                    merge,
                    nodeById,
                    outgoing,
                    incoming,
                    visited,
                );
                if (!lane) return fallback('branch is not linear (nested fork/merge)');
                laneChains.push(lane);
            }
            // Critical path (longest by time) on top.
            laneChains.sort((a, b) => laneDuration(b) - laneDuration(a));
            segments.push(laneChains);

            if (!merge) {
                cursor = null; // branches never reconverge → recipe ends in parallel
                break;
            }
            cursor = nodeById.get(merge)!;
        } else {
            // node was advanced to an upcoming merge; continue the spine from it.
            cursor = node;
        }
    }

    if (guard >= guardMax) return fallback('walk did not terminate');
    if (visited.size !== nodes.length) {
        return fallback(`covered ${visited.size}/${nodes.length} nodes`);
    }

    // Build LaneGrid with consistent column count across segments.
    const maxLanes = segments.reduce((m, seg) => Math.max(m, seg.length), 1);
    const laneSegments: LaneSegment[] = segments.map((seg, i) => ({
        id: `seg-${i}`,
        lanes: seg.map((lane) => lane.map(toStep)),
        columnSpans: columnSpansFor(seg.length, maxLanes),
    }));

    return { grid: { segments: laneSegments }, clean: true };
}

/* ── helpers ─────────────────────────────────────────────────────────── */

/** Longest-path rank from the roots. Returns null on a cycle. */
function computeRanks(
    nodes: FlowNodeSerialized[],
    outgoing: Map<string, string[]>,
    incoming: Map<string, string[]>,
): Map<string, number> | null {
    const indeg = new Map<string, number>();
    for (const n of nodes) indeg.set(n.id, incoming.get(n.id)!.length);
    const queue = nodes.filter((n) => indeg.get(n.id) === 0).map((n) => n.id);
    const rank = new Map<string, number>();
    for (const id of queue) rank.set(id, 0);
    let processed = 0;
    while (queue.length) {
        const id = queue.shift()!;
        processed++;
        for (const t of outgoing.get(id)!) {
            rank.set(t, Math.max(rank.get(t) ?? 0, (rank.get(id) ?? 0) + 1));
            indeg.set(t, indeg.get(t)! - 1);
            if (indeg.get(t) === 0) queue.push(t);
        }
    }
    return processed === nodes.length ? rank : null;
}

/** Forward-reachable set (inclusive) from a node. */
function reachable(startId: string, outgoing: Map<string, string[]>): Set<string> {
    const seen = new Set<string>();
    const stack = [startId];
    while (stack.length) {
        const id = stack.pop()!;
        if (seen.has(id)) continue;
        seen.add(id);
        for (const t of outgoing.get(id) ?? []) stack.push(t);
    }
    return seen;
}

/** The lowest-rank node reachable from ALL branch starts, or null. */
function nearestCommonMerge(
    branchStarts: string[],
    outgoing: Map<string, string[]>,
    rank: Map<string, number>,
): string | null {
    const sets = branchStarts.map((b) => reachable(b, outgoing));
    let common: Set<string> | null = null;
    for (const s of sets) {
        if (common === null) {
            common = new Set<string>(s);
        } else {
            const filtered = new Set<string>();
            for (const x of common) if (s.has(x)) filtered.add(x);
            common = filtered;
        }
    }
    if (!common || common.size === 0) return null;
    let best: string | null = null;
    let bestRank = Infinity;
    for (const id of common) {
        const r = rank.get(id) ?? Infinity;
        if (r < bestRank) {
            bestRank = r;
            best = id;
        }
    }
    return best;
}

/**
 * Walk a single branch from `startId` up to (excluding) `mergeId`.
 * Returns null if the branch is not a simple linear chain.
 */
function collectBranch(
    startId: string,
    mergeId: string | null,
    nodeById: Map<string, FlowNodeSerialized>,
    outgoing: Map<string, string[]>,
    incoming: Map<string, string[]>,
    visited: Set<string>,
): FlowNodeSerialized[] | null {
    const out: FlowNodeSerialized[] = [];
    let id: string | null = startId;
    const seen = new Set<string>();
    while (id && id !== mergeId) {
        if (seen.has(id) || visited.has(id)) return null;
        seen.add(id);
        visited.add(id);
        const node = nodeById.get(id);
        if (!node) return null;
        out.push(node);
        const outs: string[] = outgoing.get(id)!;
        if (outs.length === 0) {
            id = null;
            break; // branch ends without reaching the merge — allowed
        }
        if (outs.length > 1) return null; // nested fork → not linear
        const next: string = outs[0];
        if (next !== mergeId && (incoming.get(next)!.length ?? 0) > 1) {
            return null; // unexpected internal merge → not linear
        }
        id = next;
    }
    return out;
}

/** Degraded mode: every node as one lane, in topological order. */
function linearFallback(
    nodes: FlowNodeSerialized[],
    outgoing: Map<string, string[]>,
    incoming: Map<string, string[]>,
): LaneGrid {
    const indeg = new Map<string, number>();
    for (const n of nodes) indeg.set(n.id, incoming.get(n.id)!.length);
    const queue = nodes.filter((n) => indeg.get(n.id) === 0).map((n) => n.id);
    const order: string[] = [];
    const seen = new Set<string>();
    while (queue.length) {
        const id = queue.shift()!;
        if (seen.has(id)) continue;
        seen.add(id);
        order.push(id);
        for (const t of outgoing.get(id)!) {
            indeg.set(t, indeg.get(t)! - 1);
            if (indeg.get(t)! <= 0) queue.push(t);
        }
    }
    // Append any nodes left out by a cycle, preserving input order.
    for (const n of nodes) if (!seen.has(n.id)) order.push(n.id);

    const byId = new Map(nodes.map((n) => [n.id, n] as const));
    const lane: LaneStep[] = order.map((id) => toStep(byId.get(id)!));
    return { segments: [{ id: 'seg-0', lanes: [lane], columnSpans: [1] }] };
}
