'use client';

import type { Edge } from '@xyflow/react';
import { useCallback } from 'react';

import type { RecipeFlowNode } from './editorTypes';

/* Inline minimal types for dagre@0.8.5 — @types/dagre is excluded from tsconfig "types" */
interface DagreGraph {
    setDefaultEdgeLabel(fn: () => Record<string, unknown>): void;
    setGraph(opts: {
        rankdir?: string;
        nodesep?: number;
        ranksep?: number;
        marginx?: number;
        marginy?: number;
    }): void;
    setNode(id: string, opts: { width: number; height: number }): void;
    setEdge(source: string, target: string): void;
    node(id: string): { x: number; y: number };
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const dagre = require('dagre') as {
    graphlib: { Graph: new () => DagreGraph };
    layout: (g: DagreGraph) => void;
};

const NODE_WIDTH = 240;
const NODE_HEIGHT_BASE = 160;
const NODE_HEIGHT_WITH_IMAGE = 240; // base + 72px image + extra padding

/**
 * Returns a layout function that repositions nodes using dagre.
 * Call the returned `applyLayout` with the current nodes+edges to get
 * a new nodes array with updated positions.
 */
export function useFlowAutoLayout(direction: 'TB' | 'LR' = 'LR') {
    const applyLayout = useCallback(
        (nodes: RecipeFlowNode[], edges: Edge[]): RecipeFlowNode[] => {
            const g = new dagre.graphlib.Graph();
            g.setDefaultEdgeLabel(() => ({}));
            g.setGraph({
                rankdir: direction,
                nodesep: 60,
                ranksep: 80,
                marginx: 40,
                marginy: 40,
            });

            for (const node of nodes) {
                const measuredH = (node as { measured?: { height?: number } }).measured?.height;
                const height = measuredH
                    ? measuredH + 20 // add a small buffer around the measured size
                    : node.data?.photoUrl
                      ? NODE_HEIGHT_WITH_IMAGE
                      : NODE_HEIGHT_BASE;
                g.setNode(node.id, { width: NODE_WIDTH, height });
            }

            for (const edge of edges) {
                g.setEdge(edge.source, edge.target);
            }

            dagre.layout(g);

            return nodes.map((node) => {
                const { x, y } = g.node(node.id);
                return {
                    ...node,
                    position: {
                        // dagre returns the center; xyflow wants the top-left corner
                        x: x - NODE_WIDTH / 2,
                        y: y - NODE_HEIGHT_BASE / 2,
                    },
                };
            });
        },
        [direction],
    );

    return applyLayout;
}
