import { Check } from 'lucide-react';

import { PALETTE } from '@app/lib/palette';

import { css } from 'styled-system/css';

import type { FlowEdgeSerialized, FlowNodeSerialized, StepType } from '../editor/editorTypes';
import { getStepConfig } from '../editor/stepConfig';

export function MobileMiniMap({
    columnGroups,
    edges,
    dagreY,
    completed,
    currentCol,
    currentRow,
    onNavigate,
}: {
    columnGroups: FlowNodeSerialized[][];
    edges: FlowEdgeSerialized[];
    dagreY: Map<string, number>;
    completed: Set<string>;
    currentCol: number;
    currentRow: number;
    onNavigate: (col: number, row: number) => void;
}) {
    const dotSize = 24;
    const connLen = 16;
    const padding = 4;

    // Derive Y bounds from dagre positions
    const allY = Array.from(dagreY.values());
    const minY = Math.min(...allY);
    const maxY = Math.max(...allY);
    const yRange = maxY - minY;

    // SVG dimensions
    const colWidth = dotSize + connLen;
    const totalWidth = columnGroups.length * colWidth - connLen;
    const maxLanes = Math.max(1, ...columnGroups.map((g) => g.length));
    const totalHeight =
        maxLanes > 1 ? maxLanes * (dotSize + padding) - padding + dotSize / 2 : dotSize + 12;

    // Map dagre Y to pixel Y, preserving dagre's relative spacing
    const getNodeX = (colIdx: number): number => colIdx * colWidth + dotSize / 2;
    const getNodeY = (nodeId: string): number => {
        if (yRange === 0) return totalHeight / 2;
        const y = dagreY.get(nodeId) ?? 0;
        return ((y - minY) / yRange) * (totalHeight - dotSize) + dotSize / 2;
    };

    // Build a nodeId → (colIdx, rowIdx) lookup for onNavigate
    const nodePosition = new Map<string, { col: number; row: number }>();
    for (let c = 0; c < columnGroups.length; c++) {
        for (let r = 0; r < columnGroups[c].length; r++) {
            nodePosition.set(columnGroups[c][r].id, { col: c, row: r });
        }
    }

    // Build connectors from actual edges
    const connectors: { x1: number; y1: number; x2: number; y2: number; done: boolean }[] = [];
    for (const edge of edges) {
        const src = nodePosition.get(edge.source);
        const tgt = nodePosition.get(edge.target);
        if (!src || !tgt) continue;
        connectors.push({
            x1: getNodeX(src.col) + dotSize / 2,
            y1: getNodeY(edge.source),
            x2: getNodeX(tgt.col) - dotSize / 2,
            y2: getNodeY(edge.target),
            done: completed.has(edge.source),
        });
    }

    return (
        <div
            className={css({
                display: 'flex',
                justifyContent: 'center',
                py: '3',
                px: '4',
                flexShrink: 0,
                overflowX: 'auto',
                backdropFilter: 'blur(12px)',
                bg: 'rgba(26, 23, 21, 0.6)',
                borderBottom: '1px solid rgba(224,123,83,0.1)',
            })}
        >
            <svg
                width={totalWidth}
                height={totalHeight}
                viewBox={`0 0 ${totalWidth} ${totalHeight}`}
                style={{ flexShrink: 0 }}
            >
                {/* Connector lines from actual edges */}
                {connectors.map((c, i) => (
                    <line
                        key={`conn-${i}`}
                        x1={c.x1}
                        y1={c.y1}
                        x2={c.x2}
                        y2={c.y2}
                        stroke={c.done ? 'rgba(0,184,148,0.5)' : 'rgba(224,123,83,0.15)'}
                        strokeWidth={2}
                        strokeLinecap="round"
                        style={{ transition: 'stroke 0.3s ease' }}
                    />
                ))}

                {/* Node dots */}
                {columnGroups.map((group, colIdx) =>
                    group.map((node, rowIdx) => {
                        const cx = getNodeX(colIdx);
                        const cy = getNodeY(node.id);
                        const isCurrent = colIdx === currentCol && rowIdx === currentRow;
                        const isDone = completed.has(node.id);
                        const config = getStepConfig(node.type as StepType);
                        const NodeIcon = config.icon;

                        return (
                            <g
                                key={node.id}
                                onClick={() => onNavigate(colIdx, rowIdx)}
                                style={{ cursor: 'pointer' }}
                            >
                                {/* Glow ring for current */}
                                {isCurrent && (
                                    <circle
                                        cx={cx}
                                        cy={cy}
                                        r={dotSize / 2 + 3}
                                        fill="none"
                                        stroke="rgba(224,123,83,0.4)"
                                        strokeWidth={2}
                                    />
                                )}
                                {/* Background circle */}
                                <circle
                                    cx={cx}
                                    cy={cy}
                                    r={dotSize / 2}
                                    fill={
                                        isDone
                                            ? 'rgba(0,184,148,0.25)'
                                            : isCurrent
                                              ? 'rgba(224,123,83,0.3)'
                                              : 'rgba(255,255,255,0.08)'
                                    }
                                />
                                {/* Icon */}
                                <foreignObject
                                    x={cx - dotSize / 2}
                                    y={cy - dotSize / 2}
                                    width={dotSize}
                                    height={dotSize}
                                >
                                    <div
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {isDone ? (
                                            <Check
                                                style={{
                                                    width: 11,
                                                    height: 11,
                                                    color: PALETTE.emerald,
                                                }}
                                            />
                                        ) : (
                                            <NodeIcon
                                                style={{
                                                    width: 11,
                                                    height: 11,
                                                    color: isCurrent
                                                        ? PALETTE.orange
                                                        : 'rgba(255,255,255,0.4)',
                                                }}
                                            />
                                        )}
                                    </div>
                                </foreignObject>
                            </g>
                        );
                    }),
                )}
            </svg>
        </div>
    );
}
