'use client';

import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react';
import { Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { PALETTE } from '@app/lib/palette';
import { css } from 'styled-system/css';

import type { RecipeTutorialStep } from '../types';

import { OnboardingArrow } from './OnboardingArrow';

interface TutorialOverlayProps {
    step: RecipeTutorialStep;
    canContinue: boolean;
    onContinue: () => void;
}

const TARGET_SPOTLIGHT_PADDING = 14;

function getTargetElement(step: RecipeTutorialStep): HTMLElement | null {
    if (!step.targetId) return null;
    return document.querySelector<HTMLElement>(`[data-tutorial="${step.targetId}"]`);
}

export function TutorialOverlay({ step, canContinue, onContinue }: TutorialOverlayProps) {
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
    const [floatingElement, setFloatingElement] = useState<HTMLDivElement | null>(null);
    const isWelcomeStep = step.id === 'welcome' || !step.targetId;
    const blockTargetInteraction = step.allowTargetInteraction === false;
    const allowTargetInteraction = step.allowTargetInteraction === true;

    const floating = useFloating({
        strategy: 'fixed',
        placement: 'right-start',
        middleware: [
            offset(16),
            flip({ fallbackPlacements: ['left-start', 'bottom-start', 'top-start'] }),
            shift({ padding: 16 }),
        ],
    });

    const updateTarget = useCallback(() => {
        setViewportSize({ width: window.innerWidth, height: window.innerHeight });

        const target = getTargetElement(step);
        if (!target) {
            setTargetRect(null);
            floating.refs.setReference(null);
            return;
        }

        floating.refs.setReference(target);
        setTargetRect(target.getBoundingClientRect());
        void floating.update();
    }, [floating, step]);

    // Auto-scroll target into view when the step changes
    useEffect(() => {
        const target = getTargetElement(step);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }
    }, [step.id]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const target = getTargetElement(step);
        floating.refs.setReference(target);

        const frame = window.requestAnimationFrame(updateTarget);
        const cleanup =
            target && floatingElement
                ? autoUpdate(
                      target,
                      floatingElement,
                      () => {
                          updateTarget();
                          void floating.update();
                      },
                      {
                          ancestorScroll: true,
                          ancestorResize: true,
                          elementResize: true,
                          layoutShift: true,
                          animationFrame: true,
                      },
                  )
                : undefined;

        window.addEventListener('resize', updateTarget);
        window.addEventListener('scroll', updateTarget, true);

        return () => {
            window.cancelAnimationFrame(frame);
            cleanup?.();
            window.removeEventListener('resize', updateTarget);
            window.removeEventListener('scroll', updateTarget, true);
        };
    }, [floating, floatingElement, step, updateTarget]);

    const helperText = useMemo(() => {
        if (step.kind === 'title-match' && step.expectedValue) {
            return `Erwartete Eingabe: ${step.expectedValue}`;
        }
        return step.accentLabel ?? null;
    }, [step]);

    if (isWelcomeStep) {
        return (
            <>
                <div className={backdropClass} />
                <div className={welcomeWrapperClass}>
                    <div
                        className={welcomeCardClass}
                        role="dialog"
                        aria-modal="true"
                        aria-label={step.title}
                    >
                        <div
                            className={css({
                                width: '54px',
                                height: '54px',
                                borderRadius: 'full',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 3',
                                boxShadow: '0 8px 22px rgba(224, 123, 83, 0.34)',
                            })}
                            style={{
                                background: `linear-gradient(135deg, ${PALETTE.orange}, ${PALETTE.gold})`,
                            }}
                        >
                            <Sparkles
                                className={css({ width: '24px', height: '24px', color: 'white' })}
                            />
                        </div>
                        <TutorialCardContent
                            step={step}
                            helperText={helperText}
                            canContinue={canContinue}
                            onContinue={onContinue}
                            centered
                        />
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <div
                className={overlayRootClass}
                style={{ pointerEvents: allowTargetInteraction ? 'none' : 'auto' }}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div
                    className={overlaySliceClass}
                    style={{
                        top: 0,
                        left: 0,
                        right: 0,
                        height: targetRect
                            ? `${Math.max(0, targetRect.top - TARGET_SPOTLIGHT_PADDING)}px`
                            : '100%',
                    }}
                />
                {targetRect ? (
                    <>
                        <div
                            className={overlaySliceClass}
                            style={{
                                top: `${Math.max(0, targetRect.top - TARGET_SPOTLIGHT_PADDING)}px`,
                                left: 0,
                                width: `${Math.max(0, targetRect.left - TARGET_SPOTLIGHT_PADDING)}px`,
                                height: `${targetRect.height + TARGET_SPOTLIGHT_PADDING * 2}px`,
                            }}
                        />
                        <div
                            className={overlaySliceClass}
                            style={{
                                top: `${Math.max(0, targetRect.top - TARGET_SPOTLIGHT_PADDING)}px`,
                                right: 0,
                                width: `calc(100% - ${Math.min(viewportSize.width, targetRect.right + TARGET_SPOTLIGHT_PADDING)}px)`,
                                height: `${targetRect.height + TARGET_SPOTLIGHT_PADDING * 2}px`,
                            }}
                        />
                        <div
                            className={overlaySliceClass}
                            style={{
                                bottom: 0,
                                left: 0,
                                right: 0,
                                height: `calc(100% - ${Math.min(viewportSize.height, targetRect.bottom + TARGET_SPOTLIGHT_PADDING)}px)`,
                            }}
                        />
                    </>
                ) : null}
            </div>

            {targetRect ? (
                <>
                    <div
                        className={highlightClass}
                        style={{
                            left: `${Math.max(0, targetRect.left - TARGET_SPOTLIGHT_PADDING)}px`,
                            top: `${Math.max(0, targetRect.top - TARGET_SPOTLIGHT_PADDING)}px`,
                            width: `${targetRect.width + TARGET_SPOTLIGHT_PADDING * 2}px`,
                            height: `${targetRect.height + TARGET_SPOTLIGHT_PADDING * 2}px`,
                        }}
                    />
                    {blockTargetInteraction ? (
                        <div
                            className={targetBlockerClass}
                            style={{
                                left: `${targetRect.left}px`,
                                top: `${targetRect.top}px`,
                                width: `${targetRect.width}px`,
                                height: `${targetRect.height}px`,
                            }}
                        />
                    ) : null}
                </>
            ) : null}

            <div
                ref={(node) => {
                    setFloatingElement(node);
                    floating.refs.setFloating(node);
                }}
                className={floatingPanelClass}
                style={floating.floatingStyles}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div
                    className={floatingCardClass}
                    role="dialog"
                    aria-modal="true"
                    aria-label={step.title}
                >
                    {targetRect ? <OnboardingArrow placement={floating.placement} /> : null}
                    <TutorialCardContent
                        step={step}
                        helperText={helperText}
                        canContinue={canContinue}
                        onContinue={onContinue}
                    />
                </div>
            </div>

            <style>{`
                @keyframes pulse {0%,100% { box-shadow: 0 0 0 4px rgba(224,123,83,0.3), 0 0 20px rgba(224,123,83,0.5);} 50% { box-shadow: 0 0 0 8px rgba(224,123,83,0.2), 0 0 30px rgba(224,123,83,0.7);} }
                :has(> [data-tutorial="flow-branch-button"]) { opacity: 1 !important; pointer-events: auto !important; }
            `}</style>
        </>
    );
}

