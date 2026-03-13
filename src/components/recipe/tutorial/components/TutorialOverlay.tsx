/* eslint-disable react-hooks/refs */
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

function getTargetElement(step: RecipeTutorialStep): HTMLElement | null {
    if (!step.targetId) return null;
    return document.querySelector<HTMLElement>(`[data-tutorial="${step.targetId}"]`);
}

export function TutorialOverlay({ step, canContinue, onContinue }: TutorialOverlayProps) {
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const isWelcomeStep = step.id === 'welcome';
    const blockTargetInteraction = step.allowTargetInteraction === false;

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
        const target = getTargetElement(step);
        if (!target) {
            setTargetRect(null);
            floating.refs.setReference(null);
            return;
        }

        floating.refs.setReference(target);
        setTargetRect(target.getBoundingClientRect());
    }, [floating.refs, step]);

    useEffect(() => {
        const frame = window.requestAnimationFrame(updateTarget);
        const target = getTargetElement(step);
        const floatingElement = floating.refs.floating.current;
        const cleanup =
            target && floatingElement
                ? autoUpdate(target, floatingElement, updateTarget)
                : undefined;

        window.addEventListener('resize', updateTarget);
        window.addEventListener('scroll', updateTarget, true);

        return () => {
            window.cancelAnimationFrame(frame);
            cleanup?.();
            window.removeEventListener('resize', updateTarget);
            window.removeEventListener('scroll', updateTarget, true);
        };
    }, [floating.refs, step, updateTarget]);

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
                                width: '72px',
                                height: '72px',
                                borderRadius: 'full',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 6',
                                boxShadow: '0 8px 30px rgba(224, 123, 83, 0.4)',
                            })}
                            style={{
                                background: `linear-gradient(135deg, ${PALETTE.orange}, ${PALETTE.gold})`,
                            }}
                        >
                            <Sparkles
                                className={css({ width: '36px', height: '36px', color: 'white' })}
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
            <div className={overlayRootClass}>
                <div
                    className={overlaySliceClass}
                    style={{
                        top: 0,
                        left: 0,
                        right: 0,
                        height: targetRect ? `${targetRect.top}px` : '100%',
                    }}
                />
                {targetRect ? (
                    <>
                        <div
                            className={overlaySliceClass}
                            style={{
                                top: `${targetRect.top}px`,
                                left: 0,
                                width: `${targetRect.left}px`,
                                height: `${targetRect.height}px`,
                            }}
                        />
                        <div
                            className={overlaySliceClass}
                            style={{
                                top: `${targetRect.top}px`,
                                right: 0,
                                width: `calc(100% - ${targetRect.right}px)`,
                                height: `${targetRect.height}px`,
                            }}
                        />
                        <div
                            className={overlaySliceClass}
                            style={{
                                bottom: 0,
                                left: 0,
                                right: 0,
                                height: `calc(100% - ${targetRect.bottom}px)`,
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
                            left: `${targetRect.left - 4}px`,
                            top: `${targetRect.top - 4}px`,
                            width: `${targetRect.width + 8}px`,
                            height: `${targetRect.height + 8}px`,
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
                ref={floating.refs.setFloating}
                className={floatingPanelClass}
                style={floating.floatingStyles}
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

            <style>{`@keyframes pulse {0%,100% { box-shadow: 0 0 0 4px rgba(224,123,83,0.3), 0 0 20px rgba(224,123,83,0.5);} 50% { box-shadow: 0 0 0 8px rgba(224,123,83,0.2), 0 0 30px rgba(224,123,83,0.7);} }`}</style>
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
                    fontSize: { base: '2xl', md: '3xl' },
                    fontWeight: '700',
                    marginBottom: '3',
                    color: 'text.primary',
                })}
            >
                {step.title}
            </h2>
            <p
                className={css({
                    fontSize: 'md',
                    color: 'text.muted',
                    marginBottom: '5',
                    lineHeight: '1.7',
                })}
            >
                {step.description}
            </p>
            {helperText ? (
                <p
                    className={css({
                        fontSize: 'sm',
                        color: 'text.secondary',
                        marginBottom: '4',
                        fontWeight: step.kind === 'info' ? '600' : '500',
                    })}
                >
                    {helperText}
                </p>
            ) : null}
            <button
                type="button"
                className={css({
                    backgroundColor: canContinue ? 'palette.orange' : 'rgba(224,123,83,0.45)',
                    color: 'white',
                    fontWeight: '600',
                    borderRadius: 'xl',
                    px: '6',
                    py: '3.5',
                    border: 'none',
                    cursor: canContinue ? 'pointer' : 'not-allowed',
                    transition: 'all 150ms ease',
                    fontSize: 'md',
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
    backgroundColor: 'surface',
    borderRadius: '2xl',
    p: { base: '6', md: '8' },
    maxWidth: '480px',
    width: '100%',
    boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
    color: 'text',
});
const overlayRootClass = css({ position: 'fixed', inset: 0, zIndex: 100 });
const overlaySliceClass = css({
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    pointerEvents: 'auto',
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
    maxWidth: '380px',
});
const floatingCardClass = css({
    backgroundColor: 'surface',
    borderRadius: 'xl',
    p: '5',
    boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
    color: 'text',
    border: '1px solid',
    borderColor: 'rgba(224, 123, 83, 0.3)',
});
