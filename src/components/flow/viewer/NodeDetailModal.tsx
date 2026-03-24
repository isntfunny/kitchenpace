'use client';

import { Check, CheckCircle2, Clock, Pause, Play, RotateCcw, X } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';

import { PALETTE } from '@app/lib/palette';
import { getThumbnailUrl } from '@app/lib/thumbnail-client';

import { css } from 'styled-system/css';

import type { FlowNodeSerialized, StepType } from '../editor/editorTypes';
import { getStepConfig } from '../editor/stepConfig';

import type { RecipeStepsViewerProps, TimerState } from './viewerTypes';
import { extractMentionedIds, formatTime, renderDescription } from './viewerUtils';

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
    const dialogRef = useRef<HTMLDivElement>(null);

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

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    // Animate in
    useEffect(() => {
        requestAnimationFrame(() => {
            if (dialogRef.current) dialogRef.current.style.opacity = '1';
        });
    }, []);

    return (
        <div
            ref={dialogRef}
            className={css({
                position: 'fixed',
                inset: 0,
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
            })}
            style={{
                backgroundColor: 'rgba(0,0,0,0.45)',
                backdropFilter: 'blur(6px)',
                opacity: 0,
                transition: 'opacity 0.15s ease',
            }}
            onClick={onClose}
        >
            <div
                className={css({
                    bg: 'surface',
                    borderRadius: '2xl',
                    maxWidth: '460px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    boxShadow: '0 24px 80px rgba(0,0,0,0.25), 0 0 0 1px rgba(224,123,83,0.08)',
                    position: 'relative',
                })}
                style={{ transform: 'translateY(0)', transition: 'transform 0.2s ease' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── Hero section: photo or gradient header ── */}
                <div
                    style={{
                        position: 'relative',
                        backgroundImage: node.photoKey ? undefined : config.gradient,
                        backgroundColor: node.photoKey ? undefined : config.color,
                        borderRadius: '16px 16px 0 0',
                        overflow: 'hidden',
                    }}
                >
                    {node.photoKey ? (
                        <img
                            src={getThumbnailUrl(node.photoKey, '2:1', 640)}
                            alt=""
                            style={{
                                width: '100%',
                                height: 200,
                                objectFit: 'cover',
                                display: 'block',
                            }}
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                    ) : (
                        <div style={{ height: 56 }} />
                    )}

                    {/* Close button */}
                    <button
                        type="button"
                        onClick={onClose}
                        className={css({
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            width: '30px',
                            height: '30px',
                            borderRadius: 'full',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'transform 0.15s ease',
                            _hover: { transform: 'scale(1.1)' },
                        })}
                        style={{
                            backgroundColor: node.photoKey
                                ? 'rgba(0,0,0,0.45)'
                                : 'rgba(0,0,0,0.12)',
                            color: node.photoKey ? 'white' : 'rgba(0,0,0,0.5)',
                        }}
                    >
                        <X style={{ width: 14, height: 14 }} />
                    </button>

                    {/* Step type badge — overlaps the bottom edge of the hero */}
                    {node.photoKey && (
                        <div
                            style={{
                                position: 'absolute',
                                bottom: -14,
                                left: 24,
                            }}
                        >
                            <span
                                className={css({ color: 'badge.text' })}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    backgroundColor: config.color,
                                    backgroundImage: config.gradient,
                                    borderRadius: 999,
                                    padding: '5px 12px',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                                }}
                            >
                                <Icon style={{ width: 12, height: 12 }} />
                                {config.label}
                            </span>
                        </div>
                    )}
                </div>

                {/* Timer progress bar */}
                {hasTimer && (
                    <div
                        className={css({ bg: 'bg.progress' })}
                        style={{ height: 3, position: 'relative' }}
                    >
                        <div
                            style={{
                                height: '100%',
                                width: `${pct}%`,
                                background: timerDone
                                    ? PALETTE.emerald
                                    : `linear-gradient(90deg, ${PALETTE.orange}, ${PALETTE.amber})`,
                                transition: 'width 1s linear',
                                boxShadow:
                                    timerRunning && pct > 0
                                        ? '0 0 8px rgba(224,123,83,0.6)'
                                        : 'none',
                            }}
                        />
                    </div>
                )}

                {/* ── Content ── */}
                <div
                    style={{
                        padding: node.photoKey ? '24px 24px 24px' : '12px 24px 24px',
                    }}
                >
                    {/* Badge (only when there's no photo, since it's already overlaid on the photo) */}
                    {!node.photoKey && (
                        <div style={{ marginBottom: 12 }}>
                            <span
                                className={css({ color: 'badge.text' })}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
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
                        </div>
                    )}

                    {/* Title + duration row */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 12,
                            marginBottom: 14,
                        }}
                    >
                        <h3
                            className={css({ color: 'text.heading' })}
                            style={{
                                fontSize: 20,
                                fontWeight: 800,
                                lineHeight: 1.25,
                                flex: 1,
                                margin: 0,
                            }}
                        >
                            {node.label}
                        </h3>
                        {hasTimer && (
                            <span
                                className={css({
                                    flexShrink: 0,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    borderRadius: 'full',
                                    py: '1',
                                    px: '2.5',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                })}
                                style={{
                                    backgroundColor: timerRunning
                                        ? 'rgba(224,123,83,0.1)'
                                        : timerDone
                                          ? 'rgba(0,184,148,0.1)'
                                          : 'rgba(0,0,0,0.05)',
                                    color: timerRunning
                                        ? PALETTE.orange
                                        : timerDone
                                          ? PALETTE.emerald
                                          : undefined,
                                }}
                            >
                                <Clock style={{ width: 12, height: 12 }} />
                                {timerRunning || pct > 0
                                    ? formatTime(timerState!.remaining)
                                    : `${node.duration} Min.`}
                            </span>
                        )}
                        {/* Non-timer duration */}
                        {!hasTimer && node.duration && node.duration > 0 && (
                            <span
                                className={css({
                                    flexShrink: 0,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '12px',
                                    color: 'text.subtle',
                                })}
                            >
                                <Clock style={{ width: 12, height: 12 }} />~{node.duration} Min.
                            </span>
                        )}
                    </div>

                    {/* Description */}
                    {node.description && (
                        <p
                            className={css({ color: 'text.mid' })}
                            style={{
                                fontSize: 14,
                                lineHeight: 1.7,
                                margin: 0,
                                marginBottom: stepIngredients.length > 0 ? 16 : 20,
                            }}
                        >
                            {renderDescription(node.description, ingredients)}
                        </p>
                    )}

                    {/* Step ingredients */}
                    {stepIngredients.length > 0 && (
                        <div
                            className={css({
                                borderRadius: 'xl',
                                border: {
                                    base: '1px solid rgba(224,123,83,0.12)',
                                    _dark: '1px solid rgba(224,123,83,0.18)',
                                },
                                bg: {
                                    base: 'rgba(224,123,83,0.04)',
                                    _dark: 'rgba(224,123,83,0.06)',
                                },
                                mb: '4',
                                overflow: 'hidden',
                            })}
                        >
                            <div
                                className={css({
                                    px: '4',
                                    pt: '3',
                                    pb: '0.5',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.06em',
                                    color: 'text.label',
                                })}
                            >
                                Zutaten für diesen Schritt
                            </div>
                            <div className={css({ px: '4', pb: '3' })}>
                                {stepIngredients.map((ing, i) => (
                                    <div
                                        key={ing.id}
                                        className={css({
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '2.5',
                                            py: '1.5',
                                        })}
                                        style={{
                                            borderTop:
                                                i > 0 ? '1px solid rgba(224,123,83,0.08)' : 'none',
                                        }}
                                    >
                                        <span
                                            style={{
                                                width: 5,
                                                height: 5,
                                                borderRadius: '50%',
                                                backgroundColor: PALETTE.orange,
                                                flexShrink: 0,
                                                opacity: 0.7,
                                            }}
                                        />
                                        <span
                                            className={css({
                                                fontWeight: 600,
                                                fontSize: '13px',
                                                color: 'text',
                                                flex: 1,
                                            })}
                                        >
                                            {ing.name}
                                        </span>
                                        {(ing.amount || ing.unit) && (
                                            <span
                                                className={css({
                                                    color: 'text.subtle',
                                                    fontSize: '12px',
                                                    fontWeight: 500,
                                                    flexShrink: 0,
                                                })}
                                            >
                                                {[ing.amount, ing.unit].filter(Boolean).join(' ')}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Action row: timer controls + done button ── */}
                    {!isSpecial && (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 10,
                            }}
                        >
                            {/* Timer controls */}
                            {hasTimer && !completed && (
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                    }}
                                >
                                    <button
                                        type="button"
                                        onClick={timerRunning ? onTimerPause : onTimerStart}
                                        className={css({
                                            flex: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '1.5',
                                            py: '2.5',
                                            px: '4',
                                            borderRadius: 'xl',
                                            fontSize: '13px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                        })}
                                        style={{
                                            border: `1.5px solid ${timerRunning ? 'rgba(231,76,60,0.25)' : 'rgba(224,123,83,0.25)'}`,
                                            backgroundColor: timerRunning
                                                ? 'rgba(231,76,60,0.06)'
                                                : 'rgba(224,123,83,0.06)',
                                            color: timerRunning ? '#e74c3c' : PALETTE.orange,
                                        }}
                                    >
                                        {timerRunning ? (
                                            <>
                                                <Pause style={{ width: 14, height: 14 }} /> Pause
                                            </>
                                        ) : timerDone ? (
                                            <>
                                                <Check style={{ width: 14, height: 14 }} /> Timer
                                                fertig
                                            </>
                                        ) : (
                                            <>
                                                <Play style={{ width: 14, height: 14 }} /> Timer
                                                starten
                                            </>
                                        )}
                                    </button>
                                    {pct > 0 && !timerDone && (
                                        <button
                                            type="button"
                                            onClick={onTimerReset}
                                            className={css({
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                py: '2.5',
                                                px: '2.5',
                                                borderRadius: 'xl',
                                                border: '1.5px solid',
                                                borderColor: 'border.input',
                                                bg: 'surface.mutedLight',
                                                color: 'text.subtle',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                                _hover: { color: 'palette.orange' },
                                            })}
                                        >
                                            <RotateCcw style={{ width: 14, height: 14 }} />
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Done button */}
                            <button
                                type="button"
                                onClick={() => {
                                    onToggle();
                                    if (!completed) onClose();
                                }}
                                className={css({
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '1.5',
                                    py: '3',
                                    px: '4',
                                    borderRadius: 'xl',
                                    fontSize: '14px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                })}
                                style={
                                    completed
                                        ? {
                                              border: '1.5px solid rgba(0,184,148,0.25)',
                                              backgroundColor: 'rgba(0,184,148,0.08)',
                                              color: PALETTE.emerald,
                                          }
                                        : {
                                              border: 'none',
                                              backgroundColor: PALETTE.orange,
                                              color: 'white',
                                          }
                                }
                            >
                                {completed ? (
                                    <>
                                        <CheckCircle2 style={{ width: 16, height: 16 }} />
                                        Erledigt — rückgängig?
                                    </>
                                ) : (
                                    'Als erledigt markieren'
                                )}
                            </button>
                        </div>
                    )}

                    {/* Servieren special button */}
                    {node.type === 'servieren' && (
                        <button
                            type="button"
                            onClick={() => {
                                onToggle();
                                if (!completed) onClose();
                            }}
                            className={css({
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '1.5',
                                py: '3',
                                px: '4',
                                borderRadius: 'xl',
                                fontSize: '14px',
                                fontWeight: 700,
                                cursor: 'pointer',
                            })}
                            style={{
                                border: 'none',
                                backgroundColor: completed ? 'rgba(0,184,148,0.1)' : PALETTE.orange,
                                color: completed ? PALETTE.emerald : 'white',
                            }}
                        >
                            {completed ? (
                                <>
                                    <Check style={{ width: 15, height: 15 }} /> Guten Appetit!
                                </>
                            ) : (
                                'Fertig kochen!'
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
