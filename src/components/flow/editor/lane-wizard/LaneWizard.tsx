'use client';

import { Download, Sparkles, Upload } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import React, { useCallback, useMemo, useReducer, useRef, useState } from 'react';

import { STEP_CONFIGS } from '@app/components/flow/editor/stepConfig';

import { css } from 'styled-system/css';

import { AiLaneDialog } from './AiLaneDialog';
import {
    deserializeLaneGrid,
    gridReducer,
    normalizeLaneGrid,
    serializeLaneGrid,
    uid,
} from './gridReducer';
import {
    aiToolbarBtnClass,
    containerClass,
    gridWrapClass,
    toolbarBtnClass,
    toolbarClass,
} from './lane-wizard-styles';
import { LaneEditPanel } from './LaneEditPanel';
import { type EditingStep, ProgressBar, buildGridElements } from './LaneGrid';
import { TimeRuler } from './TimeRuler';
import type { LaneGrid, LaneMode } from './types';
import { useTimers } from './useTimers';

/* ══════════════════════════════════════════════════════════════
   LaneWizard
   ══════════════════════════════════════════════════════════════ */

interface LaneWizardProps {
    initialGrid: LaneGrid;
    mode?: LaneMode;
    /** Photos loaded from RecipeStepImage table, keyed by step ID */
    photosByStepId?: Record<string, string>;
}

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

    const handleImportFile = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
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
        },
        [dispatch],
    );

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
        [dispatch],
    );

    const handleMergeConfirm = useCallback(
        (segmentId: string, laneIndices: number[]) => {
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
        },
        [dispatch],
    );

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

    /* ── Build flat element list ── */

    const elements = buildGridElements({
        grid,
        mode,
        photosByStepId,
        completed,
        criticalStepIds,
        timers,
        anyPopupOpen,
        dispatch,
        onToggleDone: toggleDone,
        onTimerStart: start,
        onTimerPause: pause,
        onTimerReset: reset,
        onEditStep: setEditingStep,
        onPopupChange: setAnyPopupOpen,
        onSplit: handleSplit,
        onMergeConfirm: handleMergeConfirm,
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
                <LaneEditPanel
                    editingStep={editingStep}
                    dispatch={dispatch}
                    onClose={() => setEditingStep(null)}
                />
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
