import { Check, CheckCircle2, Clock, Pause, Play, RotateCcw } from 'lucide-react';
import { type CSSProperties, useMemo } from 'react';

import { PALETTE } from '@app/lib/palette';
import { getThumbnailUrl } from '@app/lib/thumbnail-client';

import { css, cx } from 'styled-system/css';

import type { FlowNodeSerialized, StepType } from '../editor/editorTypes';
import { getStepConfig } from '../editor/stepConfig';

import type { RecipeStepsViewerProps, TimerState } from './viewerTypes';
import { extractMentionedIds, formatTime, renderDescription } from './viewerUtils';

const cardBase = css({
    borderRadius: '16px',
    overflow: 'hidden',
    border: 'none',
    transition: 'all 0.2s ease',
    flexShrink: 0,
    cursor: 'pointer',
    position: 'relative',
    boxShadow: 'shadow.small',
});

const cardActive = css({
    boxShadow: '0 4px 20px rgba(224,123,83,0.18)',
    _dark: { boxShadow: '0 4px 20px rgba(224,123,83,0.25)' },
});

const toggleDefault = css({
    border: '1.5px solid',
    borderColor: 'border.medium',
    bg: 'badge.bg',
    color: 'text.subtle',
});

export function StepCard({
    node,
    completed,
    active,
    isParallel = false,
    timerState,
    onToggle,
    onTimerStart,
    onTimerPause,
    onTimerReset,
    onOpenDetail,
    ingredients,
    compact = false,
    fullWidth = false,
}: {
    node: FlowNodeSerialized;
    completed: boolean;
    active: boolean;
    isParallel?: boolean;
    timerState?: TimerState;
    onToggle: () => void;
    onTimerStart: () => void;
    onTimerPause: () => void;
    onTimerReset: () => void;
    onOpenDetail: () => void;
    ingredients?: RecipeStepsViewerProps['ingredients'];
    compact?: boolean;
    fullWidth?: boolean;
}) {
    const config = getStepConfig(node.type as StepType);
    const Icon = config.icon;
    const hasTimer = !!timerState;
    const stepIngredients = useMemo(() => {
        if (!ingredients) return [];
        const ids = extractMentionedIds(node.description);
        return ids.size > 0 ? ingredients.filter((i) => ids.has(i.id)) : [];
    }, [node.description, ingredients]);
    const timerDone = hasTimer && timerState!.remaining === 0;
    const timerRunning = hasTimer && timerState!.running;
    const pct = hasTimer
        ? ((timerState!.total - timerState!.remaining) / timerState!.total) * 100
        : 0;

    const isSpecial = node.type === 'start' || node.type === 'servieren';

    return (
        <div
            data-node-id={node.id}
            onClick={onOpenDetail}
            className={cx(cardBase, active && !completed ? cardActive : undefined)}
            style={{
                width: fullWidth ? '100%' : compact ? 200 : 220,
                backgroundImage: config.gradient,
                backgroundColor: config.color,
            }}
        >
            {/* Timer progress bar at top */}
            {hasTimer && (
                <div className={css({ height: '3px', bg: 'bg.progress' })}>
                    <div
                        style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: timerDone
                                ? PALETTE.emerald
                                : `linear-gradient(90deg, ${PALETTE.orange}, ${PALETTE.amber})`,
                            transition: 'width 1s linear',
                            borderRadius: '0 2px 2px 0',
                            boxShadow:
                                timerRunning && pct > 0 ? '0 0 8px rgba(224,123,83,0.6)' : 'none',
                        }}
                    />
                </div>
            )}

            <div style={{ padding: compact ? '8px 10px 10px' : '10px 12px 12px' }}>
                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 6,
                    }}
                >
                    <span
                        className={css({
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            bg: 'badge.bg',
                            borderRadius: '999px',
                            padding: '2px 8px',
                            fontSize: '10px',
                            fontWeight: 700,
                            color: 'badge.text',
                        })}
                    >
                        <Icon style={{ width: 11, height: 11 }} />
                        {config.label}
                    </span>
                    {isParallel && !isSpecial && (
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                backgroundColor: 'rgba(99,179,237,0.2)',
                                borderRadius: 999,
                                padding: '2px 7px',
                                fontSize: 10,
                                fontWeight: 700,
                                color: '#3182ce',
                                border: '1px solid rgba(99,179,237,0.35)',
                            }}
                        >
                            ⚡ Parallel
                        </span>
                    )}
                    {hasTimer && (
                        <span
                            className={css({
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '10px',
                                marginLeft: 'auto',
                                transition: 'color 0.2s ease',
                                color: 'text.subtle',
                            })}
                            style={{
                                ...(timerRunning
                                    ? { color: PALETTE.orange, fontWeight: 700 }
                                    : { fontWeight: 400 }),
                            }}
                        >
                            <Clock style={{ width: 10, height: 10 }} />
                            {timerRunning || pct > 0
                                ? formatTime(timerState!.remaining)
                                : `${node.duration} Min.`}
                        </span>
                    )}
                    {completed && (
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 18,
                                height: 18,
                                borderRadius: '50%',
                                backgroundColor: PALETTE.emerald,
                                marginLeft: hasTimer ? 0 : 'auto',
                                flexShrink: 0,
                            }}
                        >
                            <Check style={{ width: 10, height: 10, color: 'white' }} />
                        </span>
                    )}
                </div>

                {/* Title */}
                <div
                    className={css({
                        fontWeight: 700,
                        color: 'text.heading',
                        marginBottom: '4px',
                        lineHeight: 1.3,
                    })}
                    style={{ fontSize: compact ? 13 : 14 }}
                >
                    {node.label}
                </div>

                {/* Description */}
                {node.description && !compact && (
                    <div
                        className={css({
                            fontSize: '12px',
                            color: 'text.body',
                            lineHeight: 1.5,
                            marginBottom: '8px',
                            overflow: 'hidden',
                            display: '-webkit-box',
                        })}
                        style={
                            {
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                            } as CSSProperties
                        }
                    >
                        {renderDescription(node.description, ingredients)}
                    </div>
                )}

                {/* Photo */}
                {node.photoKey && !compact && (
                    <div
                        style={{
                            borderRadius: 8,
                            overflow: 'hidden',
                            marginBottom: 8,
                            marginTop: 4,
                        }}
                    >
                        <img
                            src={getThumbnailUrl(node.photoKey, '3:1', 320)}
                            alt=""
                            style={{
                                width: '100%',
                                height: 72,
                                objectFit: 'cover',
                                display: 'block',
                            }}
                            onError={(e) => {
                                const wrapper = (e.target as HTMLImageElement).parentElement;
                                if (wrapper) wrapper.style.display = 'none';
                            }}
                        />
                    </div>
                )}

                {/* Ingredient list */}
                {stepIngredients.length > 0 && !compact && (
                    <div
                        className={css({
                            borderTop: '1px solid',
                            borderColor: {
                                base: 'rgba(0,0,0,0.06)',
                                _dark: 'rgba(255,255,255,0.08)',
                            },
                            paddingTop: '6px',
                            marginBottom: '6px',
                        })}
                    >
                        <div
                            className={css({
                                fontSize: '9px',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                color: 'text.muted',
                                marginBottom: '4px',
                            })}
                        >
                            Zutaten
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {stepIngredients.map((ing) => (
                                <div
                                    key={ing.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        fontSize: 10,
                                    }}
                                >
                                    <span
                                        style={{
                                            width: 4,
                                            height: 4,
                                            borderRadius: '50%',
                                            backgroundColor: PALETTE.orange,
                                            flexShrink: 0,
                                            opacity: 0.6,
                                        }}
                                    />
                                    <span
                                        className={css({
                                            fontWeight: 600,
                                            color: 'text',
                                            flex: 1,
                                            minWidth: 0,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        })}
                                    >
                                        {ing.name}
                                    </span>
                                    {(ing.amount || ing.unit) && (
                                        <span
                                            className={css({
                                                color: 'text.subtle',
                                                flexShrink: 0,
                                                fontWeight: 500,
                                                fontSize: '9px',
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

                {/* Actions */}
                {!isSpecial && (
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            marginTop: 8,
                        }}
                    >
                        {/* Timer controls */}
                        {hasTimer && !completed && (
                            <div
                                style={{ display: 'flex', gap: 4 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (timerRunning) {
                                            onTimerPause();
                                        } else {
                                            onTimerStart();
                                        }
                                    }}
                                    title={timerRunning ? 'Pause' : 'Timer starten'}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 26,
                                        height: 26,
                                        borderRadius: '50%',
                                        backgroundColor: timerRunning
                                            ? 'rgba(231,76,60,0.1)'
                                            : 'rgba(224,123,83,0.1)',
                                        border: `1.5px solid ${timerRunning ? 'rgba(231,76,60,0.3)' : 'rgba(224,123,83,0.3)'}`,
                                        cursor: 'pointer',
                                        color: timerRunning ? '#e74c3c' : PALETTE.orange,
                                    }}
                                >
                                    {timerRunning ? (
                                        <Pause style={{ width: 10, height: 10 }} />
                                    ) : (
                                        <Play style={{ width: 10, height: 10 }} />
                                    )}
                                </button>
                                {pct > 0 && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onTimerReset();
                                        }}
                                        title="Zurücksetzen"
                                        className={css({
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '26px',
                                            height: '26px',
                                            borderRadius: '50%',
                                            bg: 'surface.mutedLight',
                                            border: '1.5px solid',
                                            borderColor: 'border.input',
                                            cursor: 'pointer',
                                            color: 'text.subtle',
                                        })}
                                    >
                                        <RotateCcw style={{ width: 10, height: 10 }} />
                                    </button>
                                )}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggle();
                            }}
                            className={cx(
                                css({
                                    marginLeft: 'auto',
                                    flexShrink: 0,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 10px',
                                    borderRadius: '999px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }),
                                !completed && !timerDone ? toggleDefault : undefined,
                            )}
                            style={{
                                ...(completed
                                    ? {
                                          border: '1.5px solid rgba(0,184,148,0.3)',
                                          backgroundColor: 'rgba(0,184,148,0.1)',
                                          color: PALETTE.emerald,
                                      }
                                    : timerDone
                                      ? {
                                            border: `1.5px solid ${PALETTE.emerald}`,
                                            backgroundColor: PALETTE.emerald,
                                            color: 'white',
                                        }
                                      : {}),
                            }}
                        >
                            {completed ? (
                                <>
                                    <CheckCircle2 style={{ width: 11, height: 11 }} />
                                    Fertig
                                </>
                            ) : (
                                'Erledigt'
                            )}
                        </button>
                    </div>
                )}

                {/* Servieren button */}
                {node.type === 'servieren' && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggle();
                        }}
                        style={{
                            width: '100%',
                            marginTop: 8,
                            padding: '6px 12px',
                            borderRadius: 999,
                            border: 'none',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            backgroundColor: completed ? 'rgba(0,184,148,0.12)' : PALETTE.orange,
                            color: completed ? PALETTE.emerald : 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                        }}
                    >
                        {completed ? (
                            <>
                                <Check style={{ width: 13, height: 13 }} /> Guten Appetit!
                            </>
                        ) : (
                            'Fertig kochen!'
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
