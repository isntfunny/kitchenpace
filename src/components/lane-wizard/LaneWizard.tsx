'use client';

import { Download, Sparkles, Upload } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { useCallback, useMemo, useReducer, useRef, useState } from 'react';

import {
    FlowEditorContext,
    type FlowEditorContextValue,
} from '@app/components/flow/editor/FlowEditorContext';
import { NodeEditPanel } from '@app/components/flow/editor/NodeEditPanel';
import { STEP_CONFIGS } from '@app/components/flow/editor/stepConfig';
import { css } from 'styled-system/css';

import { AiLaneDialog } from './AiLaneDialog';
import { FlowConnector, IntraLaneConnector } from './FlowConnector';
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
    validation: {
        scope: 'editor',
        isValid: true,
        errors: [],
        blockingIssues: [],
        warningIssues: [],
        summary: null,
        counts: { total: 0, blocking: 0, warnings: 0 },
    },
    validationIssuesByNode: new Map(),
};

/* ══════════════════════════════════════════════════════════════
   LaneWizard
   ══════════════════════════════════════════════════════════════ */

interface LaneWizardProps {
    initialGrid: LaneGrid;
    mode?: LaneMode;
    /** Photos loaded from RecipeStepImage table, keyed by step ID */
    photosByStepId?: Record<string, string>;
}

type EditingStep = { step: LaneStep; segmentId: string; laneIndex: number };

