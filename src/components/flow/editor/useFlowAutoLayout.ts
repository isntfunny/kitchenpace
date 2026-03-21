'use client';

import type { Edge } from '@xyflow/react';
import { useCallback } from 'react';

import { computeFlowLayout, NODE_HEIGHT_BASE, NODE_HEIGHT_WITH_IMAGE } from '@app/lib/flow-layout';
import type { LayoutEdge, LayoutNode } from '@app/lib/flow-layout';

import type { RecipeFlowNode } from './editorTypes';

/**
 * React hook wrapping the pure layout function for use in the flow editor.
 * Converts xyflow nodes ↔ LayoutNodes and applies measured heights.
 */
export function useFlowAutoLayout(direction: 'TB' | 'LR' = 'LR') {
    const applyLayout = useCallback(
        (nodes: RecipeFlowNode[], edges: Edge[]): RecipeFlowNode[] => {
            const layoutNodes: LayoutNode[] = nodes.map((node) => {
                const measuredH = (node as { measured?: { height?: number } }).measured?.height;
                const height = measuredH
                    ? measuredH + 20
                    : node.data?.photoKey
                      ? NODE_HEIGHT_WITH_IMAGE
                      : NODE_HEIGHT_BASE;
                return { id: node.id, height };
            });

            const layoutEdges: LayoutEdge[] = edges.map((e) => ({
                source: e.source,
                target: e.target,
            }));

            const positions = computeFlowLayout(layoutNodes, layoutEdges, direction);

            return nodes.map((node) => ({
                ...node,
                position: positions.get(node.id) ?? node.position,
            }));
        },
        [direction],
    );

    return applyLayout;
}
