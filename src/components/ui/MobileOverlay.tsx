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
                <>
                    {/* Blurred backdrop — page shimmers through at edges */}
                    <motion.div
                        className={css({
                            position: 'fixed',
                            inset: 0,
                            zIndex: 60,
                            backdropFilter: 'blur(24px)',
                            bg: { base: 'rgba(0,0,0,0.15)', _dark: 'rgba(0,0,0,0.4)' },
                        })}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                    />
                    {/* Content panel — inset with rounded corners */}
                    <motion.div
                        className={css({
                            position: 'fixed',
                            top: '8px',
                            left: '8px',
                            right: '8px',
                            bottom: '8px',
                            zIndex: 61,
                            display: 'flex',
                            flexDirection: 'column',
                            bg: {
                                base: 'rgba(255,252,248,0.92)',
                                _dark: 'rgba(30,28,26,0.92)',
                            },
                            backdropFilter: 'blur(40px)',
                            borderRadius: '2xl',
                            boxShadow: {
                                base: '0 8px 40px rgba(0,0,0,0.12)',
                                _dark: '0 8px 40px rgba(0,0,0,0.4)',
                            },
                            border: '1px solid',
                            borderColor: {
                                base: 'rgba(255,255,255,0.6)',
                                _dark: 'rgba(255,255,255,0.06)',
                            },
                            overflow: 'hidden',
                        })}
                        initial={{ opacity: 0, scale: 0.96, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 12 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                    >
                        {children}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
