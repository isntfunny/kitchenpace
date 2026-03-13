'use client';

import {
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    Pause,
    Play,
    RotateCcw,
} from 'lucide-react';
import { type Dispatch } from 'react';

import { PALETTE } from '@app/lib/palette';
import { getThumbnailUrl } from '@app/lib/thumbnail-client';

import type { FlowEdgeSerialized, FlowNodeSerialized, StepType } from '../editor/editorTypes';
import { getStepConfig } from '../editor/stepConfig';

import { MobileMiniMap } from './MobileMiniMap';
import { useMobileNavigation } from './useMobileNavigation';
import type { RecipeStepsViewerProps, TimerState, ViewerAction } from './viewerTypes';
import { formatTime, renderDescription } from './viewerUtils';

function BranchHint({
    direction,
    node,
    onClick,
}: {
    direction: 'up' | 'down';
    node: FlowNodeSerialized;
    onClick: () => void;
}) {
    const config = getStepConfig(node.type as StepType);
    const Icon = config.icon;
    const isUp = direction === 'up';

    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                ...(isUp ? { top: 0 } : { bottom: 0 }),
                zIndex: 5,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                padding: isUp ? '6px 16px 10px' : '10px 16px 6px',
                border: 'none',
                background: isUp
                    ? 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 100%)'
                    : 'linear-gradient(0deg, rgba(255,255,255,0.12) 0%, transparent 100%)',
                borderRadius: isUp ? '0 0 16px 16px' : '16px 16px 0 0',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.7)',
                animation: 'branchPulse 2s ease-in-out infinite',
            }}
        >
            {isUp && <ChevronUp style={{ width: 16, height: 16, opacity: 0.6 }} />}
            <span
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                }}
            >
                <Icon style={{ width: 12, height: 12 }} />
                {node.label.length > 20 ? node.label.slice(0, 20) + '\u2026' : node.label}
            </span>
            {!isUp && <ChevronDown style={{ width: 16, height: 16, opacity: 0.6 }} />}
        </button>
    );
}

