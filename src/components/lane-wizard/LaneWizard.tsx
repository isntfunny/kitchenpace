'use client';

import { Download, Upload } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useMemo, useReducer, useRef, useState } from 'react';

import {
    FlowEditorContext,
    type FlowEditorContextValue,
} from '@app/components/flow/editor/FlowEditorContext';
import { NodeEditPanel } from '@app/components/flow/editor/NodeEditPanel';
import { STEP_CONFIGS } from '@app/components/flow/editor/stepConfig';
import { css } from 'styled-system/css';

import {
    deserializeLaneGrid,
    gridReducer,
    normalizeLaneGrid,
    serializeLaneGrid,
    uid,
} from './gridReducer';
import { SegmentDivider } from './SegmentDivider';
import { StepCard } from './StepCard';
import { StepTypePicker } from './StepTypePicker';
import type { LaneGrid, LaneMode, LaneStep } from './types';
import { useTimers } from './useTimers';

/** Minimal no-op context so NodeEditPanel can render without a full FlowEditor */
const NOOP_FLOW_CTX: FlowEditorContextValue = {
    availableIngredients: [],
    onSelectNode: () => {},
    onDeleteNode: () => {},
    nodeOutgoingEdges: new Map<string, number>(),
    nodeIncomingEdges: new Map<string, number>(),
    onAddNodeAfter: () => {},
};

/* ══════════════════════════════════════════════════════════════
   LaneWizard
   ══════════════════════════════════════════════════════════════ */

interface LaneWizardProps {
    initialGrid: LaneGrid;
    mode?: LaneMode;
}

type EditingStep = { step: LaneStep; segmentId: string; laneIndex: number };

