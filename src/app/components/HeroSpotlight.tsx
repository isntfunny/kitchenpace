'use client';

import { ChefHat, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import React from 'react';

import { useIsRetro } from '@app/lib/darkMode';
import { PALETTE } from '@app/lib/palette';

import { css } from 'styled-system/css';

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
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: { base: '4', md: '7' },
                    px: { base: '4', md: '8' },
                    py: { base: '4', md: '6' },
                })}
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.5 }}
            >
                {/* LCP element: real raster image (high entropy) painted eagerly */}
                <img
                    src="/hero-otter.webp"
                    alt="KochTakt-Maskottchen: ein Otter mit Kochmütze"
                    width={569}
                    height={913}
                    fetchPriority="high"
                    loading="eager"
                    decoding="async"
                    className={css({
                        flexShrink: 0,
                        // LCP note: beside the text the otter renders ~124px wide → ~46k px²,
                        // which loses to the cookie-consent paragraph (~59k px²) on a first
                        // visit. Returning visitors (no banner) get the otter as instant LCP.
                        // Beating the banner in this row layout would need ~225px height.
                        height: { base: '196px', md: '220px' },
                        width: 'auto',
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.18))',
                    })}
                />

                <div className={css({ minWidth: 0, textAlign: 'left' })}>
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

                    <p
                        className={css({
                            color: 'rgba(255,255,255,0.9)',
                            fontSize: { base: 'xs', md: 'md' },
                            maxW: '520px',
                            lineHeight: '1.55',
                            mt: { base: '1.5', md: '2' },
                        })}
                    >
                        Nudeln kochen, Soße rühren, Salat schnippeln &mdash; und alles soll
                        gleichzeitig fertig sein? KochTakt zeigt dir dein Rezept als klaren Ablauf:
                        was parallel läuft, was jetzt dran ist und wo du Zeit hast. Damit am Ende
                        alles zusammen dampfend auf dem Tisch steht.
                    </p>

                    {children && <div className={css({ mt: '4' })}>{children}</div>}
                </div>
            </motion.div>
        </section>
    );
}