interface TutorialCardContentProps {
    step: RecipeTutorialStep;
    helperText: string | null;
    canContinue: boolean;
    onContinue: () => void;
    centered?: boolean;
}

function TutorialCardContent({
    step,
    helperText,
    canContinue,
    onContinue,
    centered = false,
}: TutorialCardContentProps) {
    return (
        <div className={css({ textAlign: centered ? 'center' : 'left' })}>
            <h2
                className={css({
                    fontSize: { base: 'lg', md: 'xl' },
                    fontWeight: '700',
                    marginBottom: '1.5',
                    color: 'text.primary',
                    lineHeight: '1.2',
                })}
            >
                {step.title}
            </h2>
            <p
                className={css({
                    fontSize: 'sm',
                    color: 'text.muted',
                    marginBottom: '3',
                    lineHeight: '1.45',
                })}
            >
                {step.description}
            </p>
            {helperText ? (
                <p
                    className={css({
                        fontSize: 'xs',
                        color: 'palette.orange',
                        marginBottom: '2.5',
                        fontWeight: step.kind === 'info' ? '600' : '500',
                        letterSpacing: '0.01em',
                    })}
                >
                    {helperText}
                </p>
            ) : null}
            <button
                type="button"
                className={css({
                    background: canContinue
                        ? `linear-gradient(135deg, ${PALETTE.orange}, ${PALETTE.gold})`
                        : 'rgba(224,123,83,0.45)',
                    color: 'white',
                    fontWeight: '600',
                    borderRadius: 'lg',
                    px: '4',
                    py: '2.5',
                    border: 'none',
                    cursor: canContinue ? 'pointer' : 'not-allowed',
                    transition: 'all 150ms ease',
                    fontSize: 'sm',
                    _hover: canContinue
                        ? { transform: 'translateY(-1px)', filter: 'brightness(1.04)' }
                        : undefined,
                })}
                onClick={onContinue}
                disabled={!canContinue}
            >
                {step.primaryLabel}
            </button>
        </div>
    );
}

