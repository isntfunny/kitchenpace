'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { FlowEdgeSerialized, FlowNodeSerialized } from '../editor/editorTypes';

export function useMobileNavigation(
    columnGroups: FlowNodeSerialized[][],
    edges: FlowEdgeSerialized[],
    onNavigate?: (nodeId: string) => void,
) {
    const [position, setPosition] = useState({ col: 0, row: 0 });
    const touchStart = useRef<{ x: number; y: number } | null>(null);

    const { col, row } = position;
    const currentGroup = columnGroups[col] ?? [];
    const currentNode = currentGroup[row];

    // Build edge-based navigation lookups: nodeId → outgoing/incoming target nodeIds
    const { outgoingMap, incomingMap, nodePos } = useMemo(() => {
        const out = new Map<string, string[]>();
        const inc = new Map<string, string[]>();
        const pos = new Map<string, { col: number; row: number }>();
        for (let c = 0; c < columnGroups.length; c++) {
            for (let r = 0; r < columnGroups[c].length; r++) {
                const id = columnGroups[c][r].id;
                pos.set(id, { col: c, row: r });
                if (!out.has(id)) out.set(id, []);
                if (!inc.has(id)) inc.set(id, []);
            }
        }
        for (const e of edges) {
            out.get(e.source)?.push(e.target);
            inc.get(e.target)?.push(e.source);
        }
        return { outgoingMap: out, incomingMap: inc, nodePos: pos };
    }, [columnGroups, edges]);

    // Notify parent when the active node changes (used for cast sync).
    useEffect(() => {
        if (currentNode && onNavigate) onNavigate(currentNode.id);
        // onNavigate is intentionally excluded from deps — we only care about nodeId changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentNode?.id]);

    // Edge-aware navigation
    const targets = currentNode ? (outgoingMap.get(currentNode.id) ?? []) : [];
    const sources = currentNode ? (incomingMap.get(currentNode.id) ?? []) : [];

    const canGoRight = targets.length > 0;
    const canGoLeft = sources.length > 0;

    // Cross-column branch detection: find parallel branches that span the current column.
    // A node on another branch is "parallel" if it sits in a column range that overlaps
    // the current column. We find all nodes whose column range (their col .. their
    // furthest-downstream col before a shared merge) overlaps with `col`.
    // Simplified approach: collect all nodes from other branches that are reachable
    // from a common ancestor and haven't merged yet at the current column.
    const parallelBranches = useMemo(() => {
        if (!currentNode) return [];
        // Walk backward from currentNode to find the nearest fork ancestor
        const findForkAncestor = (nodeId: string): string | null => {
            let cur = nodeId;
            const visited = new Set<string>();
            while (cur) {
                if (visited.has(cur)) break;
                visited.add(cur);
                // Check if this node has multiple outgoing edges (it's a fork)
                if ((outgoingMap.get(cur) ?? []).length > 1) return cur;
                // Go to parent
                const parents = incomingMap.get(cur) ?? [];
                if (parents.length !== 1) break;
                cur = parents[0];
            }
            return null;
        };

        const forkId = findForkAncestor(currentNode.id);
        if (!forkId) return [];

        // Get all branches from this fork
        const forkChildren = outgoingMap.get(forkId) ?? [];
        if (forkChildren.length < 2) return [];

        // Find which branch the current node is on
        const isOnBranch = (branchStartId: string, targetId: string): boolean => {
            const visited = new Set<string>();
            const q = [branchStartId];
            while (q.length > 0) {
                const id = q.shift()!;
                if (id === targetId) return true;
                if (visited.has(id)) continue;
                visited.add(id);
                for (const child of outgoingMap.get(id) ?? []) q.push(child);
            }
            return false;
        };

        // Collect first node of each other branch
        const result: { node: FlowNodeSerialized; col: number; row: number }[] = [];
        for (const branchStart of forkChildren) {
            if (branchStart === currentNode.id) continue;
            if (isOnBranch(branchStart, currentNode.id)) continue;

            // Find the node on this branch closest to the current column
            // Walk the branch and collect all nodes
            const branchNodes: string[] = [];
            const visited = new Set<string>();
            const q = [branchStart];
            while (q.length > 0) {
                const id = q.shift()!;
                if (visited.has(id)) continue;
                visited.add(id);
                branchNodes.push(id);
                // Stop at merge points (nodes with >1 incoming edge)
                const inc = incomingMap.get(id) ?? [];
                if (inc.length > 1 && id !== branchStart) continue;
                for (const child of outgoingMap.get(id) ?? []) q.push(child);
            }

            // Find the branch node closest to current column
            let bestNode: string | null = null;
            let bestDist = Infinity;
            for (const bid of branchNodes) {
                const pos = nodePos.get(bid);
                if (!pos) continue;
                const dist = Math.abs(pos.col - col);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestNode = bid;
                }
            }

            if (bestNode) {
                const pos = nodePos.get(bestNode)!;
                const node = columnGroups[pos.col]?.[pos.row];
                if (node) result.push({ node, ...pos });
            }
        }

        return result;
    }, [currentNode, col, outgoingMap, incomingMap, nodePos, columnGroups]);

    // Same-column lanes
    const hasLaneAbove = row > 0;
    const hasLaneBelow = row < currentGroup.length - 1;
    const hasMultipleLanes = currentGroup.length > 1;

    // Combined: can branch-switch if same-column lanes OR parallel branches exist
    const canBranchUp = hasLaneAbove || parallelBranches.length > 0;
    const canBranchDown = hasLaneBelow || parallelBranches.length > 0;
    const hasBranching = hasMultipleLanes || parallelBranches.length > 0;

    const goRight = useCallback(() => {
        if (!currentNode) return;
        const tgts = outgoingMap.get(currentNode.id) ?? [];
        if (tgts.length === 0) return;
        const targetPos = nodePos.get(tgts[0]);
        if (targetPos) setPosition(targetPos);
    }, [currentNode, outgoingMap, nodePos]);

    const goLeft = useCallback(() => {
        if (!currentNode) return;
        const srcs = incomingMap.get(currentNode.id) ?? [];
        if (srcs.length === 0) return;
        const sourcePos = nodePos.get(srcs[0]);
        if (sourcePos) setPosition(sourcePos);
    }, [currentNode, incomingMap, nodePos]);

    const goLaneUp = useCallback(() => {
        if (hasLaneAbove) {
            setPosition((p) => ({ ...p, row: p.row - 1 }));
        } else if (parallelBranches.length > 0) {
            const target = parallelBranches[0];
            setPosition({ col: target.col, row: target.row });
        }
    }, [hasLaneAbove, parallelBranches]);

    const goLaneDown = useCallback(() => {
        if (hasLaneBelow) {
            setPosition((p) => ({ ...p, row: p.row + 1 }));
        } else if (parallelBranches.length > 0) {
            const target = parallelBranches[parallelBranches.length - 1];
            setPosition({ col: target.col, row: target.row });
        }
    }, [hasLaneBelow, parallelBranches]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    goLeft();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    goRight();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    goLaneUp();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    goLaneDown();
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [goLeft, goRight, goLaneUp, goLaneDown]);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart.current) return;
        const dx = e.changedTouches[0].clientX - touchStart.current.x;
        const dy = e.changedTouches[0].clientY - touchStart.current.y;
        const threshold = 50;
        touchStart.current = null;

        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (absDx > absDy && absDx > threshold) {
            if (dx < 0) goRight();
            else goLeft();
        } else if (absDy > threshold && hasBranching) {
            if (dy < 0) goLaneDown();
            else goLaneUp();
        }
    };

    return {
        col,
        row,
        currentNode,
        currentGroup,
        canGoLeft,
        canGoRight,
        canBranchUp,
        canBranchDown,
        hasBranching,
        hasLaneAbove,
        hasLaneBelow,
        hasMultipleLanes,
        parallelBranches,
        goLeft,
        goRight,
        goLaneUp,
        goLaneDown,
        handleTouchStart,
        handleTouchEnd,
        setPosition,
    };
}