export function LaneWizard({ initialGrid, mode = 'edit' }: LaneWizardProps) {
    const [grid, dispatch] = useReducer(gridReducer, initialGrid, normalizeLaneGrid);
    const [completed, setCompleted] = useState<Set<string>>(new Set());
    const [anyPopupOpen, setAnyPopupOpen] = useState(false);
    const [editingStep, setEditingStep] = useState<EditingStep | null>(null);
    const { timers, start, pause, reset } = useTimers(initialGrid);
    const importInputRef = useRef<HTMLInputElement>(null);

    /* ── Import / Export ── */

    const handleExport = useCallback(() => {
        const stored = serializeLaneGrid(grid);
        const blob = new Blob([JSON.stringify(stored, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'recipe-grid.json';
        a.click();
        URL.revokeObjectURL(url);
    }, [grid]);

    const handleImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const stored = JSON.parse(ev.target?.result as string);
                dispatch({ type: 'SET_GRID', grid: deserializeLaneGrid(stored) });
            } catch {
                // ignore parse errors
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }, []);

    /* ── Callbacks ── */

    const toggleDone = useCallback((id: string) => {
        setCompleted((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const handleSplit = useCallback(
        (segmentId: string, currentLaneCount: number, splitAtIndex: number) => {
            dispatch({
                type: 'SPLIT',
                afterSegmentId: segmentId,
                laneCount: currentLaneCount + 1,
                splitAtIndex,
            });
        },
        [],
    );

    const handleMergeConfirm = useCallback((segmentId: string, laneIndices: number[]) => {
        const config = STEP_CONFIGS['anrichten'];
        dispatch({
            type: 'MERGE',
            afterSegmentId: segmentId,
            laneIndices,
            mergeStep: {
                id: uid(),
                type: 'anrichten',
                label: config.label,
                description: '',
            },
        });
    }, []);

    /* ── Progress ── */

    const { totalSteps, doneSteps } = useMemo(() => {
        let total = 0;
        for (const seg of grid.segments) {
            for (const lane of seg.lanes) {
                for (const step of lane) {
                    if (step.type !== 'start' && step.type !== 'servieren' && !step.continuation)
                        total++;
                }
            }
        }
        return { totalSteps: total, doneSteps: completed.size };
    }, [grid, completed]);

    /* ── Build flat element list: [segment, divider, segment, divider, …] ── */

    const elements: React.ReactNode[] = [];

    grid.segments.forEach((segment) => {
        const laneCount = segment.lanes.length;
        const templateColumns = segment.columnSpans.map((s) => `${s}fr`).join(' ');

        /* Segment block */
        elements.push(
            <motion.div
                key={segment.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className={segmentOuterClass}
            >
                <div className={segmentGridClass} style={{ gridTemplateColumns: templateColumns }}>
                    {segment.lanes.map((lane, laneIdx) => (
                        <div
                            key={`lane-${segment.id}-${laneIdx}`}
                            className={laneColClass}
                            style={{
                                borderRight:
                                    laneIdx < laneCount - 1 ? '1px solid rgba(0,0,0,0.07)' : 'none',
                            }}
                        >
                            <AnimatePresence mode="popLayout" initial={false}>
                                {lane.length === 0 && mode === 'edit' && (
                                    <StepTypePicker
                                        key={`picker-${segment.id}-${laneIdx}`}
                                        inline
                                        title="Was soll hier passieren?"
                                        onSelect={(type) => {
                                            const config = STEP_CONFIGS[type];
                                            dispatch({
                                                type: 'ADD_STEP',
                                                segmentId: segment.id,
                                                laneIndex: laneIdx,
                                                step: {
                                                    id: uid(),
                                                    type,
                                                    label: config.label,
                                                    description: '',
                                                },
                                            });
                                        }}
                                        onClose={() => {}}
                                    />
                                )}
                                {lane.map((step, stepIdx) => {
                                    const canEdit = mode === 'edit' && !step.continuation;
                                    const canDelete =
                                        canEdit &&
                                        step.type !== 'start' &&
                                        step.type !== 'servieren';
                                    return (
                                        <StepCard
                                            key={step.id}
                                            step={step}
                                            mode={mode}
                                            isLast={stepIdx === lane.length - 1}
                                            isDone={completed.has(step.id)}
                                            timer={timers.get(step.id)}
                                            onToggleDone={() => toggleDone(step.id)}
                                            onTimerStart={() => start(step.id)}
                                            onTimerPause={() => pause(step.id)}
                                            onTimerReset={() => reset(step.id)}
                                            onEdit={
                                                canEdit
                                                    ? () =>
                                                          setEditingStep({
                                                              step,
                                                              segmentId: segment.id,
                                                              laneIndex: laneIdx,
                                                          })
                                                    : undefined
                                            }
                                            onDelete={
                                                canDelete
                                                    ? () =>
                                                          dispatch({
                                                              type: 'DELETE_STEP',
                                                              segmentId: segment.id,
                                                              laneIndex: laneIdx,
                                                              stepId: step.id,
                                                          })
                                                    : undefined
                                            }
                                        />
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>

                {/* ── Add-lane edge buttons (edit mode, CSS hover, max 4 lanes) ── */}
                {mode === 'edit' && laneCount < 4 && (
                    <>
                        <button
                            type="button"
                            title="Lane links hinzufügen"
                            className={addLaneBtnLeftClass}
                            onClick={() =>
                                dispatch({ type: 'ADD_LANE', segmentId: segment.id, atIndex: 0 })
                            }
                        >
                            +
                        </button>
                        <button
                            type="button"
                            title="Lane rechts hinzufügen"
                            className={addLaneBtnRightClass}
                            onClick={() => dispatch({ type: 'ADD_LANE', segmentId: segment.id })}
                        >
                            +
                        </button>
                    </>
                )}
            </motion.div>,
        );

        /* Divider after each segment (edit mode only) */
        if (mode === 'edit') {
            elements.push(
                <SegmentDivider
                    key={`div-${segment.id}`}
                    laneCount={laneCount}
                    templateColumns={templateColumns}
                    laneLabels={segment.lanes.map((lane, i) => lane[0]?.label ?? `Lane ${i + 1}`)}
                    onAddStep={(laneIndex, step) =>
                        dispatch({ type: 'ADD_STEP', segmentId: segment.id, laneIndex, step })
                    }
                    locked={anyPopupOpen}
                    onPopupChange={setAnyPopupOpen}
                    onSplit={(splitAtIndex) => handleSplit(segment.id, laneCount, splitAtIndex)}
                    onMerge={(indices) => handleMergeConfirm(segment.id, indices)}
                />,
            );
        }
    });

    /* ── Render ── */

    return (
        <div className={containerClass}>
            {/* Progress bar (view mode) */}
            {mode === 'view' && totalSteps > 0 && (
                <ProgressBar total={totalSteps} done={doneSteps} />
            )}

            {/* Import / Export toolbar (edit mode only) */}
            {mode === 'edit' && (
                <div className={toolbarClass}>
                    <button type="button" className={toolbarBtnClass} onClick={handleExport}>
                        <Download className={css({ w: '13px', h: '13px' })} />
                        Export JSON
                    </button>
                    <button
                        type="button"
                        className={toolbarBtnClass}
                        onClick={() => importInputRef.current?.click()}
                    >
                        <Upload className={css({ w: '13px', h: '13px' })} />
                        Import JSON
                    </button>
                    <input
                        ref={importInputRef}
                        type="file"
                        accept=".json"
                        style={{ display: 'none' }}
                        onChange={handleImportFile}
                    />
                </div>
            )}

            <div className={gridWrapClass}>
                <AnimatePresence mode="popLayout" initial={false}>
                    {elements}
                </AnimatePresence>
            </div>

            {/* Step edit panel — reuses NodeEditPanel from FlowEditor */}
            {editingStep && (
                <FlowEditorContext.Provider value={NOOP_FLOW_CTX}>
                    <NodeEditPanel
                        key={editingStep.step.id}
                        nodeId={editingStep.step.id}
                        data={{
                            stepType: editingStep.step.type,
                            label: editingStep.step.label,
                            description: editingStep.step.description,
                            duration: editingStep.step.duration,
                            photoKey: editingStep.step.photoKey,
                        }}
                        availableIngredients={[]}
                        onSave={(updates) => {
                            dispatch({
                                type: 'UPDATE_STEP',
                                stepId: editingStep.step.id,
                                updates: {
                                    ...(updates.stepType && { type: updates.stepType }),
                                    ...(updates.label !== undefined && { label: updates.label }),
                                    ...(updates.description !== undefined && {
                                        description: updates.description,
                                    }),
                                    duration: updates.duration,
                                    photoKey: updates.photoKey,
                                },
                            });
                            setEditingStep(null);
                        }}
                        onClose={() => setEditingStep(null)}
                        canDelete={
                            editingStep.step.type !== 'start' &&
                            editingStep.step.type !== 'servieren'
                        }
                        onDelete={() => {
                            dispatch({
                                type: 'DELETE_STEP',
                                segmentId: editingStep.segmentId,
                                laneIndex: editingStep.laneIndex,
                                stepId: editingStep.step.id,
                            });
                            setEditingStep(null);
                        }}
                    />
                </FlowEditorContext.Provider>
            )}
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════
   ProgressBar
   ══════════════════════════════════════════════════════════════ */

function ProgressBar({ total, done }: { total: number; done: number }) {
    return (
        <div className={progressWrapClass}>
            <div className={css({ display: 'flex', justifyContent: 'space-between', mb: '1.5' })}>
                <span className={css({ fontSize: 'xs', fontWeight: '600', color: 'text.muted' })}>
                    Fortschritt
                </span>
                <span className={css({ fontSize: 'xs', color: 'text.muted' })}>
                    {done}/{total} erledigt
                </span>
            </div>
            <div className={progressBarBgClass}>
                <motion.div
                    className={progressBarFillClass}
                    animate={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════════════════
   Styles
   ══════════════════════════════════════════════════════════════ */

const containerClass = css({
    fontFamily: 'body',
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
});

/* The whole recipe is ONE unified block — outer frame only */
const gridWrapClass = css({
    display: 'flex',
    flexDirection: 'column',
    m: '20px',
    border: '1px solid rgba(0,0,0,0.1)',
    borderRadius: '12px',
    overflow: 'hidden',
    bg: 'white',
    boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
});

/* Segment block: positioning context; CSS :hover shows add-lane buttons */
const segmentOuterClass = css({
    position: 'relative',
    '& .lwz-add-lane': {
        opacity: '0',
        transition: 'opacity 0.15s ease',
        pointerEvents: 'none',
    },
    '&:hover .lwz-add-lane': {
        opacity: '1',
        pointerEvents: 'auto',
    },
});

const _addLaneBtnBase = css({
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    w: '26px',
    h: '26px',
    borderRadius: 'full',
    border: '1.5px dashed rgba(224,123,83,0.5)',
    bg: 'white',
    color: '#e07b53',
    fontSize: '16px',
    lineHeight: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: '25',
    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
    _hover: { bg: 'rgba(224,123,83,0.07)', borderColor: '#e07b53' },
});

const addLaneBtnLeftClass = `${_addLaneBtnBase} lwz-add-lane ${css({ left: '6px' })}`;
const addLaneBtnRightClass = `${_addLaneBtnBase} lwz-add-lane ${css({ right: '6px' })}`;

/* CSS grid inside the block — stretch so all lane columns reach the same height */
const segmentGridClass = css({
    display: 'grid',
    alignItems: 'stretch',
});

/* Each lane is a flex column; last card stretches via flexGrow */
const laneColClass = css({
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
});

const progressWrapClass = css({
    p: '4',
    bg: 'white',
    borderBottom: '1px solid',
    borderColor: 'border',
    flexShrink: '0',
});

const progressBarBgClass = css({
    h: '3px',
    borderRadius: 'full',
    bg: 'rgba(0,0,0,0.07)',
    overflow: 'hidden',
});

const progressBarFillClass = css({
    h: '100%',
    borderRadius: 'full',
    bg: '#00b894',
});

const toolbarClass = css({
    display: 'flex',
    gap: '8px',
    px: '20px',
    py: '10px',
    flexShrink: '0',
});

const toolbarBtnClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    px: '12px',
    py: '6px',
    borderRadius: 'full',
    border: '1px solid rgba(0,0,0,0.1)',
    bg: 'white',
    color: 'rgba(0,0,0,0.55)',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    _hover: { borderColor: '#e07b53', color: '#e07b53', bg: 'rgba(224,123,83,0.05)' },
});