const backdropClass = css({
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    zIndex: 100,
});
const welcomeWrapperClass = css({
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 101,
    p: '4',
});
const welcomeCardClass = css({
    background: {
        base: 'linear-gradient(180deg, rgba(255,250,246,0.98), rgba(255,244,234,0.97))',
        _dark: 'linear-gradient(180deg, rgba(34,28,24,0.98), rgba(24,20,17,0.98))',
    },
    borderRadius: 'xl',
    p: { base: '4', md: '5' },
    maxWidth: '360px',
    width: '100%',
    boxShadow: {
        base: '0 18px 48px rgba(0,0,0,0.42)',
        _dark: '0 18px 48px rgba(0,0,0,0.55)',
    },
    color: 'text',
    border: {
        base: '1px solid rgba(224, 123, 83, 0.32)',
        _dark: '1px solid rgba(240, 144, 112, 0.38)',
    },
});
const overlayRootClass = css({ position: 'fixed', inset: 0, zIndex: 100 });
const overlaySliceClass = css({
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
});
const highlightClass = css({
    position: 'fixed',
    zIndex: 101,
    pointerEvents: 'none',
    border: '3px solid',
    borderColor: 'palette.orange',
    borderRadius: 'lg',
    boxShadow: '0 0 0 4px rgba(224,123,83,0.3), 0 0 20px rgba(224,123,83,0.5)',
    animation: 'pulse 2s ease-in-out infinite',
});
const targetBlockerClass = css({
    position: 'fixed',
    zIndex: 101,
    backgroundColor: 'transparent',
    pointerEvents: 'auto',
});
const floatingPanelClass = css({
    position: 'fixed',
    zIndex: 102,
    pointerEvents: 'auto',
    maxWidth: '280px',
});
const floatingCardClass = css({
    background: {
        base: 'linear-gradient(180deg, rgba(255,250,246,0.98), rgba(255,244,234,0.97))',
        _dark: 'linear-gradient(180deg, rgba(34,28,24,0.98), rgba(24,20,17,0.98))',
    },
    borderRadius: 'lg',
    p: '3',
    boxShadow: {
        base: '0 16px 38px rgba(0,0,0,0.34)',
        _dark: '0 16px 38px rgba(0,0,0,0.52)',
    },
    color: 'text',
    border: '1px solid',
    borderColor: {
        base: 'rgba(224, 123, 83, 0.34)',
        _dark: 'rgba(240, 144, 112, 0.42)',
    },
});
