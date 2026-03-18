'use client';

import { ChefHat, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import React from 'react';

import { useIsRetro } from '@app/lib/darkMode';
import { PALETTE } from '@app/lib/palette';

import { css } from 'styled-system/css';
import { flex } from 'styled-system/patterns';

export function HeroSpotlight({ children }: { children?: React.ReactNode }) {
    const retro = useIsRetro();
    return (
        <section
            className={css({
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 'surface',
                mb: '4',
            })}
            style={{
                background: retro
                    ? PALETTE.orange
                    : `linear-gradient(135deg, ${PALETTE.orange}, ${PALETTE.orange}dd, #d4694a)`,
            }}
        >
            {/* Decorative floating icons */}
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
                <ChefHat size={180} color="white" />
            </motion.div>
            <motion.div
                className={css({
                    position: 'absolute',
                    bottom: '-40px',
                    left: '15%',
                    opacity: 0.06,
                    pointerEvents: 'none',
                })}
                animate={{ y: [0, 8, 0], rotate: [0, -3, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            >
                <Sparkles size={220} color="white" />
            </motion.div>

            <motion.div
                className={css({
                    position: 'relative',
                    zIndex: 1,
                    px: { base: '5', md: '8' },
                    py: { base: '6', md: '8' },
                })}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className={flex({ align: 'center', gap: '3', mb: '2' })}>
                    <div
                        className={css({
                            width: '44px',
                            height: '44px',
                            borderRadius: 'surface.sm',
                            bg: 'rgba(255,255,255,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backdropFilter: 'blur(8px)',
                        })}
                    >
                        <ChefHat size={22} color="white" />
                    </div>
                    <div>
                        <h1
                            className={css({
                                fontFamily: 'heading',
                                fontSize: { base: 'xl', md: '3xl' },
                                fontWeight: '700',
                                color: 'white',
                                lineHeight: '1.15',
                            })}
                        >
                            Kochen neu gedacht
                        </h1>
                    </div>
                </div>

                <motion.p
                    className={css({
                        color: 'rgba(255,255,255,0.9)',
                        fontSize: { base: 'sm', md: 'md' },
                        maxW: '520px',
                        lineHeight: '1.6',
                        mt: '1',
                    })}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                >
                    Sieh auf einen Blick, was gleichzeitig laeuft &ndash; ohne lange Listen.
                    Parallele Schritte, klar visualisiert.
                </motion.p>

                {children && <div className={css({ mt: '4' })}>{children}</div>}
            </motion.div>
        </section>
    );
}
