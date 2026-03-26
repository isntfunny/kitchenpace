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
                    {/* Backdrop — heavy blur so page is soft/unreadable */}
                    <motion.div
                        className={css({
                            position: 'fixed',
                            inset: 0,
                            zIndex: 60,
                            backdropFilter: 'blur(20px) saturate(0.8)',
                            bg: {
                                base: 'rgba(250,246,241,0.6)',
                                _dark: 'rgba(15,13,11,0.65)',
                            },
                        })}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                    />
                    {/* Content panel — opaque, inset for breathing room */}
                    <motion.div
                        className={css({
                            position: 'fixed',
                            top: '12px',
                            left: '10px',
                            right: '10px',
                            bottom: '12px',
                            zIndex: 61,
                            display: 'flex',
                            flexDirection: 'column',
                            bg: {
                                base: '#fffcf8',
                                _dark: '#1e1c1a',
                            },
                            borderRadius: '2xl',
                            boxShadow: {
                                base: '0 12px 48px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
                                _dark: '0 12px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)',
                            },
                            overflow: 'hidden',
                        })}
                        initial={{ opacity: 0, scale: 0.97, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97, y: 8 }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                    >
                        {children}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
