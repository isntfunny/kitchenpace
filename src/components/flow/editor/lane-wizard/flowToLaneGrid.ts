import type { FlowEdgeSerialized, FlowNodeSerialized } from '../editorTypes';

import type { LaneGrid, LaneSegment, LaneStep } from './types';

/**
 * flowToLaneGrid — projects the existing xyflow recipe graph
 * (`Recipe.flowNodes` / `Recipe.flowEdges`) into the Lane-Wizard's
 * segment/lane model **for read-only display**.
 *
 * This is intentionally ONE-WAY and best-effort:
 *  - the xyflow data stays the single source of truth (nothing is persisted),
 *  - ANY directed acyclic graph maps onto segments + lanes: the graph is
 *    decomposed into maximal linear chains, and every fork/merge becomes a
 *    segment boundary. Lanes whose task keeps running across a boundary get
 *    `continuation` fillers — the same visual language the editor's own
 *    SPLIT/MERGE actions produce. Nested forks, partial merges, skip edges
 *    (fork edge straight into a merge), multiple roots and dead-end branches
 *    are all handled structurally.
 *  - only genuinely broken data (cycles) and graphs too wide to read
 *    (> MAX_PARALLEL_LANES concurrent lanes) fall back to a single-lane
 *    topological list so the viewer degrades gracefully instead of crashing.
 *
 * Because it is display-only, we never hit the lossy round-trip problem that
 * a real DAG<->lane *migration* would have.
 */
export interface FlowToLaneGridResult {
    grid: LaneGrid;
    /** true = structural lane mapping; false = degraded linear fallback */
    clean: boolean;
    /** human-readable reason when `clean` is false (for dev/telemetry) */
    reason?: string;
}

/** More concurrent lanes than this are unreadable — degrade to the list. */
const MAX_PARALLEL_LANES = 6;

const toStep = (n: FlowNodeSerialized): LaneStep => ({
    id: n.id,
    type: n.type,
    label: n.label,
    description: n.description,
    duration: n.duration,
    ingredientIds: n.ingredientIds,
});

const chainDuration = (chain: FlowNodeSerialized[]): number =>
    chain.reduce((acc, n) => acc + (n.duration ?? 0), 0);

/** Distribute a total column count `m` across `n` lanes (sum stays = m). */
function columnSpansFor(n: number, m: number): number[] {
    if (n <= 1) return [m];
    if (n >= m) return Array.from({ length: n }, () => 1);
    const base = Math.floor(m / n);
    const rem = m % n;
    return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
}

/**
 * A lane that is alive between two structural events (fork/merge).
 * `chain === null` marks a passing track: a fork edge that runs straight
 * into a merge without any steps of its own — it occupies a lane and
 * renders as a continuation filler until the merge consumes it.
 */
interface Track {
    key: number;
    chain: FlowNodeSerialized[] | null;
    /** Merge node that will consume this track (null = runs until the end). */
    outlet: string | null;
    /** Last real node — colours/labels this track's continuation fillers. */
    source: FlowNodeSerialized;
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
    // Self-loops and duplicate edges would fake cycles/merges — drop them.
    const seenEdges = new Set<string>();
    for (const e of edges) {
        if (!nodeById.has(e.source) || !nodeById.has(e.target)) continue;
        if (e.source === e.target) continue;
        const key = `${e.source} -> ${e.target}`;
        if (seenEdges.has(key)) continue;
        seenEdges.add(key);
        outgoing.get(e.source)!.push(e.target);
        incoming.get(e.target)!.push(e.source);
    }

    const fallback = (reason: string): FlowToLaneGridResult => ({
        grid: linearFallback(nodes, outgoing, incoming),
        clean: false,
        reason,
    });

    // Longest-path rank orders the structural events. Needs a DAG.
    const rank = computeRanks(nodes, outgoing, incoming);
    if (!rank) return fallback('graph contains a cycle');

    /* ── 1) Chain decomposition ──────────────────────────────────────────
       A chain is a maximal linear run (interior nodes have exactly one
       incoming and one outgoing edge). Chain heads are roots, merge nodes
       (indeg > 1) and fork children (pred outdeg > 1); every node belongs
       to exactly one chain. */
    const isHead = (id: string): boolean => {
        const ins = incoming.get(id)!;
        return ins.length !== 1 || outgoing.get(ins[0])!.length > 1;
    };
    const chainByHead = new Map<string, FlowNodeSerialized[]>();
    let chainedNodes = 0;
    for (const n of nodes) {
        if (!isHead(n.id)) continue;
        const chain: FlowNodeSerialized[] = [n];
        let cur = n.id;
        for (;;) {
            const outs = outgoing.get(cur)!;
            if (outs.length !== 1) break;
            const next = outs[0];
            if (incoming.get(next)!.length !== 1) break;
            chain.push(nodeById.get(next)!);
            cur = next;
        }
        chainByHead.set(n.id, chain);
        chainedNodes += chain.length;
    }
    if (chainedNodes !== nodes.length) {
        return fallback(`chain decomposition covered ${chainedNodes}/${nodes.length} nodes`);
    }

    /* ── 2) Structural events, ordered by topological rank ────────────── */
    const events: { rank: number; kind: 'merge' | 'fork'; node: string }[] = [];
    for (const n of nodes) {
        if (incoming.get(n.id)!.length > 1) {
            events.push({ rank: rank.get(n.id)!, kind: 'merge', node: n.id });
        }
        if (outgoing.get(n.id)!.length > 1) {
            events.push({ rank: rank.get(n.id)!, kind: 'fork', node: n.id });
        }
    }
    // Merges sort before forks on equal rank: a node that is both merge and
    // fork must be born by its merge before its own fork can consume it.
    events.sort(
        (a, b) =>
            a.rank - b.rank ||
            (a.kind !== b.kind ? (a.kind === 'merge' ? -1 : 1) : a.node < b.node ? -1 : 1),
    );

