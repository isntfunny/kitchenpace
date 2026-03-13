/* eslint-disable react-hooks/refs */
'use client';

import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react';
import { useOnboarding } from '@onboardjs/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { css } from 'styled-system/css';

import { RECIPE_TUTORIAL_TARGETS } from '../types';
import type { RecipeTutorialTargets } from '../types';

import { OnboardingArrow } from './OnboardingArrow';

interface TutorialOverlayProps {
    targets: RecipeTutorialTargets;
}

export function TutorialOverlay({ targets }: TutorialOverlayProps) {
    const { currentStep, renderStep } = useOnboarding();
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const targetId = currentStep?.payload?.targetId as string | undefined;
    const isWelcomeStep = currentStep?.id === 'recipe-create-welcome';

    const activeTargetRef = useMemo(() => {
        if (targetId === RECIPE_TUTORIAL_TARGETS.title) return targets.title;
        return null;
    }, [targetId, targets.title]);

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
        if (!activeTargetRef?.current) {
            setTargetRect(null);
            floating.refs.setReference(null);
            return;
        }

        const nextRect = activeTargetRef.current.getBoundingClientRect();
        floating.refs.setReference(activeTargetRef.current);
        setTargetRect(nextRect);
    }, [activeTargetRef, floating.refs]);

    useEffect(() => {
        if (!currentStep) {
            setTargetRect(null);
            floating.refs.setReference(null);
            return;
        }

        const frame = window.requestAnimationFrame(updateTarget);
        const reference = activeTargetRef?.current;
        const floatingElement = floating.refs.floating.current;
        const cleanup =
            reference && floatingElement
                ? autoUpdate(reference, floatingElement, updateTarget)
                : undefined;

        window.addEventListener('resize', updateTarget);
        window.addEventListener('scroll', updateTarget, true);

        return () => {
            window.cancelAnimationFrame(frame);
            cleanup?.();
            window.removeEventListener('resize', updateTarget);
            window.removeEventListener('scroll', updateTarget, true);
        };
    }, [activeTargetRef, currentStep, floating.refs, updateTarget]);

    if (!currentStep) return null;

    if (isWelcomeStep) {
        return (
            <>
                <div
                    className={css({
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.72)',
                        zIndex: 100,
                    })}
                />
                <div
                    className={css({
                        position: 'fixed',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 101,
                        p: '4',
                    })}
                >
                    <div
                        className={css({
                            backgroundColor: 'surface',
                            borderRadius: '2xl',
                            p: { base: '6', md: '8' },
                            maxWidth: '480px',
                            width: '100%',
                            boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
                            color: 'text',
                        })}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Willkommen im Rezept-Ersteller"
                    >
                        {renderStep()}
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <div className={css({ position: 'fixed', inset: 0, zIndex: 100 })}>
                <div
                    className={css({
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        height: targetRect ? `${targetRect.top}px` : '100%',
                        pointerEvents: 'auto',
                    })}
                />
                {targetRect ? (
                    <>
                        <div
                            className={css({
                                position: 'absolute',
                                top: `${targetRect.top}px`,
                                left: 0,
                                width: `${targetRect.left}px`,
                                height: `${targetRect.height}px`,
                                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                pointerEvents: 'auto',
                            })}
                        />
                        <div
                            className={css({
                                position: 'absolute',
                                top: `${targetRect.top}px`,
                                right: 0,
                                width: `calc(100% - ${targetRect.right}px)`,
                                height: `${targetRect.height}px`,
                                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                pointerEvents: 'auto',
                            })}
                        />
                    </>
                ) : null}
                <div
                    className={css({
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        height: targetRect ? `calc(100% - ${targetRect.bottom}px)` : '0px',
                        pointerEvents: 'auto',
                    })}
                />
            </div>

            {targetRect ? (
                <div
                    className={css({
                        position: 'fixed',
                        zIndex: 101,
                        pointerEvents: 'none',
                        border: '3px solid',
                        borderColor: 'palette.orange',
                        borderRadius: 'lg',
                        boxShadow:
                            '0 0 0 4px rgba(224, 123, 83, 0.3), 0 0 20px rgba(224, 123, 83, 0.5)',
                        animation: 'pulse 2s ease-in-out infinite',
                    })}
                    style={{
                        left: `${targetRect.left - 4}px`,
                        top: `${targetRect.top - 4}px`,
                        width: `${targetRect.width + 8}px`,
                        height: `${targetRect.height + 8}px`,
                    }}
                />
            ) : null}

            <div
                ref={floating.refs.setFloating}
                className={css({
                    position: 'fixed',
                    zIndex: 102,
                    pointerEvents: 'auto',
                    maxWidth: '360px',
                })}
                style={floating.floatingStyles}
            >
                <div
                    className={css({
                        backgroundColor: 'surface',
                        borderRadius: 'xl',
                        p: '5',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
                        color: 'text',
                        border: '1px solid',
                        borderColor: 'rgba(224, 123, 83, 0.3)',
                    })}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Tutorial-Schritt"
                >
                    {targetRect ? <OnboardingArrow placement={floating.placement} /> : null}
                    {renderStep()}
                </div>
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { box-shadow: 0 0 0 4px rgba(224, 123, 83, 0.3), 0 0 20px rgba(224, 123, 83, 0.5); }
                    50% { box-shadow: 0 0 0 8px rgba(224, 123, 83, 0.2), 0 0 30px rgba(224, 123, 83, 0.7); }
                }
            `}</style>
        </>
    );
}
