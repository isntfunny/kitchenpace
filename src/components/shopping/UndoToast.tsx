'use client';

import { useEffect } from 'react';

import { css } from 'styled-system/css';

export interface UndoToastState {
    id: number;
    message: string;
    /** Without an action it is a plain notice */
    onUndo?: () => void;
}

const bar = css({
    position: 'fixed',
    zIndex: '60',
    left: '50%',
    transform: 'translateX(-50%)',
    bottom: { base: '20', md: '6' },
    display: 'flex',
    alignItems: 'center',
    gap: '4',
    maxW: 'calc(100vw - 24px)',
    px: '4',
    py: '3',
    bg: 'foreground',
    color: 'background',
    borderRadius: 'xl',
    boxShadow: 'shadow.medium',
    fontFamily: 'body',
    fontSize: 'sm',
});
const action = css({
    bg: 'transparent',
    border: 'none',
    color: 'primary',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: 'body',
    fontSize: 'sm',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    _focusVisible: { outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' },
});

const VISIBLE_MS = 6000;

/** Bottom bar with "Rückgängig"; disappears after a few seconds. */
export function UndoToast({
    toast,
    onClose,
}: {
    toast: UndoToastState | null;
    onClose: () => void;
}) {
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(onClose, VISIBLE_MS);
        return () => clearTimeout(timer);
    }, [toast, onClose]);

    if (!toast) return null;
    return (
        <div className={bar} role="status" aria-live="polite">
            <span>{toast.message}</span>
            {toast.onUndo && (
                <button
                    type="button"
                    className={action}
                    onClick={() => {
                        toast.onUndo?.();
                        onClose();
                    }}
                >
                    Rückgängig
                </button>
            )}
        </div>
    );
}
