'use client';

import { AnimatePresence, motion } from 'motion/react';
import React from 'react';

import { STEP_CONFIGS } from '@app/components/flow/editor/stepConfig';

import { css } from 'styled-system/css';

import { FlowConnector, IntraLaneConnector } from './FlowConnector';
import { uid } from './gridReducer';
import {
    addLaneBtnLeftClass,
    addLaneBtnRightClass,
    laneColClass,
    progressBarBgClass,
    progressBarFillClass,
    progressWrapClass,
    segmentGridClass,
    segmentOuterClass,
} from './lane-wizard-styles';
import { SegmentDivider } from './SegmentDivider';
import { StepCard } from './StepCard';
import { StepTypePicker } from './StepTypePicker';
import type { LaneAction, LaneGrid, LaneMode, LaneStep, TimerState } from './types';

/* ══════════════════════════════════════════════════════════════
   LaneGrid — renders segments, lanes, cells, connectors, dividers
   ══════════════════════════════════════════════════════════════ */

export type EditingStep = { step: LaneStep; segmentId: string; laneIndex: number };

interface LaneGridProps {
    grid: LaneGrid;
    mode: LaneMode;
    photosByStepId: Record<string, string>;
    completed: Set<string>;
    criticalStepIds: Set<string>;
    timers: Map<string, TimerState>;
    anyPopupOpen: boolean;
    dispatch: React.Dispatch<LaneAction>;
    onToggleDone: (id: string) => void;
    onTimerStart: (id: string) => void;
    onTimerPause: (id: string) => void;
    onTimerReset: (id: string) => void;
    onEditStep: (editing: EditingStep) => void;
    onPopupChange: (open: boolean) => void;
    onSplit: (segmentId: string, currentLaneCount: number, splitAtIndex: number) => void;
    onMergeConfirm: (segmentId: string, laneIndices: number[]) => void;
}

/**
 * Builds the flat element list for the lane grid:
 * [connector, segment, divider, connector, segment, divider, ..., connector]
 */
export function buildGridElements({
    grid,
    mode,
    photosByStepId,
    completed,
    criticalStepIds,
    timers,
    anyPopupOpen,
    dispatch,
    onToggleDone,
    onTimerStart,
    onTimerPause,
    onTimerReset,
    onEditStep,
    onPopupChange,
    onSplit,
    onMergeConfirm,
}: LaneGridProps): React.ReactNode[] {
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
                                                onToggleDone={() => onToggleDone(step.id)}
                                                onTimerStart={() => onTimerStart(step.id)}
                                                onTimerPause={() => onTimerPause(step.id)}
                                                onTimerReset={() => onTimerReset(step.id)}
                                                onEdit={
                                                    canEdit
                                                        ? () =>
                                                              onEditStep({
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
                            title="Lane links hinzufuegen"
                            className={addLaneBtnLeftClass}
                            onClick={() =>
                                dispatch({ type: 'ADD_LANE', segmentId: segment.id, atIndex: 0 })
                            }
                        >
                            +
                        </button>
                        <button
                            type="button"
                            title="Lane rechts hinzufuegen"
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
                    onPopupChange={onPopupChange}
                    onSplit={(splitAtIndex) => onSplit(segment.id, laneCount, splitAtIndex)}
                    onMerge={(indices) => onMergeConfirm(segment.id, indices)}
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

    return elements;
}

/* ══════════════════════════════════════════════════════════════
   ProgressBar
   ══════════════════════════════════════════════════════════════ */

export function ProgressBar({ total, done }: { total: number; done: number }) {
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
