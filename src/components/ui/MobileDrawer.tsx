'use client';

import { AnimatePresence, motion } from 'motion/react';
import { type ReactNode, useEffect, useRef } from 'react';

import { css } from 'styled-system/css';

export function MobileDrawer({
    open,
    onClose,
    direction,
    children,
}: {
    open: boolean;
    onClose: () => void;
    direction: 'left' | 'right';
    children: ReactNode;
}) {
    const touchStart = useRef<number | null>(null);

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

    const isLeft = direction === 'left';

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className={css({
                            position: 'fixed',
                            inset: 0,
                            zIndex: 60,
                            backdropFilter: 'blur(8px)',
                        })}
                        initial={{ backgroundColor: 'rgba(0,0,0,0)' }}
                        animate={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
                        exit={{ backgroundColor: 'rgba(0,0,0,0)' }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                    />
                    {/* Drawer panel */}
                    <motion.div
                        className={css({
                            position: 'fixed',
                            top: 0,
                            bottom: 0,
                            zIndex: 61,
                            width: '85%',
                            maxWidth: '320px',
                            display: 'flex',
                            flexDirection: 'column',
                            bg: { base: 'white', _dark: '#1a1715' },
                            boxShadow: '0 0 40px rgba(0,0,0,0.15)',
                            overflowY: 'auto',
                            ...(isLeft ? { left: 0 } : { right: 0 }),
                        })}
                        initial={{ x: isLeft ? '-100%' : '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: isLeft ? '-100%' : '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                        onTouchStart={(e) => {
                            touchStart.current = e.touches[0].clientX;
                        }}
                        onTouchEnd={(e) => {
                            if (touchStart.current === null) return;
                            const dx = e.changedTouches[0].clientX - touchStart.current;
                            touchStart.current = null;
                            const threshold = 80;
                            if (isLeft && dx < -threshold) onClose();
                            if (!isLeft && dx > threshold) onClose();
                        }}
                    >
                        {children}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
