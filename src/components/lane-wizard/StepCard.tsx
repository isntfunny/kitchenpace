'use client';

import { Check, Pause, Pencil, Play, RotateCcw, Timer, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

import { STEP_CONFIGS } from '@app/components/flow/editor/stepConfig';
import { getThumbnailUrl } from '@app/lib/thumbnail-client';
import { css } from 'styled-system/css';

import type { LaneMode, LaneStep, TimerState } from './types';

function formatTimer(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

/* ── Props ── */

interface StepCardProps {
    step: LaneStep;
    photoKey?: string;
    mode: LaneMode;
    isDone: boolean;
    isLast: boolean;
    isCriticalPath?: boolean;
    timer?: TimerState;
    onToggleDone: () => void;
    onTimerStart: () => void;
    onTimerPause: () => void;
    onTimerReset: () => void;
    onDelete?: () => void;
    onEdit?: () => void;
}

/* ── Component ── */

export function StepCard({
    step,
    photoKey,
    mode,
    isDone,
    isLast,
    isCriticalPath = false,
    timer,
    onToggleDone,
    onTimerStart,
    onTimerPause,
    onTimerReset,
    onDelete,
    onEdit,
}: StepCardProps) {
    const config = STEP_CONFIGS[step.type];

    /* ── Continuation filler — just a colored block, stretches via flexGrow ── */
    if (step.continuation) {
        return (
            <motion.div
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cardClass}
                style={{
                    background: config.flatBg,
                    flexGrow: 1,
                    minHeight: '32px',
                }}
            />
        );
    }

    const Icon = config.icon;
    const isSpecial = step.type === 'start' || step.type === 'servieren';
    const accent = config.accent;

    const timerPct = timer ? ((timer.total - timer.remaining) / timer.total) * 100 : 0;
    const timerRunning = timer?.running ?? false;
    const timerDone = timer ? timer.remaining === 0 : false;

    const accentColor = isDone ? '#00b894' : timerRunning ? '#f39c12' : accent;

    /* Flat background — solid tint per step type, overridden by done/timer */
    let bg: string;
    if (isDone) {
        bg = 'rgba(0,184,148,0.06)';
    } else if (timer && timerRunning) {
        bg = `linear-gradient(to right, ${accent}22 ${timerPct}%, ${config.flatBg} ${timerPct}%)`;
    } else {
        bg = config.flatBg;
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: isDone ? 0.55 : 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ type: 'spring', stiffness: 440, damping: 32 }}
            className={cardClass}
            style={{
                background: bg,
                borderBottom: isLast ? 'none' : '1px solid rgba(0,0,0,0.07)',
                borderLeft: isCriticalPath ? '3px solid #f39c12' : undefined,
                flexGrow: isLast ? 1 : 0,
            }}
        >
            {/* ── Left image strip (flush, no padding) ── */}
            {photoKey && (
                <div className={imageStripClass}>
                    <img
                        src={getThumbnailUrl(photoKey, '3:4', 320)}
                        alt={step.label}
                        className={imageStripImgClass}
                    />
                </div>
            )}

            {/* ── Edit overlay (edit mode, center of card) ── */}
            {mode === 'edit' && onEdit && (
                <button type="button" onClick={onEdit} className={editOverlayClass}>
                    <div className={editOverlayIconClass}>
                        <Pencil className={css({ w: '14px', h: '14px' })} />
                    </div>
                </button>
            )}

            {/* ── Content ── */}
            <div className={contentClass}>
                {/* ── Header ── */}
                <div className={headerClass}>
                    <div className={typeBadgeClass} style={{ color: accentColor }}>
                        <Icon className={css({ w: '13px', h: '13px', flexShrink: '0' })} />
                        <span>{config.label}</span>
                    </div>

                    {step.duration &&
                        !timer &&
                        (isCriticalPath ? (
                            <span
                                className={criticalDurationClass}
                                title="Roter Faden — bestimmt die Gesamtdauer des Rezepts"
                            >
                                <Timer className={css({ w: '9px', h: '9px', flexShrink: '0' })} />
                                {step.duration} Min. · Roter Faden
                            </span>
                        ) : (
                            <span className={durationClass}>{step.duration} Min.</span>
                        ))}

                    {timer && !isDone && (
                        <span
                            className={timerDisplayClass}
                            style={{
                                color: timerDone ? '#00b894' : timerRunning ? '#f39c12' : '#999',
                            }}
                        >
                            {formatTimer(timer.remaining)}
                        </span>
                    )}

                    {mode === 'view' && !isSpecial && (
                        <DoneToggle isDone={isDone} onClick={onToggleDone} />
                    )}

                    {mode === 'edit' && !isSpecial && onDelete && (
                        <button
                            type="button"
                            onClick={onDelete}
                            className={deleteClass}
                            title="Löschen"
                        >
                            <Trash2 className={css({ w: '11px', h: '11px' })} />
                        </button>
                    )}
                </div>

                {/* ── Title ── */}
                <div
                    className={titleClass}
                    style={{
                        textDecoration: isDone ? 'line-through' : 'none',
                        textDecorationColor: '#00b89460',
                    }}
                >
                    {step.label}
                </div>

                {/* ── Description ── */}
                {step.description && <p className={descClass}>{step.description}</p>}

                {/* ── Timer controls (view mode) ── */}
                {timer && !isDone && mode === 'view' && (
                    <TimerControls
                        pct={timerPct}
                        running={timerRunning}
                        done={timerDone}
                        accent={accent}
                        onStart={onTimerStart}
                        onPause={onTimerPause}
                        onReset={onTimerReset}
                        onToggleDone={onToggleDone}
                    />
                )}

                {isSpecial && (
                    <div className={specialClass} style={{ color: accentColor }}>
                        {step.type === 'start' ? "Los geht's!" : 'Guten Appetit!'}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

/* ── Sub-components ── */

function DoneToggle({ isDone, onClick }: { isDone: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={doneToggleClass}
            style={{
                borderColor: isDone ? '#00b894' : 'rgba(0,0,0,0.12)',
                backgroundColor: isDone ? 'rgba(0,184,148,0.08)' : 'transparent',
                color: isDone ? '#00b894' : 'rgba(0,0,0,0.18)',
            }}
        >
            <Check className={css({ w: '11px', h: '11px' })} />
        </button>
    );
}

function TimerControls({
    pct,
    running,
    done,
    accent,
    onStart,
    onPause,
    onReset,
    onToggleDone,
}: {
    pct: number;
    running: boolean;
    done: boolean;
    accent: string;
    onStart: () => void;
    onPause: () => void;
    onReset: () => void;
    onToggleDone: () => void;
}) {
    return (
        <div className={timerWrapClass}>
            <div className={css({ display: 'flex', gap: '1', alignItems: 'center' })}>
                {!done && (
                    <button
                        type="button"
                        onClick={running ? onPause : onStart}
                        className={timerBtnClass}
                        style={{
                            color: accent,
                            borderColor: `${accent}33`,
                            background: `${accent}0d`,
                        }}
                    >
                        {running ? (
                            <>
                                <Pause className={css({ w: '10px', h: '10px' })} /> Pause
                            </>
                        ) : (
                            <>
                                <Play className={css({ w: '10px', h: '10px' })} /> Start
                            </>
                        )}
                    </button>
                )}
                {pct > 0 && !done && (
                    <button
                        type="button"
                        onClick={() => {
                            if (window.confirm('Timer zurücksetzen?')) onReset();
                        }}
                        className={timerResetClass}
                    >
                        <RotateCcw className={css({ w: '10px', h: '10px' })} />
                    </button>
                )}
                {done && (
                    <button type="button" onClick={onToggleDone} className={timerDoneClass}>
                        <Check className={css({ w: '12px', h: '12px' })} /> Fertig!
                    </button>
                )}
            </div>
        </div>
    );
}

/* ── Styles ── */

const cardClass = css({
    position: 'relative',
    display: 'flex',
    flexDirection: 'row',
    background: 'white',
    transition: 'opacity 0.2s ease, background 0.2s ease',
    overflow: 'hidden',
});

const imageStripClass = css({
    w: '90px',
    flexShrink: '0',
    overflow: 'hidden',
    borderRight: '1px solid rgba(0,0,0,0.06)',
});

const imageStripImgClass = css({
    w: '100%',
    h: '100%',
    objectFit: 'cover',
    display: 'block',
});

const contentClass = css({
    flex: '1',
    minW: '0',
    p: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
});

const headerClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
});

const typeBadgeClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    opacity: '0.7',
});

