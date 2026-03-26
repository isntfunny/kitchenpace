'use client';

import { AnimatePresence, motion } from 'motion/react';
import { type ReactNode, useEffect } from 'react';

import { css } from 'styled-system/css';

export function MobileOverlay({
    open,
    onClose,
    children,
}: {
    open: boolean;
    onClose: () => void;
    children: ReactNode;
}) {
    // Lock body scroll
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    // ESC to close
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, onClose]);

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className={css({
                        position: 'fixed',
                        inset: 0,
                        zIndex: 60,
                        display: 'flex',
                        flexDirection: 'column',
                        bg: { base: 'rgba(255,252,248,0.97)', _dark: 'rgba(26,23,21,0.97)' },
                        backdropFilter: 'blur(20px)',
                    })}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
