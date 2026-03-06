import { Check, CheckCircle2, Clock, Pause, Play, RotateCcw } from 'lucide-react';
import type { CSSProperties } from 'react';

import type { FlowNodeSerialized, StepType } from '../editor/editorTypes';
import { getStepConfig } from '../editor/stepConfig';

import type { RecipeStepsViewerProps, TimerState } from './viewerTypes';
import { formatTime, renderDescription } from './viewerUtils';

export function StepCard({
    node,
    completed,
    active,
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
            style={{
                width: fullWidth ? '100%' : compact ? 200 : 220,
                borderRadius: 16,
                overflow: 'hidden',
                border: 'none',
                boxShadow:
                    active && !completed
                        ? '0 4px 20px rgba(224,123,83,0.18)'
                        : '0 2px 8px rgba(0,0,0,0.07)',
                transition: 'all 0.2s ease',
                backgroundImage: config.gradient,
                backgroundColor: config.color,
                flexShrink: 0,
                cursor: 'pointer',
                position: 'relative',
            }}
        >
            {/* Timer progress bar at top */}
            {hasTimer && (
                <div style={{ height: 3, backgroundColor: 'rgba(0,0,0,0.06)' }}>
                    <div
                        style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: timerDone
                                ? '#00b894'
                                : 'linear-gradient(90deg, #e07b53, #f39c12)',
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
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            backgroundColor: 'rgba(255,255,255,0.65)',
                            borderRadius: 999,
                            padding: '2px 8px',
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#555',
                        }}
                    >
                        <Icon style={{ width: 11, height: 11 }} />
                        {config.label}
                    </span>
                    {hasTimer && (
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                fontSize: 10,
                                color: timerRunning ? '#e07b53' : '#888',
                                marginLeft: 'auto',
                                fontWeight: timerRunning ? 700 : 400,
                                transition: 'color 0.2s ease',
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
                                backgroundColor: '#00b894',
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
                    style={{
                        fontSize: compact ? 13 : 14,
                        fontWeight: 700,
                        color: '#1a1a1a',
                        marginBottom: 4,
                        lineHeight: 1.3,
                    }}
                >
                    {node.label}
                </div>

                {/* Description */}
                {node.description && !compact && (
                    <div
                        style={
                            {
                                fontSize: 12,
                                color: '#666',
                                lineHeight: 1.5,
                                marginBottom: 8,
                                overflow: 'hidden',
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                            } as CSSProperties
                        }
                    >
                        {renderDescription(node.description, ingredients)}
                    </div>
                )}

                {/* Photo */}
                {node.photoUrl && !compact && (
                    <div
                        style={{
                            borderRadius: 8,
                            overflow: 'hidden',
                            marginBottom: 8,
                            marginTop: 4,
                        }}
                    >
                        <img
                            src={node.photoUrl}
                            alt=""
                            style={{
                                width: '100%',
                                height: 72,
                                objectFit: 'cover',
                                display: 'block',
                            }}
                        />
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
                                        if (timerRunning) { onTimerPause(); } else { onTimerStart(); }
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
                                        color: timerRunning ? '#e74c3c' : '#e07b53',
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
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: 26,
                                            height: 26,
                                            borderRadius: '50%',
                                            backgroundColor: 'rgba(0,0,0,0.05)',
                                            border: '1.5px solid rgba(0,0,0,0.1)',
                                            cursor: 'pointer',
                                            color: '#999',
                                        }}
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
                            style={{
                                marginLeft: 'auto',
                                flexShrink: 0,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '4px 10px',
                                borderRadius: 999,
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                                border: completed
                                    ? '1.5px solid rgba(0,184,148,0.3)'
                                    : timerDone
                                      ? '1.5px solid #00b894'
                                      : '1.5px solid rgba(0,0,0,0.12)',
                                backgroundColor: completed
                                    ? 'rgba(0,184,148,0.1)'
                                    : timerDone
                                      ? '#00b894'
                                      : 'rgba(255,255,255,0.7)',
                                color: completed ? '#00b894' : timerDone ? 'white' : '#888',
                                transition: 'all 0.2s ease',
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
                            backgroundColor: completed ? 'rgba(0,184,148,0.12)' : '#e07b53',
                            color: completed ? '#00b894' : 'white',
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
