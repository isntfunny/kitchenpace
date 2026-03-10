import { Check, Clock, Pause, Play, RotateCcw } from 'lucide-react';
import type { Dispatch } from 'react';

import { useDarkColors } from '@app/lib/darkMode';
import { PALETTE } from '@app/lib/palette';
import { getThumbnailUrl } from '@app/lib/thumbnail-client';
import { css } from 'styled-system/css';

import type { FlowNodeSerialized, StepType } from '../editor/editorTypes';
import { getStepConfig } from '../editor/stepConfig';

import type { RecipeStepsViewerProps, TimerState, ViewerAction } from './viewerTypes';
import { formatTime, renderDescription } from './viewerUtils';

export function SimpleTextView({
    columnGroups,
    completed,
    timers,
    dispatch,
    ingredients,
}: {
    columnGroups: FlowNodeSerialized[][];
    completed: Set<string>;
    timers: Map<string, TimerState>;
    dispatch: Dispatch<ViewerAction>;
    ingredients?: RecipeStepsViewerProps['ingredients'];
}) {
    const c = useDarkColors();
    const steps = columnGroups.flat().filter((n) => n.type !== 'start');

    return (
        <div
            className={css({
                py: '6',
                px: '5',
                maxWidth: '640px',
                mx: 'auto',
            })}
        >
            <ol
                className={css({
                    listStyle: 'none',
                    p: 0,
                    m: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4',
                })}
            >
                {steps.map((node, idx) => {
                    const config = getStepConfig(node.type as StepType);
                    const Icon = config.icon;
                    const isLast = node.type === 'servieren';
                    const isDone = completed.has(node.id);
                    const timer = timers.get(node.id);
                    const hasTimer = !!timer;
                    const timerRunning = hasTimer && timer!.running;
                    const timerDone = hasTimer && timer!.remaining === 0;

                    return (
                        <li key={node.id}>
                            <div
                                className={css({
                                    display: 'flex',
                                    gap: '3',
                                    alignItems: 'flex-start',
                                    p: '3',
                                    borderRadius: 'lg',
                                    transition: 'all 0.2s ease',
                                })}
                                style={{
                                    backgroundColor: isDone ? c.successBgLight : 'transparent',
                                    opacity: isDone ? 0.7 : 1,
                                }}
                            >
                                {/* Clickable step icon — toggles done */}
                                <button
                                    type="button"
                                    onClick={() => dispatch({ type: 'toggle', nodeId: node.id })}
                                    className={css({
                                        flexShrink: 0,
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: 'full',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: 'none',
                                        cursor: 'pointer',
                                        mt: '0.5',
                                        transition: 'all 0.2s ease',
                                    })}
                                    style={{
                                        backgroundColor: isDone
                                            ? 'rgba(0,184,148,0.2)'
                                            : isLast
                                              ? 'rgba(0,184,148,0.12)'
                                              : 'rgba(224,123,83,0.1)',
                                        color: isDone
                                            ? PALETTE.emerald
                                            : isLast
                                              ? PALETTE.emerald
                                              : PALETTE.orange,
                                    }}
                                >
                                    {isDone ? (
                                        <Check style={{ width: 16, height: 16 }} />
                                    ) : (
                                        <Icon style={{ width: 16, height: 16 }} />
                                    )}
                                </button>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    {/* Title + duration */}
                                    <div
                                        className={css({
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '2',
                                            mb: '1',
                                            flexWrap: 'wrap',
                                        })}
                                    >
                                        <span
                                            className={css({
                                                fontWeight: 'bold',
                                                fontSize: 'md',
                                                color: 'text',
                                            })}
                                            style={{
                                                textDecoration: isDone ? 'line-through' : 'none',
                                                textDecorationColor: 'rgba(0,184,148,0.4)',
                                            }}
                                        >
                                            {idx + 1}. {node.label}
                                        </span>
                                        {node.duration && node.duration > 0 && !hasTimer && (
                                            <span
                                                className={css({
                                                    fontSize: 'xs',
                                                    color: 'text.muted',
                                                    flexShrink: 0,
                                                })}
                                            >
                                                ~{node.duration} Min.
                                            </span>
                                        )}
                                    </div>

                                    {/* Description */}
                                    {node.description && (
                                        <p
                                            className={css({
                                                fontSize: 'sm',
                                                color: 'text.muted',
                                                lineHeight: '1.6',
                                                m: 0,
                                            })}
                                        >
                                            {renderDescription(
                                                node.description,
                                                ingredients,
                                                c.dark,
                                            )}
                                        </p>
                                    )}

                                    {/* Step photo */}
                                    {node.photoKey && (
                                        <div
                                            style={{
                                                marginTop: 10,
                                                borderRadius: 8,
                                                overflow: 'hidden',
                                            }}
                                        >
                                            <img
                                                src={getThumbnailUrl(node.photoKey, '3:1', 640)}
                                                alt=""
                                                style={{
                                                    width: '100%',
                                                    height: 120,
                                                    objectFit: 'cover',
                                                    display: 'block',
                                                }}
                                                onError={(e) => {
                                                    const wrapper = (e.target as HTMLImageElement)
                                                        .parentElement;
                                                    if (wrapper) wrapper.style.display = 'none';
                                                }}
                                            />
                                        </div>
                                    )}

                                    {/* Timer controls */}
                                    {hasTimer && !isDone && (
                                        <div
                                            className={css({
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '2',
                                                mt: '2',
                                            })}
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    dispatch({
                                                        type: timerRunning
                                                            ? 'timerPause'
                                                            : 'timerStart',
                                                        nodeId: node.id,
                                                    })
                                                }
                                                className={css({
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '1.5',
                                                    py: '1',
                                                    px: '2.5',
                                                    borderRadius: 'full',
                                                    border: '1px solid',
                                                    fontSize: 'xs',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                })}
                                                style={{
                                                    borderColor: timerRunning
                                                        ? 'rgba(243,156,18,0.3)'
                                                        : timerDone
                                                          ? 'rgba(0,184,148,0.3)'
                                                          : 'rgba(224,123,83,0.25)',
                                                    backgroundColor: timerRunning
                                                        ? 'rgba(243,156,18,0.08)'
                                                        : timerDone
                                                          ? 'rgba(0,184,148,0.08)'
                                                          : 'rgba(224,123,83,0.06)',
                                                    color: timerRunning
                                                        ? '#f39c12'
                                                        : timerDone
                                                          ? PALETTE.emerald
                                                          : PALETTE.orange,
                                                }}
                                            >
                                                {timerRunning ? (
                                                    <Pause style={{ width: 12, height: 12 }} />
                                                ) : timerDone ? (
                                                    <Check style={{ width: 12, height: 12 }} />
                                                ) : (
                                                    <Play style={{ width: 12, height: 12 }} />
                                                )}
                                                <Clock
                                                    style={{ width: 11, height: 11, opacity: 0.7 }}
                                                />
                                                {formatTime(timer!.remaining)}
                                            </button>
                                            {(timerRunning || timer!.remaining < timer!.total) &&
                                                !timerDone && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            dispatch({
                                                                type: 'timerReset',
                                                                nodeId: node.id,
                                                            })
                                                        }
                                                        className={css({
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            p: '1',
                                                            borderRadius: 'full',
                                                            border: 'none',
                                                            bg: 'transparent',
                                                            color: 'text.muted',
                                                            cursor: 'pointer',
                                                        })}
                                                        title="Zurücksetzen"
                                                    >
                                                        <RotateCcw
                                                            style={{ width: 12, height: 12 }}
                                                        />
                                                    </button>
                                                )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}
