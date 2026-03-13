'use client';

import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react';
import { AnimatePresence } from 'motion/react';
import { useLayoutEffect, useState } from 'react';

import { useToastContext } from '@app/components/providers/ToastProvider';
import { css } from 'styled-system/css';

import { ToastBubble } from './ToastBubble';

type ToastViewportProps = {
    anchorElement: HTMLElement | null;
};

export function ToastViewport({ anchorElement }: ToastViewportProps) {
    const { toasts, dismissToast } = useToastContext();
    const [floatingElement, setFloatingElement] = useState<HTMLDivElement | null>(null);
    const { refs, floatingStyles } = useFloating({
        placement: 'bottom-end',
        strategy: 'fixed',
        middleware: [offset({ mainAxis: 18, crossAxis: 10 }), flip(), shift({ padding: 8 })],
        whileElementsMounted: autoUpdate,
    });

    useLayoutEffect(() => {
        refs.setReference(anchorElement);
    }, [anchorElement, refs]);

    useLayoutEffect(() => {
        refs.setFloating(floatingElement);
    }, [floatingElement, refs]);

    if (!anchorElement || toasts.length === 0) {
        return null;
    }

    return (
        <div
            ref={setFloatingElement}
            style={floatingStyles}
            className={css({
                zIndex: 120,
                width: 'min(24rem, calc(100vw - 1rem))',
                maxWidth: 'calc(100vw - 1rem)',
                display: 'grid',
                gap: '2.5',
            })}
        >
            <AnimatePresence initial={false} mode="popLayout">
                {toasts.map((toast, index) => (
                    <ToastBubble
                        key={toast.id}
                        toast={toast}
                        showTail={index === 0}
                        onDismiss={() => dismissToast(toast.id)}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}
