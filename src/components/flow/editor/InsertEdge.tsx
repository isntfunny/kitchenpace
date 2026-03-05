'use client';

import {
    BaseEdge,
    EdgeLabelRenderer,
    getSmoothStepPath,
    useReactFlow,
    type EdgeProps,
} from '@xyflow/react';
import { Plus, Trash2 } from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';

import type { StepType } from './editorTypes';
import { useFlowEditor } from './FlowEditorContext';
import { ADDABLE_STEP_TYPES, STEP_CONFIGS } from './stepConfig';

function InsertEdgeComponent({
    id,
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style,
    markerEnd,
    selected,
}: EdgeProps) {
    const { onInsertOnEdge } = useFlowEditor();
    const { deleteElements } = useReactFlow();
    const [isHovered, setIsHovered] = useState(false);
    const [popoverOpen, setPopoverOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    // Close popover on outside click
    useEffect(() => {
        if (!popoverOpen) return;
        const handler = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                setPopoverOpen(false);
                setIsHovered(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [popoverOpen]);

    const handleSelect = useCallback(
        (stepType: StepType) => {
            setPopoverOpen(false);
            setIsHovered(false);
            onInsertOnEdge?.(id, source, target, stepType);
        },
        [id, source, target, onInsertOnEdge],
    );

    const showButton = isHovered || popoverOpen;

    return (
        <>
            {/* Wide transparent hit area for easy hovering */}
            <path
                d={edgePath}
                fill="none"
                stroke="transparent"
                strokeWidth={20}
                pointerEvents="all"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => !popoverOpen && setIsHovered(false)}
            />

            {/* Actual visible edge — red border when selected */}
            <BaseEdge
                id={id}
                path={edgePath}
                style={
                    selected
                        ? {
                              ...style,
                              stroke: '#e74c3c',
                              strokeWidth: 2.5,
                              filter: 'drop-shadow(0 0 3px rgba(231,76,60,0.4))',
                          }
                        : style
                }
                markerEnd={markerEnd}
            />

            {/* Mid-point insert button (rendered outside SVG via EdgeLabelRenderer) */}
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                        pointerEvents: 'all',
                        zIndex: showButton ? 1000 : 0,
                        opacity: showButton ? 1 : 0,
                        transition: 'opacity 0.15s ease',
                    }}
                    className="nodrag nopan"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => !popoverOpen && setIsHovered(false)}
                >
                    <div ref={popoverRef} style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            {/* "+" circle button */}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setPopoverOpen((v) => !v);
                                }}
                                style={{
                                    width: '26px',
                                    height: '26px',
                                    borderRadius: '50%',
                                    border: '2px solid #e07b53',
                                    backgroundColor: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 10px rgba(224,123,83,0.35)',
                                    transition: 'all 0.15s ease',
                                    padding: 0,
                                }}
                            >
                                <Plus style={{ width: '13px', height: '13px', color: '#e07b53' }} />
                            </button>

                            {/* Delete button — visible when edge is selected */}
                            {selected && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteElements({ edges: [{ id }] });
                                    }}
                                    title="Verbindung löschen"
                                    style={{
                                        width: '26px',
                                        height: '26px',
                                        borderRadius: '50%',
                                        border: '2px solid #e74c3c',
                                        backgroundColor: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 10px rgba(231,76,60,0.3)',
                                        transition: 'all 0.15s ease',
                                        padding: 0,
                                    }}
                                >
                                    <Trash2
                                        style={{ width: '11px', height: '11px', color: '#e74c3c' }}
                                    />
                                </button>
                            )}
                        </div>

                        {/* Step picker popover */}
                        {popoverOpen && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 8px)',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    backgroundColor: 'white',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(224,123,83,0.3)',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
                                    padding: '12px',
                                    width: '280px',
                                    zIndex: 1001,
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div
                                    style={{
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        color: '#636e72',
                                        marginBottom: '8px',
                                        textAlign: 'center',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.06em',
                                    }}
                                >
                                    Schritt hier einfügen
                                </div>
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(4, 1fr)',
                                        gap: '6px',
                                    }}
                                >
                                    {ADDABLE_STEP_TYPES.map((type) => {
                                        const config = STEP_CONFIGS[type];
                                        const Icon = config.icon;
                                        return (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => handleSelect(type)}
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    padding: '8px 4px',
                                                    borderRadius: '8px',
                                                    border: '2px solid transparent',
                                                    cursor: 'pointer',
                                                    fontSize: '9px',
                                                    fontWeight: 600,
                                                    color: '#2d3436',
                                                    backgroundColor: config.color,
                                                    backgroundImage: config.gradient,
                                                    transition: 'all 0.12s ease',
                                                }}
                                            >
                                                <Icon style={{ width: '18px', height: '18px' }} />
                                                <span>{config.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </EdgeLabelRenderer>
        </>
    );
}

export const InsertEdge = memo(InsertEdgeComponent);