export function LaneWizard({ initialGrid, mode = 'edit', photosByStepId = {} }: LaneWizardProps) {
    const [grid, dispatch] = useReducer(gridReducer, initialGrid, normalizeLaneGrid);
    const [completed, setCompleted] = useState<Set<string>>(new Set());
    const [anyPopupOpen, setAnyPopupOpen] = useState(false);
    const [editingStep, setEditingStep] = useState<EditingStep | null>(null);
    const { timers, start, pause, reset } = useTimers(initialGrid);
    const importInputRef = useRef<HTMLInputElement>(null);
    const [aiDialogOpen, setAiDialogOpen] = useState(false);

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

    /* ── Critical path ── */

    const criticalStepIds = useMemo(() => {
        const ids = new Set<string>();
        for (const segment of grid.segments) {
            const laneDurs = segment.lanes.map((lane) =>
                lane.filter((s) => !s.continuation).reduce((acc, s) => acc + (s.duration ?? 0), 0),
            );
            const max = Math.max(...laneDurs);
            if (max === 0) continue;
            segment.lanes.forEach((lane, i) => {
                if (laneDurs[i] === max) {
                    lane.filter((s) => !s.continuation && s.duration).forEach((s) => ids.add(s.id));
                }
            });
        }
        return ids;
    }, [grid]);

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

    grid.segments.forEach((segment, segIdx) => {
        const laneCount = segment.lanes.length;
        const templateColumns = segment.columnSpans.map((s) => `${s}fr`).join(' ');

        const segmentColors = (lane: (typeof segment.lanes)[number], pickLast: boolean) => {
            const step = pickLast
                ? [...lane].reverse().find((s) => !s.continuation)
                : lane.find((s) => !s.continuation);
            return step ? STEP_CONFIGS[step.type].accent : '#e07b53';
        };

        /* Flow connector before first segment */
        if (segIdx === 0) {
            const colors = segment.lanes.map((lane) => segmentColors(lane, false));
            elements.push(
                <FlowConnector
                    key={`flow-before-${segment.id}`}
                    prevColumnSpans={segment.columnSpans}
                    nextColumnSpans={segment.columnSpans}
                    prevColors={colors}
                    nextColors={colors}
                />,
            );
        }

        /* Flow connector between segments */
        if (segIdx > 0) {
            const prev = grid.segments[segIdx - 1];
            const prevColors = prev.lanes.map((lane) => segmentColors(lane, true));
            const nextColors = segment.lanes.map((lane) => segmentColors(lane, false));
            elements.push(
                <FlowConnector
                    key={`flow-${prev.id}-${segment.id}`}
                    prevColumnSpans={prev.columnSpans}
                    nextColumnSpans={segment.columnSpans}
                    prevColors={prevColors}
                    nextColors={nextColors}
                />,
            );
        }

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
                                    const prevStep = stepIdx > 0 ? lane[stepIdx - 1] : null;
                                    const showIntraConnector =
                                        prevStep && !step.continuation && !prevStep.continuation;
                                    return (
                                        <React.Fragment key={step.id}>
                                            {showIntraConnector && (
                                                <IntraLaneConnector
                                                    fromColor={STEP_CONFIGS[prevStep.type].accent}
                                                    toColor={STEP_CONFIGS[step.type].accent}
                                                />
                                            )}
                                            <StepCard
                                                step={step}
                                                photoKey={photosByStepId[step.id]}
                                                mode={mode}
                                                isLast={stepIdx === lane.length - 1}
                                                isDone={completed.has(step.id)}
                                                isCriticalPath={criticalStepIds.has(step.id)}
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
                                        </React.Fragment>
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

        /* Flow connector after last segment */
        if (segIdx === grid.segments.length - 1) {
            const colors = segment.lanes.map((lane) => segmentColors(lane, true));
            elements.push(
                <FlowConnector
                    key={`flow-after-${segment.id}`}
                    prevColumnSpans={segment.columnSpans}
                    nextColumnSpans={segment.columnSpans}
                    prevColors={colors}
                    nextColors={colors}
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

            {/* Toolbar (edit mode only) */}
            {mode === 'edit' && (
                <div className={toolbarClass}>
                    <button
                        type="button"
                        className={aiToolbarBtnClass}
                        onClick={() => setAiDialogOpen(true)}
                    >
                        <Sparkles className={css({ w: '13px', h: '13px' })} />
                        KI generieren
                    </button>
                    <div className={css({ flex: '1' })} />
                    <button type="button" className={toolbarBtnClass} onClick={handleExport}>
                        <Download className={css({ w: '13px', h: '13px' })} />
                        Export
                    </button>
                    <button
                        type="button"
                        className={toolbarBtnClass}
                        onClick={() => importInputRef.current?.click()}
                    >
                        <Upload className={css({ w: '13px', h: '13px' })} />
                        Import
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

            <TimeRuler grid={grid} />

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

            {/* AI Dialog */}
            <AiLaneDialog
                open={aiDialogOpen}
                onClose={() => setAiDialogOpen(false)}
                onResult={(grid) => dispatch({ type: 'SET_GRID', grid })}
            />
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
   TimeRuler
   ══════════════════════════════════════════════════════════════ */

function TimeRuler({ grid }: { grid: LaneGrid }) {
    type SegEntry = {
        id: string;
        dur: number; // 0 = untimed
        label: string;
        color: string;
        parallelCount: number;
    };

    const segData: SegEntry[] = [];

    for (const seg of grid.segments) {
        // Skip structural start/servieren-only segments — they're milestones, not steps
        const realSteps = seg.lanes.flat().filter((s) => !s.continuation);
        if (realSteps.every((s) => s.type === 'start' || s.type === 'servieren')) continue;

        const laneDurs = seg.lanes.map((lane) =>
            lane.filter((s) => !s.continuation).reduce((acc, s) => acc + (s.duration ?? 0), 0),
        );
        const maxDur = Math.max(0, ...laneDurs);

        if (maxDur > 0) {
            // Timed: use critical lane step for label + color
            const critIdx = laneDurs.indexOf(maxDur);
            const critStep = seg.lanes[critIdx]?.find((s) => !s.continuation && s.duration);
            const parallelCount = seg.lanes.filter(
                (_, i) => i !== critIdx && laneDurs[i] > 0,
            ).length;
            segData.push({
                id: seg.id,
                dur: maxDur,
                label: critStep?.label ?? '',
                color: critStep ? STEP_CONFIGS[critStep.type].accent : '#e07b53',
                parallelCount,
            });
        } else {
            // Untimed: first real step gives label + color
            const first = realSteps[0];
            const parallelCount =
                seg.lanes.filter((lane) => lane.filter((s) => !s.continuation).length > 0).length -
                1;
            segData.push({
                id: seg.id,
                dur: 0,
                label: first?.label ?? '',
                color: first ? STEP_CONFIGS[first.type].accent : '#aaa',
                parallelCount: Math.max(0, parallelCount),
            });
        }
    }

    const timedTotal = segData.reduce((a, d) => a + d.dur, 0);
    // Only render if at least one segment has a duration
    if (timedTotal === 0) return null;

    return (
        <div className={rulerWrapClass}>
            {/* Header */}
            <div className={rulerHeaderClass}>
                <span>Zeitplan</span>
                <span>
                    {timedTotal} Min.{' '}
                    {segData.some((d) => d.dur === 0) && (
                        <span style={{ opacity: 0.55 }}>+ unbekannte Schritte</span>
                    )}
                </span>
            </div>

            {/* Gantt-style blocks */}
            <div className={rulerRowClass}>
                {segData.map((d) => {
                    const isTimed = d.dur > 0;
                    const narrow = isTimed && (d.dur / timedTotal) * 100 < 14;
                    return (
                        <div
                            key={d.id}
                            className={isTimed ? rulerBlockClass : rulerBlockUntimedClass}
                            style={
                                isTimed
                                    ? { flex: d.dur, background: d.color }
                                    : { borderColor: `${d.color}60` }
                            }
                            title={
                                isTimed
                                    ? `${d.label} · ${d.dur} Min.`
                                    : `${d.label} · Keine Zeit eingetragen`
                            }
                        >
                            {!narrow && (
                                <span
                                    className={
                                        isTimed ? rulerBlockNameClass : rulerBlockNameUntimedClass
                                    }
                                >
                                    {d.label}
                                </span>
                            )}
                            <div className={rulerBlockFootClass}>
                                {isTimed ? (
                                    <>
                                        <span className={rulerBlockDurClass}>{d.dur}m</span>
                                        {d.parallelCount > 0 && (
                                            <span className={rulerParallelClass}>
                                                +{d.parallelCount}∥
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <span className={rulerUnknownDurClass}>?</span>
                                )}
                            </div>
                        </div>
                    );
                })}
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

const aiToolbarBtnClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    px: '14px',
    py: '7px',
    borderRadius: 'full',
    border: 'none',
    bg: 'linear-gradient(135deg, #e07b53, #f8b500)',
    color: 'white',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: '0 2px 8px rgba(224,123,83,0.3)',
    _hover: { boxShadow: '0 3px 12px rgba(224,123,83,0.45)', transform: 'translateY(-1px)' },
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

const rulerWrapClass = css({
    mx: '20px',
    mt: '14px',
    mb: '0',
    flexShrink: '0',
});

const rulerHeaderClass = css({
    display: 'flex',
    justifyContent: 'space-between',
    mb: '6px',
    fontSize: '10px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'rgba(0,0,0,0.35)',
});

/* Gantt row — flex, no overflow clip so labels aren't cut */
const rulerRowClass = css({
    display: 'flex',
    gap: '3px',
    alignItems: 'stretch',
});

/* Individual timed block — flex proportional */
const rulerBlockClass = css({
    flexShrink: '0',
    borderRadius: '6px',
    px: '10px',
    py: '7px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: '3px',
    opacity: '0.88',
    transition: 'opacity 0.15s ease, transform 0.15s ease',
    overflow: 'hidden',
    cursor: 'default',
    minW: '0',
    _hover: { opacity: '1', transform: 'translateY(-1px)' },
});

/* Untimed block — fixed compact width, dashed border */
const rulerBlockUntimedClass = css({
    flex: '0 0 auto',
    minW: '72px',
    borderRadius: '6px',
    px: '10px',
    py: '7px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: '3px',
    border: '1.5px dashed',
    bg: 'rgba(0,0,0,0.03)',
    overflow: 'hidden',
    cursor: 'default',
    opacity: '0.75',
    transition: 'opacity 0.15s ease',
    _hover: { opacity: '1' },
});

const rulerBlockNameClass = css({
    fontSize: '11px',
    fontWeight: '700',
    color: 'white',
    lineHeight: '1.2',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
});

const rulerBlockNameUntimedClass = css({
    fontSize: '11px',
    fontWeight: '600',
    color: 'rgba(0,0,0,0.5)',
    lineHeight: '1.2',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
});

const rulerBlockFootClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
});

const rulerBlockDurClass = css({
    fontSize: '10px',
    fontWeight: '800',
    color: 'rgba(255,255,255,0.8)',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: '1',
});

const rulerParallelClass = css({
    fontSize: '9px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
    lineHeight: '1',
});

const rulerUnknownDurClass = css({
    fontSize: '11px',
    fontWeight: '800',
    color: 'rgba(0,0,0,0.25)',
    lineHeight: '1',
    fontVariantNumeric: 'tabular-nums',
});
