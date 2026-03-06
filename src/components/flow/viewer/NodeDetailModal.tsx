'use client';

import { CheckCircle2, Clock, Pause, Play, RotateCcw, X } from 'lucide-react';
import { useMemo } from 'react';

import type { FlowNodeSerialized, StepType } from '../editor/editorTypes';
import { getStepConfig } from '../editor/stepConfig';

import type { RecipeStepsViewerProps, TimerState } from './viewerTypes';
import { formatTime, renderDescription } from './viewerUtils';

const MODAL_MENTION_RE = /@\[.*?(?:\|.*?)?\]\((.*?)\)/g;

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
        if (!node.description || !ingredients) return [];
        const ids = new Set<string>();
        for (const m of node.description.matchAll(MODAL_MENTION_RE)) ids.add(m[1]);
        return ingredients.filter((i) => ids.has(i.id));
    }, [node.description, ingredients]);

    const hasTimer = !!timerState;
    const timerRunning = hasTimer && timerState!.running;
    const pct = hasTimer
        ? ((timerState!.total - timerState!.remaining) / timerState!.total) * 100
        : 0;
    const timerDone = hasTimer && timerState!.remaining === 0;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.45)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
                backdropFilter: 'blur(2px)',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    backgroundColor: 'white',
                    borderRadius: 20,
                    maxWidth: 480,
                    width: '100%',
                    maxHeight: '88vh',
                    overflowY: 'auto',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
                    position: 'relative',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close */}
                <button
                    type="button"
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        zIndex: 10,
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        border: 'none',
                        backgroundColor: node.photoUrl ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: node.photoUrl ? 'white' : '#555',
                    }}
                >
                    <X style={{ width: 16, height: 16 }} />
                </button>

                {/* Photo */}
                {node.photoUrl && (
                    <img
                        src={node.photoUrl}
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
                    <div style={{ height: 4, backgroundColor: 'rgba(0,0,0,0.06)' }}>
                        <div
                            style={{
                                height: '100%',
                                width: `${pct}%`,
                                background: timerDone
                                    ? '#00b894'
                                    : 'linear-gradient(90deg, #e07b53, #f39c12)',
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
                                color: '#555',
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
                                    color: timerRunning ? '#e07b53' : '#888',
                                    fontWeight: timerRunning ? 700 : 400,
                                    marginLeft: 'auto',
                                }}
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
                        style={{
                            fontSize: 22,
                            fontWeight: 800,
                            color: '#1a1a1a',
                            marginBottom: 12,
                            lineHeight: 1.2,
                        }}
                    >
                        {node.label}
                    </h3>

                    {/* Description */}
                    {node.description && (
                        <p
                            style={{
                                fontSize: 14,
                                color: '#555',
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
                                style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    textTransform: 'uppercase' as const,
                                    letterSpacing: '0.06em',
                                    color: '#c0623e',
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
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            fontSize: 13,
                                            color: '#333',
                                        }}
                                    >
                                        <span
                                            style={{
                                                width: 6,
                                                height: 6,
                                                borderRadius: '50%',
                                                backgroundColor: '#e07b53',
                                                flexShrink: 0,
                                            }}
                                        />
                                        <span style={{ fontWeight: 600 }}>{ing.name}</span>
                                        {(ing.amount || ing.unit) && (
                                            <span style={{ color: '#888', marginLeft: 'auto' }}>
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
                                    color: timerRunning ? '#e74c3c' : '#e07b53',
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
                                    style={{
                                        padding: '10px',
                                        borderRadius: 12,
                                        border: '1.5px solid rgba(0,0,0,0.1)',
                                        backgroundColor: 'rgba(0,0,0,0.04)',
                                        color: '#999',
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
                                backgroundColor: completed ? 'rgba(0,184,148,0.1)' : '#e07b53',
                                color: completed ? '#00b894' : 'white',
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
