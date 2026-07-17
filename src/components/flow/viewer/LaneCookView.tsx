'use client';

import { useMemo } from 'react';

import type { FlowEdgeSerialized, FlowNodeSerialized, IngredientRef } from '../editor/editorTypes';
import { LaneWizard } from '../editor/lane-wizard';
import { flowToLaneGrid } from '../editor/lane-wizard/flowToLaneGrid';

interface LaneCookViewProps {
    nodes: FlowNodeSerialized[];
    edges: FlowEdgeSerialized[];
    ingredients?: IngredientRef[];
    photosByStepId?: Record<string, string>;
}

/**
 * Read-only consumption view that renders the recipe via the Lane-Wizard's
 * swimlane model, projected in-memory from the existing xyflow flow data
 * (`flowToLaneGrid`). Flag-gated by `laneView` — the xyflow `flowNodes`/
 * `flowEdges` stay the single source of truth; nothing is persisted here.
 */
export function LaneCookView({ nodes, edges, ingredients, photosByStepId }: LaneCookViewProps) {
    const grid = useMemo(() => {
        const result = flowToLaneGrid(nodes, edges);
        if (!result.clean && process.env.NODE_ENV !== 'production') {
            console.warn(`[LaneCookView] linear fallback: ${result.reason}`);
        }
        return result.grid;
    }, [nodes, edges]);

    return (
        <LaneWizard
            initialGrid={grid}
            mode="view"
            ingredients={ingredients}
            photosByStepId={photosByStepId}
        />
    );
}