    /* ── 3) Sweep: keep an ordered list of live tracks, emit one segment
            per event. Born tracks show their steps, surviving tracks show
            continuation fillers. ─────────────────────────────────────── */
    let trackKey = 0;
    let contId = 0;
    const tracks: Track[] = [];
    const trackByForkTail = new Map<string, Track>();
    const rawSegments: LaneStep[][][] = [];

    const contStep = (tr: Track): LaneStep => ({
        id: `lw-cont-${contId++}`,
        type: tr.source.type,
        label: tr.source.label,
        description: '',
        continuation: true,
    });

    const makeChainTrack = (headId: string): Track => {
        const chain = chainByHead.get(headId)!;
        const tail = chain[chain.length - 1];
        const outs = outgoing.get(tail.id)!;
        const track: Track = {
            key: trackKey++,
            chain,
            outlet: outs.length === 1 ? outs[0] : null,
            source: tail,
        };
        if (outs.length > 1) trackByForkTail.set(tail.id, track);
        return track;
    };

    const emitSegment = (bornKeys: Set<number>) => {
        rawSegments.push(
            tracks.map((tr) =>
                bornKeys.has(tr.key) && tr.chain ? tr.chain.map(toStep) : [contStep(tr)],
            ),
        );
    };

    // Birth all root chains side by side (longest task first, like the editor).
    const rootTracks = nodes
        .filter((n) => incoming.get(n.id)!.length === 0)
        .map((n) => makeChainTrack(n.id));
    rootTracks.sort((a, b) => chainDuration(b.chain!) - chainDuration(a.chain!));
    tracks.push(...rootTracks);
    emitSegment(new Set(tracks.map((t) => t.key)));

    let maxLanes = tracks.length;
    for (const ev of events) {
        if (ev.kind === 'merge') {
            const consumedIdx: number[] = [];
            for (let i = 0; i < tracks.length; i++) {
                if (tracks[i].outlet === ev.node) consumedIdx.push(i);
            }
            if (consumedIdx.length === 0) return fallback('merge without live input lanes');
            const insertAt = consumedIdx[0];
            const merged = makeChainTrack(ev.node);
            for (let k = consumedIdx.length - 1; k >= 0; k--) tracks.splice(consumedIdx[k], 1);
            tracks.splice(Math.min(insertAt, tracks.length), 0, merged);
            emitSegment(new Set([merged.key]));
        } else {
            const parent = trackByForkTail.get(ev.node);
            const idx = parent ? tracks.indexOf(parent) : -1;
            if (!parent || idx === -1) return fallback('fork on a dead lane');
            const children: Track[] = outgoing.get(ev.node)!.map((t) => {
                if (incoming.get(t)!.length > 1) {
                    // Skip edge straight into a merge — lane with no own steps.
                    return { key: trackKey++, chain: null, outlet: t, source: parent.source };
                }
                return makeChainTrack(t);
            });
            children.sort((a, b) => chainDuration(b.chain ?? []) - chainDuration(a.chain ?? []));
            tracks.splice(idx, 1, ...children);
            emitSegment(new Set(children.map((c) => c.key)));
        }
        maxLanes = Math.max(maxLanes, tracks.length);
    }

    if (maxLanes > MAX_PARALLEL_LANES) {
        return fallback(
            `${maxLanes} concurrent lanes exceed the readable max of ${MAX_PARALLEL_LANES}`,
        );
    }

    // Every real step must appear exactly once (defensive — holds on any DAG).
    let placed = 0;
    for (const seg of rawSegments) {
        for (const lane of seg) for (const s of lane) if (!s.continuation) placed++;
    }
    if (placed !== nodes.length) {
        return fallback(`placed ${placed}/${nodes.length} steps`);
    }

    const laneMax = rawSegments.reduce((m, seg) => Math.max(m, seg.length), 1);
    const laneSegments: LaneSegment[] = rawSegments.map((seg, i) => ({
        id: `seg-${i}`,
        lanes: seg,
        columnSpans: columnSpansFor(seg.length, laneMax),
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

/** Degraded mode: every node as one lane, in topological order. */
function linearFallback(
    nodes: FlowNodeSerialized[],
    outgoing: Map<string, string[]>,
    incoming: Map<string, string[]>,
): LaneGrid {
    const indeg = new Map<string, number>();
    for (const n of nodes) indeg.set(n.id, incoming.get(n.id)!.length);
    // Depth-first over ready nodes so each branch stays contiguous instead
    // of interleaving parallel branches step by step (BFS would).
    const ready: string[] = nodes.filter((n) => indeg.get(n.id) === 0).map((n) => n.id);
    const order: string[] = [];
    const seen = new Set<string>();
    while (ready.length) {
        const id = ready.shift()!;
        if (seen.has(id)) continue;
        seen.add(id);
        order.push(id);
        const nowReady: string[] = [];
        for (const t of outgoing.get(id)!) {
            indeg.set(t, indeg.get(t)! - 1);
            if (indeg.get(t)! <= 0) nowReady.push(t);
        }
        ready.unshift(...nowReady);
    }
    // Append any nodes left out by a cycle, preserving input order.
    for (const n of nodes) if (!seen.has(n.id)) order.push(n.id);

    const byId = new Map(nodes.map((n) => [n.id, n] as const));
    const lane: LaneStep[] = order.map((id) => toStep(byId.get(id)!));
    return { segments: [{ id: 'seg-0', lanes: [lane], columnSpans: [1] }] };
}
