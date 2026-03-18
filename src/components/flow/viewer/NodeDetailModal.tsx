'use client';

import { CheckCircle2, Clock, Pause, Play, RotateCcw, X } from 'lucide-react';
import { useMemo } from 'react';

import { PALETTE } from '@app/lib/palette';
import { getThumbnailUrl } from '@app/lib/thumbnail-client';

import { css, cx } from 'styled-system/css';

import type { FlowNodeSerialized, StepType } from '../editor/editorTypes';
import { getStepConfig } from '../editor/stepConfig';

import type { RecipeStepsViewerProps, TimerState } from './viewerTypes';
import { extractMentionedIds, formatTime, renderDescription } from './viewerUtils';

const closeButtonBase = css({
    position: 'absolute',
    top: '12px',
    right: '12px',
    zIndex: 10,
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
});
const closeButtonPhoto = css({ bg: 'bg.closePhoto', color: 'white' });
const closeButtonDefault = css({ bg: 'bg.close', color: 'text.mid' });

export function NodeDetailModal({
    node,
    ingredients,
    timerState,
    completed,
    onClose,
    onToggle,
    onTimerStart,
    onTimerPause,
    onTimerReset,
}: {
    node: FlowNodeSerialized;
    ingredients?: RecipeStepsViewerProps['ingredients'];
    timerState?: TimerState;
    completed: boolean;
    onClose: () => void;
    onToggle: () => void;
    onTimerStart: () => void;
    onTimerPause: () => void;
    onTimerReset: () => void;
}) {
    const config = getStepConfig(node.type as StepType);
    const Icon = config.icon;
    const isSpecial = node.type === 'start' || node.type === 'servieren';

    const stepIngredients = useMemo(() => {
        if (!ingredients) return [];
        const ids = extractMentionedIds(node.description);
        return ids.size > 0 ? ingredients.filter((i) => ids.has(i.id)) : [];
    }, [node.description, ingredients]);

    const hasTimer = !!timerState;
    const timerRunning = hasTimer && timerState!.running;
    const pct = hasTimer
        ? ((timerState!.total - timerState!.remaining) / timerState!.total) * 100
        : 0;
    const timerDone = hasTimer && timerState!.remaining === 0;

    return (
        <div
            className={css({
                position: 'fixed',
                inset: 0,
                bg: 'surface.overlay',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
                backdropFilter: 'blur(2px)',
            })}
            onClick={onClose}
        >
            <div
                className={css({
                    bg: 'surface',
                    borderRadius: '20px',
                    maxWidth: '480px',
                    width: '100%',
                    maxHeight: '88vh',
                    overflowY: 'auto',
                    boxShadow: 'shadow.dialog',
                    position: 'relative',
                })}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close */}
                <button
                    type="button"
                    onClick={onClose}
                    className={cx(
                        closeButtonBase,
                        node.photoKey ? closeButtonPhoto : closeButtonDefault,
                    )}
                >
                    <X style={{ width: 16, height: 16 }} />
                </button>

                {/* Photo */}
                {node.photoKey && (
                    <img
                        src={getThumbnailUrl(node.photoKey, '2:1', 640)}
                        alt=""
                        style={{
                            width: '100%',
                            height: 220,
                            objectFit: 'cover',
                            borderRadius: '20px 20px 0 0',
                            display: 'block',
                        }}
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                )}

                {/* Timer progress bar */}
                {hasTimer && (
                    <div className={css({ height: '4px', bg: 'bg.progress' })}>
                        <div
                            style={{
                                height: '100%',
                                width: `${pct}%`,
                                background: timerDone
                                    ? PALETTE.emerald
                                    : `linear-gradient(90deg, ${PALETTE.orange}, #f39c12)`,
                                transition: 'width 1s linear',
                                boxShadow:
                                    timerRunning && pct > 0
                                        ? '0 0 8px rgba(224,123,83,0.6)'
                                        : 'none',
                            }}
                        />
                    </div>
                )}

                <div style={{ padding: '20px 24px 28px' }}>
                    {/* Header */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginBottom: 12,
                        }}
                    >
                        <span
                            className={css({ color: 'badge.text' })}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                backgroundColor: config.color,
                                backgroundImage: config.gradient,
                                borderRadius: 999,
                                padding: '4px 10px',
                                fontSize: 11,
                                fontWeight: 700,
                            }}
                        >
                            <Icon style={{ width: 12, height: 12 }} />
                            {config.label}
                        </span>
                        {hasTimer && (
                            <span
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    fontSize: 12,
                                    color: timerRunning ? PALETTE.orange : undefined,
                                    fontWeight: timerRunning ? 700 : 400,
                                    marginLeft: 'auto',
                                }}
                                className={
                                    !timerRunning ? css({ color: 'text.subtle' }) : undefined
                                }
                            >
                                <Clock style={{ width: 13, height: 13 }} />
                                {timerRunning || pct > 0
                                    ? formatTime(timerState!.remaining)
                                    : `${node.duration} Min.`}
                            </span>
                        )}
                    </div>

                    {/* Title */}
                    <h3
                        className={css({ color: 'text.heading' })}
                        style={{
                            fontSize: 22,
                            fontWeight: 800,
                            marginBottom: 12,
                            lineHeight: 1.2,
                        }}
                    >
                        {node.label}
                    </h3>

                    {/* Description */}
                    {node.description && (
                        <p
                            className={css({ color: 'text.mid' })}
                            style={{
                                fontSize: 14,
                                lineHeight: 1.65,
                                marginBottom: 16,
                            }}
                        >
                            {renderDescription(node.description, ingredients)}
                        </p>
                    )}

                    {/* Step ingredients */}
                    {stepIngredients.length > 0 && (
                        <div
                            style={{
                                backgroundColor: 'rgba(224,123,83,0.06)',
                                border: '1px solid rgba(224,123,83,0.15)',
                                borderRadius: 12,
                                padding: '12px 16px',
                                marginBottom: 16,
                            }}
                        >
                            <div
                                className={css({ color: 'text.label' })}
                                style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    textTransform: 'uppercase' as const,
                                    letterSpacing: '0.06em',
                                    marginBottom: 8,
                                }}
                            >
                                Zutaten für diesen Schritt
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column' as const,
                                    gap: 6,
                                }}
                            >
                                {stepIngredients.map((ing) => (
                                    <div
                                        key={ing.id}
                                        className={css({ color: 'text.ingredient' })}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            fontSize: 13,
                                        }}
                                    >
                                        <span
                                            style={{
                                                width: 6,
                                                height: 6,
                                                borderRadius: '50%',
                                                backgroundColor: PALETTE.orange,
                                                flexShrink: 0,
                                            }}
                                        />
                                        <span style={{ fontWeight: 600 }}>{ing.name}</span>
                                        {(ing.amount || ing.unit) && (
                                            <span
                                                className={css({ color: 'text.subtle' })}
                                                style={{ marginLeft: 'auto' }}
                                            >
                                                {[ing.amount, ing.unit].filter(Boolean).join(' ')}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Timer controls */}
                    {hasTimer && !completed && !isSpecial && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                marginBottom: 16,
                            }}
                        >
                            <button
                                type="button"
                                onClick={timerRunning ? onTimerPause : onTimerStart}
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                    padding: '10px 16px',
                                    borderRadius: 12,
                                    border: `1.5px solid ${timerRunning ? 'rgba(231,76,60,0.3)' : 'rgba(224,123,83,0.3)'}`,
                                    backgroundColor: timerRunning
                                        ? 'rgba(231,76,60,0.08)'
                                        : 'rgba(224,123,83,0.08)',
                                    color: timerRunning ? '#e74c3c' : PALETTE.orange,
                                    fontSize: 13,
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
                                        <Play style={{ width: 14, height: 14 }} /> Timer starten
                                    </>
                                )}
                            </button>
                            {pct > 0 && (
                                <button
                                    type="button"
                                    onClick={onTimerReset}
                                    className={css({
                                        borderColor: 'border.input',
                                        bg: 'surface.mutedLight',
                                        color: 'text.subtle',
                                    })}
                                    style={{
                                        padding: '10px',
                                        borderRadius: 12,
                                        borderWidth: '1.5px',
                                        borderStyle: 'solid',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <RotateCcw style={{ width: 14, height: 14 }} />
                                </button>
                            )}
                        </div>
                    )}

                    {/* Done button */}
                    {!isSpecial && (
                        <button
                            type="button"
                            onClick={() => {
                                onToggle();
                                onClose();
                            }}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                borderRadius: 12,
                                border: completed ? '1.5px solid rgba(0,184,148,0.3)' : 'none',
                                backgroundColor: completed ? 'rgba(0,184,148,0.1)' : PALETTE.orange,
                                color: completed ? PALETTE.emerald : 'white',
                                fontSize: 14,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {completed ? (
                                <>
                                    <CheckCircle2 style={{ width: 16, height: 16 }} /> Als erledigt
                                    markiert
                                </>
                            ) : (
                                'Als erledigt markieren'
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