const durationClass = css({
    fontSize: '11px',
    color: 'text.muted',
    ml: 'auto',
    fontWeight: '500',
});

const timerDisplayClass = css({
    fontVariantNumeric: 'tabular-nums',
    fontSize: 'sm',
    fontWeight: '800',
    ml: 'auto',
});

const titleClass = css({
    fontWeight: '700',
    fontSize: '15px',
    color: '#111',
    lineHeight: '1.35',
});

const descClass = css({
    fontSize: '13px',
    color: 'text.muted',
    lineHeight: '1.55',
    lineClamp: '3',
    m: '0',
});

const specialClass = css({
    fontSize: '11px',
    fontWeight: '700',
    textAlign: 'center',
    pt: '2px',
    opacity: '0.8',
});

const doneToggleClass = css({
    ml: 'auto',
    flexShrink: '0',
    w: '22px',
    h: '22px',
    borderRadius: 'full',
    border: '1.5px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
});

const deleteClass = css({
    ml: 'auto',
    flexShrink: '0',
    w: '22px',
    h: '22px',
    borderRadius: 'full',
    border: 'none',
    bg: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'rgba(0,0,0,0.18)',
    transition: 'all 0.15s ease',
    _hover: { color: '#e74c3c', bg: 'rgba(231,76,60,0.07)' },
});

