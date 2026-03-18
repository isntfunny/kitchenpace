'use client';

import { GitBranch, GitMerge, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState } from 'react';

import type { StepType } from '@app/components/flow/editor/editorTypes';
import { STEP_CONFIGS } from '@app/components/flow/editor/stepConfig';

import { css } from 'styled-system/css';

import { uid } from './gridReducer';
import { MergeOverlay } from './MergeOverlay';
import { StepTypePicker } from './StepTypePicker';
import type { LaneStep } from './types';

/* ══════════════════════════════════════════════════════════════
   SegmentDivider

   Zero-height in the layout. Hover zone ±16 px straddles the
   card border. Each lane column is independently hoverable.

   Picker renders INSIDE the active lane cell so it is
   naturally centred on the (+) button (no calc needed).
   ══════════════════════════════════════════════════════════════ */

interface SegmentDividerProps {
    laneCount: number;
    templateColumns: string;
    laneLabels: string[];
    locked?: boolean;
    onAddStep: (laneIndex: number, step: LaneStep) => void;
    onSplit: (splitAtIndex: number) => void;
    onMerge: (laneIndices: number[]) => void;
    onPopupChange?: (open: boolean) => void;
}

export function SegmentDivider({
    laneCount,
    templateColumns,
    laneLabels,
    locked = false,
    onAddStep,
    onSplit,
    onMerge,
    onPopupChange,
}: SegmentDividerProps) {
    const [activeLane, setActiveLane] = useState<number | null>(null);
    const [pickerLane, setPickerLane] = useState<number | null>(null);
    const [showMerge, setShowMerge] = useState(false);

    function openPicker(laneIdx: number) {
        setPickerLane(laneIdx);
        onPopupChange?.(true);
    }

    function handlePickType(type: StepType) {
        if (pickerLane === null) return;
        const config = STEP_CONFIGS[type];
        onAddStep(pickerLane, { id: uid(), type, label: config.label, description: '' });
        setPickerLane(null);
        onPopupChange?.(false);
    }

    function closePicker() {
        setPickerLane(null);
        onPopupChange?.(false);
    }

    function handleMergeClick(e: React.MouseEvent) {
        e.stopPropagation();
        if (laneCount === 2) {
            onMerge([0, 1]);
        } else {
            setShowMerge(true);
            onPopupChange?.(true);
        }
    }

    function closeMerge() {
        setShowMerge(false);
        onPopupChange?.(false);
    }

    return (
        <div className={wrapClass} onMouseLeave={() => setActiveLane(null)}>
            {/* Hover zone + lane grid — disabled while a popup is open */}
            <div
                className={zoneClass}
                style={{
                    pointerEvents: pickerLane !== null || showMerge || locked ? 'none' : 'auto',
                }}
            >
                <div className={laneGridClass} style={{ gridTemplateColumns: templateColumns }}>
                    {Array.from({ length: laneCount }).map((_, i) => (
                        <div
                            key={i}
                            className={laneCellClass}
                            onMouseEnter={() => setActiveLane(i)}
                        >
                            {/* ── Border flash: scoped to this lane only ── */}
                            <AnimatePresence>
                                {activeLane === i && (
                                    <motion.div
                                        key="line"
                                        initial={{ opacity: 0, scaleX: 0.5 }}
                                        animate={{ opacity: 1, scaleX: 1 }}
                                        exit={{ opacity: 0, scaleX: 0.5 }}
                                        transition={{ duration: 0.1 }}
                                        className={laneLineClass}
                                    />
                                )}
                            </AnimatePresence>

                            {/* ── Action buttons ── */}
                            <AnimatePresence>
                                {activeLane === i && pickerLane === null && !showMerge && (
                                    <div className={btnPositionerClass}>
                                        <motion.div
                                            key="btns"
                                            initial={{ opacity: 0, y: 4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 3 }}
                                            transition={{
                                                type: 'spring',
                                                stiffness: 500,
                                                damping: 28,
                                            }}
                                            className={btnRowClass}
                                        >
                                            {laneCount < 4 && (
                                                <button
                                                    type="button"
                                                    title="Split"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onSplit(i);
                                                    }}
                                                    className={iconBtnClass}
                                                >
                                                    <GitBranch style={{ width: 12, height: 12 }} />
                                                </button>
                                            )}

                                            <motion.button
                                                type="button"
                                                title="Schritt hinzufügen"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openPicker(i);
                                                }}
                                                className={addBtnClass}
                                                whileHover={{ scale: 1.12 }}
                                                whileTap={{ scale: 0.9 }}
                                            >
                                                <Plus style={{ width: 13, height: 13 }} />
                                            </motion.button>

                                            {laneCount > 1 && (
                                                <button
                                                    type="button"
                                                    title="Merge"
                                                    onClick={handleMergeClick}
                                                    className={iconBtnClass}
                                                >
                                                    <GitMerge style={{ width: 12, height: 12 }} />
                                                </button>
                                            )}
                                        </motion.div>
                                    </div>
                                )}
                            </AnimatePresence>

                            {/* ── Step picker — centred on THIS lane's (+) ── */}
                            <AnimatePresence>
                                {pickerLane === i && (
                                    /* positioner: CSS handles centering (no framer conflict) */
                                    <div className={pickerPositionerClass}>
                                        <motion.div
                                            key="picker"
                                            initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 4, scale: 0.96 }}
                                            transition={{
                                                type: 'spring',
                                                stiffness: 460,
                                                damping: 28,
                                            }}
                                        >
                                            <StepTypePicker
                                                onSelect={handlePickType}
                                                onClose={closePicker}
                                            />
                                        </motion.div>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Merge overlay — flex-centred on full divider width ── */}
            <AnimatePresence>
                {showMerge && (
                    /* flex row: justify-content:center avoids transform conflict */
                    <div className={mergePositionerClass}>
                        <MergeOverlay
                            laneCount={laneCount}
                            laneLabels={laneLabels}
                            onConfirm={(indices) => {
                                onMerge(indices);
                                closeMerge();
                            }}
                            onCancel={closeMerge}
                        />
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ── Styles ── */

const wrapClass = css({
    position: 'relative',
    height: '0',
    overflow: 'visible',
    zIndex: '20',
    flexShrink: '0',
});

const zoneClass = css({
    position: 'absolute',
    top: '-16px',
    bottom: '-16px',
    left: '0',
    right: '0',
});

const laneGridClass = css({
    display: 'grid',
    height: '100%',
});

/* Each lane cell is its own positioning context */
const laneCellClass = css({
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
});

const laneLineClass = css({
    position: 'absolute',
    top: '15px',
    left: '4px',
    right: '4px',
    height: '2px',
    background: 'linear-gradient(90deg, #e07b53, #f8b500)',
    borderRadius: 'full',
    pointerEvents: 'none',
    transformOrigin: 'center',
});

/* Static positioner — CSS centering, no framer-motion conflict */
const btnPositionerClass = css({
    position: 'absolute',
    top: '19px',
    left: '0',
    right: '0',
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: '30',
});

const btnRowClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    pointerEvents: 'auto',
});

/* Picker positioner — centred within the lane cell that owns it */
const pickerPositionerClass = css({
    position: 'absolute',
    top: '22px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: '50',
    pointerEvents: 'auto',
});

/* Merge overlay positioner — centred on the full divider width */
const mergePositionerClass = css({
    position: 'absolute',
    top: '22px',
    left: '0',
    right: '0',
    display: 'flex',
    justifyContent: 'center',
    zIndex: '50',
});

const addBtnClass = css({
    w: '26px',
    h: '26px',
    borderRadius: 'full',
    border: 'none',
    background: 'linear-gradient(135deg, #e07b53 0%, #f8b500 100%)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 3px 10px rgba(224,123,83,0.4)',
    flexShrink: '0',
});

const iconBtnClass = css({
    w: '24px',
    h: '24px',
    borderRadius: 'full',
    border: '1px solid rgba(0,0,0,0.1)',
    bg: 'white',
    color: 'rgba(0,0,0,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
    transition: 'all 0.15s ease',
    flexShrink: '0',
    _hover: {
        borderColor: 'rgba(224,123,83,0.4)',
        color: '#e07b53',
        bg: 'rgba(224,123,83,0.05)',
    },
});