export function MobileView({
    columnGroups,
    edges,
    dagreY,
    completed,
    timers,
    dispatch,
    ingredients,
}: {
    columnGroups: FlowNodeSerialized[][];
    edges: FlowEdgeSerialized[];
    dagreY: Map<string, number>;
    completed: Set<string>;
    timers: Map<string, TimerState>;
    dispatch: Dispatch<ViewerAction>;
    ingredients?: RecipeStepsViewerProps['ingredients'];
}) {
    const {
        col,
        row,
        currentNode,
        currentGroup,
        canGoLeft,
        canGoRight,
        canBranchUp,
        canBranchDown,
        hasBranching,
        hasLaneAbove,
        hasLaneBelow,
        hasMultipleLanes,
        parallelBranches,
        goLeft,
        goRight,
        goLaneUp,
        goLaneDown,
        handleTouchStart,
        handleTouchEnd,
        setPosition,
    } = useMobileNavigation(columnGroups, edges);

    if (!currentNode) return null;

    const config = getStepConfig(currentNode.type as StepType);
    const Icon = config.icon;
    const isSpecial = currentNode.type === 'start' || currentNode.type === 'servieren';
    const isDone = completed.has(currentNode.id);
    const timerState = timers.get(currentNode.id);
    const hasTimer = !!timerState;
    const timerRunning = hasTimer && timerState!.running;
    const timerDone = hasTimer && timerState!.remaining === 0;
    const pct = hasTimer
        ? ((timerState!.total - timerState!.remaining) / timerState!.total) * 100
        : 0;

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                userSelect: 'none',
                overflow: 'hidden',
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* Minimap */}
            <MobileMiniMap
                columnGroups={columnGroups}
                edges={edges}
                dagreY={dagreY}
                completed={completed}
                currentCol={col}
                currentRow={row}
                onNavigate={(c, r) => setPosition({ col: c, row: r })}
            />

            {/* Main card area — fills remaining space */}
            <div
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '0 24px',
                    minHeight: 0,
                    position: 'relative',
                }}
            >
                {/* Branch hint: lane above (same column or parallel branch) */}
                {canBranchUp && (
                    <BranchHint
                        direction="up"
                        node={hasLaneAbove ? currentGroup[row - 1] : parallelBranches[0]?.node}
                        onClick={goLaneUp}
                    />
                )}

                {/* Branch hint: lane below (same column or parallel branch) */}
                {canBranchDown && (
                    <BranchHint
                        direction="down"
                        node={
                            hasLaneBelow
                                ? currentGroup[row + 1]
                                : parallelBranches[parallelBranches.length - 1]?.node
                        }
                        onClick={goLaneDown}
                    />
                )}

                {/* Lane indicator when branches are available */}
                {hasBranching &&
                    (() => {
                        const totalBranches = hasMultipleLanes
                            ? currentGroup.length
                            : 1 + parallelBranches.length;
                        const currentBranch = hasMultipleLanes ? row + 1 : 1;
                        return (
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
                                        fontSize: 10,
                                        fontWeight: 700,
                                        textTransform: 'uppercase' as const,
                                        letterSpacing: '0.08em',
                                        color: 'rgba(255,255,255,0.4)',
                                    }}
                                >
                                    Branch {currentBranch}/{totalBranches}
                                </span>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    {Array.from({ length: totalBranches }, (_, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                width: idx === currentBranch - 1 ? 16 : 6,
                                                height: 6,
                                                borderRadius: 3,
                                                backgroundColor:
                                                    idx === currentBranch - 1
                                                        ? PALETTE.orange
                                                        : 'rgba(255,255,255,0.2)',
                                                transition: 'all 0.2s ease',
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })()}

                {/* Step type badge */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 16,
                    }}
                >
                    <span
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            backgroundColor: 'rgba(255,255,255,0.15)',
                            borderRadius: 999,
                            padding: '5px 14px',
                            fontSize: 12,
                            fontWeight: 700,
                            color: 'rgba(255,255,255,0.8)',
                        }}
                    >
                        <Icon style={{ width: 14, height: 14 }} />
                        {config.label}
                    </span>
                    {isDone && (
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                backgroundColor: PALETTE.emerald,
                            }}
                        >
                            <Check style={{ width: 14, height: 14, color: 'white' }} />
                        </span>
                    )}
                </div>

                {/* Title — large, centered */}
                <h2
                    style={{
                        fontSize: 'clamp(28px, 7vw, 44px)',
                        fontWeight: 800,
                        color: 'white',
                        textAlign: 'center',
                        lineHeight: 1.15,
                        marginBottom: 16,
                        maxWidth: '100%',
                        wordBreak: 'break-word',
                    }}
                >
                    {currentNode.label}
                </h2>

                {/* Description — medium, centered */}
                {currentNode.description && (
                    <p
                        style={{
                            fontSize: 'clamp(15px, 3.5vw, 20px)',
                            color: 'rgba(255,255,255,0.75)',
                            textAlign: 'center',
                            lineHeight: 1.6,
                            maxWidth: 460,
                            marginBottom: 20,
                        }}
                    >
                        {renderDescription(currentNode.description, ingredients)}
                    </p>
                )}

                {/* Step photo */}
                {currentNode.photoKey && (
                    <div
                        style={{
                            borderRadius: 12,
                            overflow: 'hidden',
                            marginBottom: 20,
                            width: '100%',
                            maxWidth: 360,
                        }}
                    >
                        <img
                            src={getThumbnailUrl(currentNode.photoKey, '3:2', 640)}
                            alt=""
                            style={{
                                width: '100%',
                                height: 160,
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

                {/* Timer display */}
                {hasTimer && (
                    <div style={{ marginBottom: 20, textAlign: 'center' }}>
                        <div
                            style={{
                                fontSize: 'clamp(36px, 10vw, 56px)',
                                fontWeight: 800,
                                fontVariantNumeric: 'tabular-nums',
                                color: timerDone
                                    ? PALETTE.emerald
                                    : timerRunning
                                      ? '#f39c12'
                                      : 'rgba(255,255,255,0.6)',
                                letterSpacing: '0.02em',
                                lineHeight: 1,
                                marginBottom: 12,
                            }}
                        >
                            {formatTime(timerState!.remaining)}
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
                                            dispatch({
                                                type: 'timerPause',
                                                nodeId: currentNode.id,
                                            });
                                        } else {
                                            dispatch({
                                                type: 'timerStart',
                                                nodeId: currentNode.id,
                                            });
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
                                                dispatch({
                                                    type: 'timerReset',
                                                    nodeId: currentNode.id,
                                                });
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
                )}

                {/* Done button */}
                {!isSpecial && (
                    <button
                        type="button"
                        onClick={() => dispatch({ type: 'toggle', nodeId: currentNode.id })}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            padding: '14px 32px',
                            borderRadius: 999,
                            border: isDone ? '2px solid rgba(0,184,148,0.5)' : 'none',
                            backgroundColor: isDone ? 'rgba(0,184,148,0.15)' : PALETTE.orange,
                            color: isDone ? PALETTE.emerald : 'white',
                            fontSize: 16,
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            minWidth: 180,
                        }}
                    >
                        {isDone ? (
                            <>
                                <CheckCircle2 style={{ width: 18, height: 18 }} /> Erledigt
                            </>
                        ) : timerDone ? (
                            <>
                                <Check style={{ width: 18, height: 18 }} /> Timer fertig — Erledigt?
                            </>
                        ) : (
                            'Erledigt'
                        )}
                    </button>
                )}
            </div>

            {/* Bottom navigation — horizontal steps only */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 24px 20px',
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
                        padding: '13px 20px',
                        minHeight: 48,
                        borderRadius: 14,
                        border: 'none',
                        backgroundColor: canGoLeft ? 'rgba(255,255,255,0.12)' : 'transparent',
                        color: canGoLeft ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: canGoLeft ? 'pointer' : 'default',
                    }}
                >
                    <ChevronLeft style={{ width: 18, height: 18 }} />
                    Zurück
                </button>

                {/* Step counter */}
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
                        Schritt {col + 1} / {columnGroups.length}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={goRight}
                    disabled={!canGoRight}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '13px 20px',
                        minHeight: 48,
                        borderRadius: 14,
                        border: 'none',
                        backgroundColor: canGoRight ? 'rgba(255,255,255,0.12)' : 'transparent',
                        color: canGoRight ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: canGoRight ? 'pointer' : 'default',
                    }}
                >
                    Weiter
                    <ChevronRight style={{ width: 18, height: 18 }} />
                </button>
            </div>
        </div>
    );
}
