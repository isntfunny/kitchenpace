'use client';

import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react';
import { AnimatePresence } from 'motion/react';
import { useLayoutEffect, useState, useSyncExternalStore } from 'react';

import { useToastContext } from '@app/components/providers/ToastProvider';

import { css } from 'styled-system/css';

import { ToastBubble } from './ToastBubble';

const MOBILE_QUERY = '(max-width: 639px)';

function subscribeMobileQuery(callback: () => void) {
    const mq = window.matchMedia(MOBILE_QUERY);
    mq.addEventListener('change', callback);
    return () => mq.removeEventListener('change', callback);
}

function getMobileSnapshot() {
    return window.matchMedia(MOBILE_QUERY).matches;
}

function getServerSnapshot() {
    return false;
}

type ToastViewportProps = {
    anchorElement: HTMLElement | null;
};

export function ToastViewport({ anchorElement }: ToastViewportProps) {
    const { toasts, dismissToast } = useToastContext();
    const [floatingElement, setFloatingElement] = useState<HTMLDivElement | null>(null);
    const isMobile = useSyncExternalStore(
        subscribeMobileQuery,
        getMobileSnapshot,
        getServerSnapshot,
    );

    const { refs, floatingStyles } = useFloating({
        placement: 'left-start',
        strategy: 'fixed',
        // crossAxis: -10 shifts the container 10px above badge top so the
        // tail at top:11px (center at 20px) aligns with the badge center (10+10=20px)
        middleware: [offset({ mainAxis: 12, crossAxis: -10 }), flip(), shift({ padding: 8 })],
        whileElementsMounted: autoUpdate,
    });

    useLayoutEffect(() => {
        refs.setReference(anchorElement);
    }, [anchorElement, refs]);

    useLayoutEffect(() => {
        refs.setFloating(floatingElement);
    }, [floatingElement, refs]);

    if (toasts.length === 0) return null;

    // ── Mobile: fixed at top center, swipe-down from above ──────────────────
    if (isMobile) {
        return (
            <div
                className={css({
                    position: 'fixed',
                    top: '0',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    pt: 'env(safe-area-inset-top, 8px)',
                    width: 'calc(100vw - 2rem)',
                    maxWidth: '24rem',
                    zIndex: 120,
                    display: 'grid',
                    gap: '2',
                })}
            >
                <AnimatePresence initial={false} mode="popLayout">
                    {toasts.map((toast) => (
                        <ToastBubble
                            key={toast.id}
                            toast={toast}
                            showTail={false}
                            isMobile={true}
                            onDismiss={() => dismissToast(toast.id)}
                        />
                    ))}
                </AnimatePresence>
            </div>
        );
    }

    // ── Desktop: anchored speech bubble left of the notification badge ───────
    if (!anchorElement) return null;

    return (
        <div
            ref={setFloatingElement}
            style={floatingStyles}
            className={css({
                zIndex: 120,
                width: 'min(22rem, calc(100vw - 1rem))',
                maxWidth: 'calc(100vw - 1rem)',
                display: 'grid',
                gap: '2',
            })}
        >
            <AnimatePresence initial={false} mode="popLayout">
                {toasts.map((toast, index) => (
                    <ToastBubble
                        key={toast.id}
                        toast={toast}
                        showTail={index === 0}
                        isMobile={false}
                        onDismiss={() => dismissToast(toast.id)}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}
