'use client';

import { Check, ChevronLeft, ChevronRight, Clock, Pause, Play, RotateCcw } from 'lucide-react';
import { useRef, useState } from 'react';

/* ── Types ────────────────────────────────────────────────────────────────── */

export interface LaneStep {
    id: string;
    label: string;
    description?: string;
    /** Duration in minutes — creates a mock timer display */
    duration?: number;
    type?: string;
}

/** One "phase" = one dagre column = all steps that can run in parallel */
export interface LanePhase {
    steps: LaneStep[];
}

interface TimerMock {
    remaining: number; // seconds
    total: number;
    running: boolean;
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

const ORANGE = '#e07b53';
const EMERALD = '#00b894';
const AMBER = '#f39c12';

/* ── Step type emoji ──────────────────────────────────────────────────────── */

const TYPE_EMOJI: Record<string, string> = {
    start: '🚀',
    schneiden: '🔪',
    kochen: '🍳',
    braten: '🔥',
    backen: '🫕',
    mixen: '🌀',
    warten: '⏳',
    wuerzen: '🧂',
    anrichten: '🍽',
    servieren: '✅',
};

/* ── Phase progress dots ──────────────────────────────────────────────────── */

function PhaseDots({
    total,
    current,
    doneFlags,
    onJump,
}: {
    total: number;
    current: number;
    doneFlags: boolean[];
    onJump: (i: number) => void;
}) {
    return (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            {Array.from({ length: total }, (_, i) => (
                <button
                    key={i}
                    type="button"
                    onClick={() => onJump(i)}
                    style={{
                        width: i === current ? 24 : 8,
                        height: 8,
                        borderRadius: 4,
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.25s ease',
                        backgroundColor: i === current
                            ? ORANGE
                            : doneFlags[i]
                              ? EMERALD
                              : 'rgba(0,0,0,0.12)',
                        padding: 0,
                        flexShrink: 0,
                    }}
                    aria-label={`Phase ${i + 1}`}
                />
            ))}
        </div>
    );
}

/* ── Single lane card ─────────────────────────────────────────────────────── */

function LaneCard({
    step,
    isDone,
    timer,
    onToggle,
    onTimerStart,
    onTimerPause,
    onTimerReset,
    colCount,
}: {
    step: LaneStep;
    isDone: boolean;
    timer?: TimerMock;
    onToggle: () => void;
    onTimerStart: () => void;
    onTimerPause: () => void;
    onTimerReset: () => void;
    colCount: number;
}) {
    const isSpecial = step.type === 'start' || step.type === 'servieren';
    const timerRunning = timer?.running ?? false;
    const timerDone = timer ? timer.remaining === 0 : false;
    const pct = timer ? ((timer.total - timer.remaining) / timer.total) * 100 : 0;
    const emoji = TYPE_EMOJI[step.type ?? ''] ?? '📋';

    return (
        <div
            style={{
                flex: colCount === 1 ? '1 1 100%' : `1 1 calc(${100 / Math.min(colCount, 3)}% - 12px)`,
                minWidth: colCount > 1 ? 'min(260px, calc(50vw - 40px))' : 'unset',
                maxWidth: colCount === 1 ? '600px' : undefined,
                borderRadius: 16,
                border: '1.5px solid',
                borderColor: isDone
                    ? 'rgba(0,184,148,0.3)'
                    : timerRunning
                      ? 'rgba(243,156,18,0.4)'
                      : 'rgba(224,123,83,0.2)',
                backgroundColor: isDone
                    ? 'rgba(0,184,148,0.05)'
                    : timerRunning
                      ? 'rgba(243,156,18,0.05)'
                      : 'white',
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                transition: 'all 0.2s ease',
                opacity: isDone ? 0.75 : 1,
                boxShadow: isDone ? 'none' : '0 2px 12px rgba(0,0,0,0.06)',
            }}
        >
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                {/* Emoji icon */}
                <div
                    style={{
                        fontSize: 20,
                        lineHeight: 1,
                        flexShrink: 0,
                        marginTop: 2,
                    }}
                >
                    {isDone ? '✅' : emoji}
                </div>

                {/* Title */}
                <div style={{ flex: 1 }}>
                    <div
                        style={{
                            fontWeight: 700,
                            fontSize: 15,
                            color: isDone ? '#666' : '#1a1a1a',
                            lineHeight: 1.3,
                            textDecoration: isDone ? 'line-through' : 'none',
                            textDecorationColor: 'rgba(0,184,148,0.5)',
                        }}
                    >
                        {step.label}
                    </div>
                    {step.duration && !timer && (
                        <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                            ~{step.duration} Min.
                        </div>
                    )}
                </div>

                {/* Done toggle (top right) */}
                {!isSpecial && (
                    <button
                        type="button"
                        onClick={onToggle}
                        style={{
                            flexShrink: 0,
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            border: '1.5px solid',
                            borderColor: isDone ? EMERALD : 'rgba(0,0,0,0.15)',
                            backgroundColor: isDone ? 'rgba(0,184,148,0.1)' : 'white',
                            color: isDone ? EMERALD : 'rgba(0,0,0,0.3)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                        }}
                        title={isDone ? 'Als unerledigt markieren' : 'Als erledigt markieren'}
                    >
                        <Check style={{ width: 14, height: 14 }} />
                    </button>
                )}
            </div>

            {/* Description */}
            {step.description && (
                <p
                    style={{
                        margin: 0,
                        fontSize: 13,
                        color: isDone ? '#aaa' : '#555',
                        lineHeight: 1.55,
                    }}
                >
                    {step.description}
                </p>
            )}

            {/* Timer block */}
            {timer && !isDone && (
                <div
                    style={{
                        marginTop: 4,
                        padding: '10px 12px',
                        borderRadius: 10,
                        backgroundColor: timerRunning
                            ? 'rgba(243,156,18,0.06)'
                            : timerDone
                              ? 'rgba(0,184,148,0.06)'
                              : 'rgba(0,0,0,0.03)',
                        border: '1px solid',
                        borderColor: timerRunning
                            ? 'rgba(243,156,18,0.2)'
                            : timerDone
                              ? 'rgba(0,184,148,0.2)'
                              : 'rgba(0,0,0,0.06)',
                    }}
                >
                    {/* Time display */}
                    <div
                        style={{
                            fontSize: 26,
                            fontWeight: 800,
                            fontVariantNumeric: 'tabular-nums',
                            color: timerDone ? EMERALD : timerRunning ? AMBER : ORANGE,
                            lineHeight: 1,
                            marginBottom: 8,
                            letterSpacing: '0.02em',
                        }}
                    >
                        {formatTime(timer.remaining)}
                    </div>

                    {/* Progress bar */}
                    <div
                        style={{
                            height: 3,
                            borderRadius: 2,
                            backgroundColor: 'rgba(0,0,0,0.08)',
                            marginBottom: 10,
                            overflow: 'hidden',
                        }}
                    >
                        <div
                            style={{
                                height: '100%',
                                width: `${pct}%`,
                                backgroundColor: timerDone ? EMERALD : ORANGE,
                                borderRadius: 2,
                                transition: 'width 1s linear',
                            }}
                        />
                    </div>

                    {/* Timer buttons */}
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button
                            type="button"
                            onClick={timerRunning ? onTimerPause : onTimerStart}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '6px 12px',
                                borderRadius: 999,
                                border: '1px solid',
                                borderColor: timerRunning
                                    ? 'rgba(243,156,18,0.3)'
                                    : 'rgba(224,123,83,0.25)',
                                backgroundColor: timerRunning ? 'rgba(243,156,18,0.1)' : 'rgba(224,123,83,0.08)',
                                color: timerRunning ? AMBER : ORANGE,
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            {timerRunning ? (
                                <><Pause style={{ width: 11, height: 11 }} /> Pause</>
                            ) : (
                                <><Play style={{ width: 11, height: 11 }} /> Start</>
                            )}
                        </button>
                        {pct > 0 && !timerDone && (
                            <button
                                type="button"
                                onClick={onTimerReset}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 30,
                                    height: 30,
                                    borderRadius: '50%',
                                    border: '1px solid rgba(0,0,0,0.1)',
                                    backgroundColor: 'transparent',
                                    color: '#999',
                                    cursor: 'pointer',
                                }}
                                title="Zurücksetzen"
                            >
                                <RotateCcw style={{ width: 11, height: 11 }} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Timer + done state */}
            {timer && !isDone && timerDone && (
                <button
                    type="button"
                    onClick={onToggle}
                    style={{
                        marginTop: 2,
                        padding: '8px 16px',
                        borderRadius: 999,
                        border: `1.5px solid ${EMERALD}`,
                        backgroundColor: 'rgba(0,184,148,0.08)',
                        color: EMERALD,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                    }}
                >
                    <Check style={{ width: 14, height: 14 }} />
                    Timer fertig — Erledigt?
                </button>
            )}

            {/* Start/Servieren special style */}
            {isSpecial && (
                <div
                    style={{
                        fontSize: 12,
                        color: EMERALD,
                        fontWeight: 600,
                        textAlign: 'center',
                        padding: '4px 0 2px',
                    }}
                >
                    {step.type === 'start' ? 'Los geht\'s!' : 'Guten Appetit!'}
                </div>
            )}
        </div>
    );
}

/* ── Main component ───────────────────────────────────────────────────────── */

export function LaneWizardView({ phases }: { phases: LanePhase[] }) {
    const [phaseIndex, setPhaseIndex] = useState(0);
    const [completed, setCompleted] = useState<Set<string>>(new Set());
    const [timers, setTimers] = useState<Map<string, TimerMock>>(() => {
        const m = new Map<string, TimerMock>();
        for (const phase of phases) {
            for (const step of phase.steps) {
                if (step.duration) {
                    m.set(step.id, {
                        remaining: step.duration * 60,
                        total: step.duration * 60,
                        running: false,
                    });
                }
            }
        }
        return m;
    });

    const touchStartX = useRef(0);
    const SWIPE_THRESHOLD = 50;

    const canGoLeft = phaseIndex > 0;
    const canGoRight = phaseIndex < phases.length - 1;

    const goLeft = () => { if (canGoLeft) setPhaseIndex((p) => p - 1); };
    const goRight = () => { if (canGoRight) setPhaseIndex((p) => p + 1); };

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };
    const handleTouchEnd = (e: React.TouchEvent) => {
        const dx = touchStartX.current - e.changedTouches[0].clientX;
        if (dx > SWIPE_THRESHOLD) goRight();
        else if (dx < -SWIPE_THRESHOLD) goLeft();
    };

    const toggle = (id: string) => {
        setCompleted((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const timerStart = (id: string) => {
        setTimers((prev) => {
            const t = prev.get(id);
            if (!t || t.remaining === 0) return prev;
            const next = new Map(prev);
            next.set(id, { ...t, running: true });
            // Tick via interval (mock only — no cleanup for brevity in mock)
            const interval = setInterval(() => {
                setTimers((cur) => {
                    const ct = cur.get(id);
                    if (!ct || !ct.running) { clearInterval(interval); return cur; }
                    if (ct.remaining <= 1) {
                        clearInterval(interval);
                        const m = new Map(cur);
                        m.set(id, { ...ct, remaining: 0, running: false });
                        return m;
                    }
                    const m = new Map(cur);
                    m.set(id, { ...ct, remaining: ct.remaining - 1 });
                    return m;
                });
            }, 1000);
            return next;
        });
    };

    const timerPause = (id: string) => {
        setTimers((prev) => {
            const t = prev.get(id);
            if (!t) return prev;
            const next = new Map(prev);
            next.set(id, { ...t, running: false });
            return next;
        });
    };

    const timerReset = (id: string) => {
        setTimers((prev) => {
            const t = prev.get(id);
            if (!t) return prev;
            const next = new Map(prev);
            next.set(id, { remaining: t.total, running: false, total: t.total });
            return next;
        });
    };

    // Phase done when all non-start/servieren steps are completed
    const phaseDone = phases.map((phase) =>
        phase.steps
            .filter((s) => s.type !== 'start' && s.type !== 'servieren')
            .every((s) => completed.has(s.id)),
    );

    const currentPhase = phases[phaseIndex];
    const totalSteps = phases.reduce((sum, p) => sum + p.steps.filter((s) => s.type !== 'start').length, 0);
    const completedSteps = completed.size;

    return (
        <div
            style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                minHeight: '100%',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#faf9f7',
                touchAction: 'pan-y',
                userSelect: 'none',
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* ── Header bar ── */}
            <div
                style={{
                    padding: '14px 20px 10px',
                    borderBottom: '1px solid rgba(0,0,0,0.07)',
                    backgroundColor: 'white',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    flexShrink: 0,
                }}
            >
                {/* Top row: phase label + overall progress */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <span
                            style={{
                                fontSize: 11,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                color: '#aaa',
                            }}
                        >
                            Phase
                        </span>
                        <span
                            style={{
                                fontSize: 22,
                                fontWeight: 800,
                                color: '#1a1a1a',
                                marginLeft: 6,
                                lineHeight: 1,
                            }}
                        >
                            {phaseIndex + 1}
                            <span style={{ fontSize: 14, color: '#bbb', fontWeight: 500 }}>
                                {' '}/{' '}{phases.length}
                            </span>
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Clock style={{ width: 13, height: 13, color: '#bbb' }} />
                        <span style={{ fontSize: 12, color: '#999' }}>
                            {completedSteps}/{totalSteps} erledigt
                        </span>
                    </div>
                </div>

                {/* Phase dots */}
                <PhaseDots
                    total={phases.length}
                    current={phaseIndex}
                    doneFlags={phaseDone}
                    onJump={setPhaseIndex}
                />

                {/* Overall progress bar */}
                <div
                    style={{
                        height: 3,
                        borderRadius: 2,
                        backgroundColor: 'rgba(0,0,0,0.07)',
                        overflow: 'hidden',
                    }}
                >
                    <div
                        style={{
                            height: '100%',
                            width: totalSteps > 0 ? `${(completedSteps / totalSteps) * 100}%` : '0%',
                            backgroundColor: EMERALD,
                            borderRadius: 2,
                            transition: 'width 0.3s ease',
                        }}
                    />
                </div>
            </div>

            {/* ── Phase label (parallel hint) ── */}
            {currentPhase && currentPhase.steps.length > 1 && (
                <div
                    style={{
                        margin: '12px 20px 0',
                        padding: '8px 14px',
                        borderRadius: 10,
                        backgroundColor: 'rgba(224,123,83,0.07)',
                        border: '1px solid rgba(224,123,83,0.18)',
                        fontSize: 12,
                        color: ORANGE,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                    }}
                >
                    <span>⚡</span>
                    {currentPhase.steps.length} Schritte gleichzeitig möglich
                </div>
            )}

            {/* ── Cards area ── */}
            <div
                style={{
                    flex: 1,
                    padding: '14px 20px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 12,
                    alignContent: 'flex-start',
                    overflowY: 'auto',
                }}
            >
                {currentPhase?.steps.map((step) => (
                    <LaneCard
                        key={step.id}
                        step={step}
                        isDone={completed.has(step.id)}
                        timer={timers.get(step.id)}
                        onToggle={() => toggle(step.id)}
                        onTimerStart={() => timerStart(step.id)}
                        onTimerPause={() => timerPause(step.id)}
                        onTimerReset={() => timerReset(step.id)}
                        colCount={currentPhase.steps.length}
                    />
                ))}
            </div>

            {/* ── Bottom navigation ── */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 20px 20px',
                    borderTop: '1px solid rgba(0,0,0,0.07)',
                    backgroundColor: 'white',
                    flexShrink: 0,
                }}
            >
                <button
                    type="button"
                    onClick={goLeft}
                    disabled={!canGoLeft}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '10px 16px',
                        borderRadius: 12,
                        border: 'none',
                        backgroundColor: canGoLeft ? 'rgba(0,0,0,0.06)' : 'transparent',
                        color: canGoLeft ? '#333' : '#ccc',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: canGoLeft ? 'pointer' : 'default',
                        transition: 'all 0.15s ease',
                    }}
                >
                    <ChevronLeft style={{ width: 16, height: 16 }} />
                    Zurück
                </button>

                {/* All done in phase → auto-advance hint */}
                {phaseDone[phaseIndex] && canGoRight && (
                    <button
                        type="button"
                        onClick={goRight}
                        style={{
                            padding: '8px 16px',
                            borderRadius: 999,
                            border: 'none',
                            backgroundColor: EMERALD,
                            color: 'white',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            animation: 'pulse 2s infinite',
                        }}
                    >
                        <Check style={{ width: 13, height: 13 }} />
                        Phase fertig!
                    </button>
                )}

                <button
                    type="button"
                    onClick={goRight}
                    disabled={!canGoRight}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '10px 16px',
                        borderRadius: 12,
                        border: 'none',
                        backgroundColor: canGoRight ? `rgba(224,123,83,0.12)` : 'transparent',
                        color: canGoRight ? ORANGE : '#ccc',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: canGoRight ? 'pointer' : 'default',
                        transition: 'all 0.15s ease',
                    }}
                >
                    Weiter
                    <ChevronRight style={{ width: 16, height: 16 }} />
                </button>
            </div>
        </div>
    );
}
