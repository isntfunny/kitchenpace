'use client';

import { Pause, Play, RotateCcw } from 'lucide-react';
import { type Dispatch } from 'react';

import { PALETTE } from '@app/lib/palette';

import type { TimerState, ViewerAction } from './viewerTypes';
import { formatTime } from './viewerUtils';

export function TimerDisplay({
    timerState,
    nodeId,
    isDone,
    isSpecial,
    dispatch,
}: {
    timerState: TimerState;
    nodeId: string;
    isDone: boolean;
    isSpecial: boolean;
    dispatch: Dispatch<ViewerAction>;
}) {
    const timerRunning = timerState.running;
    const timerDone = timerState.remaining === 0;
    const pct = ((timerState.total - timerState.remaining) / timerState.total) * 100;

    return (
        <div style={{ marginBottom: 20, textAlign: 'center' }}>
            <div
                style={{
                    fontSize: 'clamp(36px, 10vw, 56px)',
                    fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                    color: timerDone
                        ? PALETTE.emerald
                        : timerRunning
                          ? PALETTE.amber
                          : 'rgba(255,255,255,0.6)',
                    letterSpacing: '0.02em',
                    lineHeight: 1,
                    marginBottom: 12,
                }}
            >
                {formatTime(timerState.remaining)}
            </div>
            {/* Timer progress bar */}
            <div
                style={{
                    width: 200,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    margin: '0 auto 12px',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        height: '100%',
                        width: `${pct}%`,
                        backgroundColor: timerDone ? PALETTE.emerald : PALETTE.orange,
                        borderRadius: 2,
                        transition: 'width 1s linear',
                    }}
                />
            </div>
            {/* Timer buttons */}
            {!isDone && !isSpecial && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                    <button
                        type="button"
                        onClick={() => {
                            if (timerRunning) {
                                dispatch({ type: 'timerPause', nodeId });
                            } else {
                                dispatch({ type: 'timerStart', nodeId });
                            }
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '10px 20px',
                            borderRadius: 999,
                            border: '1.5px solid rgba(255,255,255,0.25)',
                            backgroundColor: timerRunning
                                ? 'rgba(231,76,60,0.2)'
                                : 'rgba(255,255,255,0.12)',
                            color: 'white',
                            fontSize: 14,
                            fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >
                        {timerRunning ? (
                            <>
                                <Pause style={{ width: 14, height: 14 }} /> Pause
                            </>
                        ) : (
                            <>
                                <Play style={{ width: 14, height: 14 }} /> Start
                            </>
                        )}
                    </button>
                    {pct > 0 && (
                        <button
                            type="button"
                            onClick={() => {
                                if (window.confirm('Timer wirklich zurücksetzen?')) {
                                    dispatch({ type: 'timerReset', nodeId });
                                }
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 48,
                                height: 48,
                                borderRadius: '50%',
                                border: '1.5px solid rgba(255,255,255,0.2)',
                                backgroundColor: 'rgba(255,255,255,0.08)',
                                color: 'rgba(255,255,255,0.7)',
                                cursor: 'pointer',
                            }}
                        >
                            <RotateCcw style={{ width: 14, height: 14 }} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
