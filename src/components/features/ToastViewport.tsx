'use client';

import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react';
import { AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';

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
        middleware: [offset(14), flip(), shift({ padding: 8 })],
        whileElementsMounted: autoUpdate,
    });

    useEffect(() => {
        refs.setReference(anchorElement);
    }, [anchorElement, refs]);

    useEffect(() => {
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
                {toasts.map((toast) => (
                    <ToastBubble
                        key={toast.id}
                        toast={toast}
                        onDismiss={() => dismissToast(toast.id)}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}
