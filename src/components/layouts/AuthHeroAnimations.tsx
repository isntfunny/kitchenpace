'use client';

import { ChefHat, Star } from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';

import { css } from 'styled-system/css';

/** Floating decorative icons in the hero panel */
export function HeroFloatingIcons() {
    return (
        <>
            <motion.div
                className={css({
                    position: 'absolute',
                    top: '-30px',
                    right: '-30px',
                    opacity: 0.12,
                    pointerEvents: 'none',
                })}
                animate={{ y: [0, -10, 0], rotate: [0, 4, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            >
                <ChefHat size={160} color="#fff6ec" />
            </motion.div>
            <motion.div
                className={css({
                    position: 'absolute',
                    bottom: '60px',
                    left: '-20px',
                    opacity: 0.08,
                    pointerEvents: 'none',
                })}
                animate={{ y: [0, 8, 0], rotate: [0, -3, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            >
                <Star size={120} color="#fff6ec" />
            </motion.div>
        </>
    );
}

/** Staggered fade-in wrapper for hero point cards */
export function HeroPointCard({ index, children }: { index: number; children: ReactNode }) {
    return (
        <motion.div
            className={css({
                display: 'flex',
                gap: '3',
                p: '3',
                borderRadius: 'xl',
                background: 'rgba(0,0,0,0.18)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,246,236,0.12)',
                alignItems: 'center',
            })}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 + index * 0.06 }}
        >
            {children}
        </motion.div>
    );
}

/** Fade-in wrapper for the form panel */
export function FormPanelAnimation({ children }: { children: ReactNode }) {
    return (
        <motion.div
            className={css({
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: { base: '6', md: '10' },
            })}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
        >
            {children}
        </motion.div>
    );
}
