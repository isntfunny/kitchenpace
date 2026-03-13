'use client';

import {
    BaseEdge,
    EdgeLabelRenderer,
    getSmoothStepPath,
    useReactFlow,
    type EdgeProps,
} from '@xyflow/react';
import { Plus, Trash2 } from 'lucide-react';
import { memo, useCallback, useState } from 'react';

import { StepTypePicker } from '@app/components/lane-wizard/StepTypePicker';
import {
    dispatchRecipeTutorialEvent,
    RECIPE_TUTORIAL_EVENTS,
} from '@app/components/recipe/tutorial/shared';
import { useIsDark } from '@app/lib/darkMode';
import { PALETTE } from '@app/lib/palette';
import { css } from 'styled-system/css';

import type { StepType } from './editorTypes';
import { useFlowEditor } from './FlowEditorContext';

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
    const dark = useIsDark();
    const [, setIsHovered] = useState(false);
    const [popoverOpen, setPopoverOpen] = useState(false);

    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const handleSelect = useCallback(
        (stepType: StepType) => {
            setPopoverOpen(false);
            setIsHovered(false);
            onInsertOnEdge?.(id, source, target, stepType);
        },
        [id, source, target, onInsertOnEdge],
    );

    const handleClose = useCallback(() => {
        setPopoverOpen(false);
        setIsHovered(false);
    }, []);

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
                        zIndex: 1000,
                    }}
                    className="nodrag nopan"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => !popoverOpen && setIsHovered(false)}
                >
                    <div style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            {/* "+" circle button */}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    dispatchRecipeTutorialEvent(
                                        RECIPE_TUTORIAL_EVENTS.flowAddButtonClicked,
                                    );
                                    setPopoverOpen((v) => {
                                        const newValue = !v;
                                        if (!newValue) setIsHovered(false);
                                        return newValue;
                                    });
                                }}
                                data-tutorial="flow-add-button"
                                style={{
                                    width: '26px',
                                    height: '26px',
                                    borderRadius: '50%',
                                    border: `2px solid ${PALETTE.orange}`,
                                    backgroundColor: dark ? '#1a1d21' : 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    boxShadow: dark
                                        ? '0 2px 10px rgba(224,123,83,0.45)'
                                        : '0 2px 10px rgba(224,123,83,0.35)',
                                    transition: 'all 0.15s ease',
                                    padding: 0,
                                }}
                            >
                                <Plus
                                    style={{ width: '13px', height: '13px', color: PALETTE.orange }}
                                />
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
                                        backgroundColor: dark ? '#1a1d21' : 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        boxShadow: dark
                                            ? '0 2px 10px rgba(231,76,60,0.4)'
                                            : '0 2px 10px rgba(231,76,60,0.3)',
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
                                className={css({
                                    position: 'absolute',
                                    zIndex: '50',
                                })}
                                data-tutorial="flow-palette"
                                style={{
                                    top: 'calc(100% + 8px)',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <StepTypePicker
                                    title="Schritt hier einfügen"
                                    onSelect={handleSelect}
                                    onClose={handleClose}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </EdgeLabelRenderer>
        </>
    );
}

export const InsertEdge = memo(InsertEdgeComponent);
