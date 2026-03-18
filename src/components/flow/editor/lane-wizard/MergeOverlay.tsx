'use client';

import { GitMerge } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';

import { css } from 'styled-system/css';

interface MergeOverlayProps {
    laneCount: number;
    laneLabels: string[];
    onConfirm: (indices: number[]) => void;
    onCancel: () => void;
}

export function MergeOverlay({ laneCount, laneLabels, onConfirm, onCancel }: MergeOverlayProps) {
    // Range-based selection: always a contiguous block [start, end].
    // Clicking outside the range expands it; clicking an edge shrinks it;
    // middle lanes are implicitly included (can't be deselected individually).
    const [range, setRange] = useState<[number, number]>([0, 1]);
    const [start, end] = range;

    const toggle = (i: number) => {
        setRange(([s, e]) => {
            if (i < s) return [i, e]; // expand left
            if (i > e) return [s, i]; // expand right
            if (i === s && e > s) return [s + 1, e]; // shrink from left edge
            if (i === e && e > s) return [s, e - 1]; // shrink from right edge
            return [s, e]; // middle lane — range stays
        });
    };

    const rangeSize = end - start + 1;
    const indices = Array.from({ length: rangeSize }, (_, i) => start + i);

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={containerClass}
        >
            <div className={css({ fontSize: 'sm', fontWeight: '700', mb: '2', color: '#1a1a1a' })}>
                Welche Lanes zusammenführen?
            </div>

            <div className={css({ display: 'flex', flexDirection: 'column', gap: '1.5' })}>
                {Array.from({ length: laneCount }, (_, i) => {
                    const inRange = i >= start && i <= end;
                    const isEdge = i === start || i === end;
                    return (
                        <label key={i} className={labelClass}>
                            <input
                                type="checkbox"
                                checked={inRange}
                                onChange={() => toggle(i)}
                                className={css({ accentColor: '#e07b53' })}
                                // Middle lanes in range can't be individually deselected
                                style={{ cursor: inRange && !isEdge ? 'default' : 'pointer' }}
                            />
                            <span style={{ opacity: inRange && !isEdge ? 0.55 : 1 }}>
                                {laneLabels[i] || `Lane ${i + 1}`}
                            </span>
                        </label>
                    );
                })}
            </div>

            <div
                className={css({ display: 'flex', gap: '2', mt: '3', justifyContent: 'flex-end' })}
            >
                <button type="button" onClick={onCancel} className={cancelBtnClass}>
                    Abbrechen
                </button>
                <button
                    type="button"
                    onClick={() => onConfirm(indices)}
                    className={confirmBtnClass}
                >
                    <GitMerge className={css({ w: '12px', h: '12px' })} />
                    Zusammenführen
                </button>
            </div>
        </motion.div>
    );
}

/* ── Styles ── */

const containerClass = css({
    bg: 'white',
    borderRadius: 'xl',
    border: '1px solid rgba(224,123,83,0.3)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
    p: '4',
    w: '260px',
});

const labelClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '2',
    cursor: 'pointer',
    fontSize: 'sm',
    p: '1.5',
    borderRadius: 'lg',
    _hover: { bg: 'rgba(224,123,83,0.05)' },
});

const cancelBtnClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '1',
    px: '2.5',
    py: '1.5',
    borderRadius: 'full',
    border: '1px solid rgba(0,0,0,0.1)',
    bg: 'white',
    color: 'text.muted',
    fontSize: 'xs',
    fontWeight: '600',
    cursor: 'pointer',
});

const confirmBtnClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '1',
    px: '3',
    py: '1.5',
    borderRadius: 'full',
    border: 'none',
    background: 'linear-gradient(135deg, #e07b53 0%, #f8b500 100%)',
    color: 'white',
    fontSize: 'xs',
    fontWeight: '600',
    cursor: 'pointer',
    _hover: { transform: 'scale(1.02)' },
});
