/**
 * Pure dagre layout — no React, no xyflow dependency.
 * Used by the flow editor hook AND the importer pipeline.
 */

import dagre from 'dagre';

const NODE_WIDTH = 240;
export const NODE_HEIGHT_BASE = 160;
export const NODE_HEIGHT_WITH_IMAGE = 240;

export interface LayoutNode {
    id: string;
    height?: number; // override node height (e.g. measured or has photo)
}

export interface LayoutEdge {
    source: string;
    target: string;
}

/** Collect all single-parent descendants from a node (the "branch"). */
function collectBranch(
    nodeId: string,
    childrenMap: Map<string, string[]>,
    incomingCount: Map<string, number>,
): string[] {
    const branch = [nodeId];
    let current = nodeId;
    while (true) {
        const kids = childrenMap.get(current) ?? [];
        const singleKid = kids.find((k) => (incomingCount.get(k) ?? 0) <= 1);
        if (!singleKid || kids.length > 1) break;
        branch.push(singleKid);
        current = singleKid;
    }
    return branch;
}

/** Generate all permutations of an array (only for small arrays ≤6). */
function permutations<T>(arr: T[]): T[][] {
    if (arr.length <= 1) return [arr];
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i++) {
        const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
        for (const perm of permutations(rest)) {
            result.push([arr[i], ...perm]);
        }
    }
    return result;
}

/**
 * Compute {x, y} positions for each node using dagre.
 * Returns a Map from node id to top-left position (xyflow convention).
 */
export function computeFlowLayout(
    nodes: LayoutNode[],
    edges: LayoutEdge[],
    direction: 'TB' | 'LR' = 'LR',
): Map<string, { x: number; y: number }> {
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({
        rankdir: direction,
        nodesep: 70,
        ranksep: 100,
        marginx: 40,
        marginy: 40,
    });

    const nodeHeights = new Map<string, number>();
    for (const node of nodes) {
        const h = node.height ?? NODE_HEIGHT_BASE;
        nodeHeights.set(node.id, h);
        g.setNode(node.id, { width: NODE_WIDTH, height: h });
    }

    for (const edge of edges) {
        g.setEdge(edge.source, edge.target);
    }

    dagre.layout(g);

    // ── Build adjacency ──
    const children = new Map<string, string[]>();
    for (const node of nodes) children.set(node.id, []);
    for (const edge of edges) children.get(edge.source)?.push(edge.target);

    const incomingCount = new Map<string, number>();
    for (const node of nodes) incomingCount.set(node.id, 0);
    for (const edge of edges) {
        incomingCount.set(edge.target, (incomingCount.get(edge.target) ?? 0) + 1);
    }

    const pos = new Map<string, { x: number; y: number }>();
    for (const node of nodes) pos.set(node.id, g.node(node.id));

    const rankKey = direction === 'LR' ? 'x' : 'y';
    const crossKey = direction === 'LR' ? 'y' : 'x';

    // ── Step 1: Align branch starts ──
    function shiftSubtree(nodeId: string, delta: number): void {
        const p = pos.get(nodeId);
        if (!p) return;
        p[rankKey] += delta;
        for (const childId of children.get(nodeId) ?? []) {
            if ((incomingCount.get(childId) ?? 0) <= 1) {
                shiftSubtree(childId, delta);
            }
        }
    }

    for (const [, kids] of children.entries()) {
        if (kids.length < 2) continue;
        const kidRanks = kids.map((id) => pos.get(id)![rankKey]);
        const minRank = Math.min(...kidRanks);
        for (let i = 0; i < kids.length; i++) {
            const delta = minRank - kidRanks[i];
            if (delta !== 0) shiftSubtree(kids[i], delta);
        }
    }

    // ── Step 2: Reorder split children — minimise longest edge ──
    for (const [, kids] of children.entries()) {
        if (kids.length < 2 || kids.length > 6) continue;

        const branches = kids.map((kid) => ({
            kid,
            nodes: collectBranch(kid, children, incomingCount),
        }));

        const branchNodeSet = new Set(branches.flatMap((b) => b.nodes));
        const relevantEdges = edges.filter(
            (e) => branchNodeSet.has(e.source) || branchNodeSet.has(e.target),
        );

        const ySlots = kids.map((id) => pos.get(id)![crossKey]).sort((a, b) => a - b);

        const perms = permutations(branches);
        let bestPerm = branches;
        let bestMax = Infinity;
        let bestSum = Infinity;

        for (const perm of perms) {
            const tempY = new Map<string, number>();
            for (let i = 0; i < perm.length; i++) {
                const delta = ySlots[i] - pos.get(perm[i].kid)![crossKey];
                for (const nodeId of perm[i].nodes) {
                    tempY.set(nodeId, pos.get(nodeId)![crossKey] + delta);
                }
            }

            let maxLen = 0;
            let sumLen = 0;
            for (const edge of relevantEdges) {
                const sx = pos.get(edge.source)![rankKey];
                const sy = tempY.get(edge.source) ?? pos.get(edge.source)![crossKey];
                const tx = pos.get(edge.target)![rankKey];
                const ty = tempY.get(edge.target) ?? pos.get(edge.target)![crossKey];
                const len = Math.sqrt((tx - sx) ** 2 + (ty - sy) ** 2);
                if (len > maxLen) maxLen = len;
                sumLen += len;
            }

            // Primary: minimise the longest edge. Tiebreaker: minimise sum.
            if (maxLen < bestMax - 0.1 || (Math.abs(maxLen - bestMax) < 0.1 && sumLen < bestSum)) {
                bestMax = maxLen;
                bestSum = sumLen;
                bestPerm = perm;
            }
        }

        for (let i = 0; i < bestPerm.length; i++) {
            const delta = ySlots[i] - pos.get(bestPerm[i].kid)![crossKey];
            for (const nodeId of bestPerm[i].nodes) {
                pos.get(nodeId)![crossKey] += delta;
            }
        }
    }

    // ── Convert center → top-left ──
    const result = new Map<string, { x: number; y: number }>();
    for (const node of nodes) {
        const { x, y } = pos.get(node.id)!;
        result.set(node.id, {
            x: x - NODE_WIDTH / 2,
            y: y - (nodeHeights.get(node.id) ?? NODE_HEIGHT_BASE) / 2,
        });
    }
    return result;
}
