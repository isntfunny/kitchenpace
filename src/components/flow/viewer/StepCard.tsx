import { Check, CheckCircle2, Clock, Pause, Play, RotateCcw } from 'lucide-react';
import type { CSSProperties } from 'react';

import { useDarkColors } from '@app/lib/darkMode';
import { PALETTE } from '@app/lib/palette';
import { getThumbnailUrl } from '@app/lib/thumbnail-client';

import type { FlowNodeSerialized, StepType } from '../editor/editorTypes';
import { getStepConfig } from '../editor/stepConfig';

import type { RecipeStepsViewerProps, TimerState } from './viewerTypes';
import { extractIngredientChips, formatTime, renderDescription } from './viewerUtils';

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
    const c = useDarkColors();
    const config = getStepConfig(node.type as StepType);
    const Icon = config.icon;
    const hasTimer = !!timerState;
    const chips = extractIngredientChips(node.description, ingredients);
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
                        ? c.dark
                            ? '0 4px 20px rgba(224,123,83,0.25)'
                            : '0 4px 20px rgba(224,123,83,0.18)'
                        : c.shadowSm,
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
                <div style={{ height: 3, backgroundColor: c.progressTrack }}>
                    <div
                        style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: timerDone
                                ? PALETTE.emerald
                                : `linear-gradient(90deg, ${PALETTE.orange}, #f39c12)`,
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
                            backgroundColor: c.badgeBg,
                            borderRadius: 999,
                            padding: '2px 8px',
                            fontSize: 10,
                            fontWeight: 700,
                            color: c.badgeText,
                        }}
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
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                fontSize: 10,
                                color: timerRunning ? PALETTE.orange : c.textSubtle,
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
                    style={{
                        fontSize: compact ? 13 : 14,
                        fontWeight: 700,
                        color: c.textDark,
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
                                color: c.textBody,
                                lineHeight: 1.5,
                                marginBottom: 8,
                                overflow: 'hidden',
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                            } as CSSProperties
                        }
                    >
                        {renderDescription(node.description, ingredients, c.dark)}
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

                {/* Ingredient chips */}
                {chips.length > 0 && !compact && (
                    <div
                        style={{
                            borderTop: `1px solid ${c.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                            paddingTop: 6,
                            marginBottom: 6,
                        }}
                    >
                        <div
                            style={{
                                fontSize: 9,
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                color: c.textMuted,
                                marginBottom: 3,
                            }}
                        >
                            Zutaten
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {chips.map((chip) => (
                                <span
                                    key={chip.id}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        padding: '1px 6px',
                                        backgroundColor: c.dark
                                            ? 'rgba(224,123,83,0.17)'
                                            : 'rgba(224,123,83,0.12)',
                                        borderRadius: 99,
                                        fontSize: 9,
                                        fontWeight: 600,
                                        color: PALETTE.orange,
                                    }}
                                >
                                    {chip.label}
                                </span>
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
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: 26,
                                            height: 26,
                                            borderRadius: '50%',
                                            backgroundColor: c.mutedBgLight,
                                            border: `1.5px solid ${c.borderInput}`,
                                            cursor: 'pointer',
                                            color: c.textSubtle,
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
                                      ? `1.5px solid ${PALETTE.emerald}`
                                      : `1.5px solid ${c.borderMedium}`,
                                backgroundColor: completed
                                    ? 'rgba(0,184,148,0.1)'
                                    : timerDone
                                      ? PALETTE.emerald
                                      : c.badgeBg,
                                color: completed
                                    ? PALETTE.emerald
                                    : timerDone
                                      ? 'white'
                                      : c.textSubtle,
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