const timerWrapClass = css({
    mt: '4px',
    pt: '8px',
    borderTop: '1px solid rgba(0,0,0,0.05)',
});

const timerBtnClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    px: '10px',
    py: '5px',
    borderRadius: 'full',
    border: '1px solid',
    fontSize: '11px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
});

const timerResetClass = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    w: '26px',
    h: '26px',
    borderRadius: 'full',
    border: '1px solid rgba(0,0,0,0.08)',
    bg: 'transparent',
    color: '#aaa',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    _hover: { bg: 'rgba(0,0,0,0.04)' },
});

const editOverlayClass = css({
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    w: '72px',
    h: '72px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    bg: 'transparent',
    border: 'none',
    cursor: 'pointer',
    zIndex: '10',
    _hover: {
        '& > div': { opacity: '1', transform: 'scale(1)' },
    },
});

const editOverlayIconClass = css({
    w: '32px',
    h: '32px',
    borderRadius: 'full',
    bg: 'white',
    boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#e07b53',
    opacity: '0',
    transform: 'scale(0.8)',
    transition: 'opacity 0.15s ease, transform 0.15s ease',
});

const criticalDurationClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    flexShrink: '0',
    fontSize: '11px',
    fontWeight: '700',
    color: '#d68910',
    bg: 'rgba(243,156,18,0.12)',
    px: '7px',
    py: '2px',
    borderRadius: 'full',
});

const timerDoneClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    px: '12px',
    py: '5px',
    borderRadius: 'full',
    border: '1.5px solid #00b894',
    bg: 'rgba(0,184,148,0.07)',
    color: '#00b894',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    _hover: { bg: 'rgba(0,184,148,0.13)' },
});
