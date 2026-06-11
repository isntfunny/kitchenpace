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
                    flexDirection: { base: 'column', md: 'row' },
                    alignItems: 'center',
                    gap: { base: '3', md: '7' },
                    px: { base: '5', md: '8' },
                    py: { base: '5', md: '6' },
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
                        // Mobile height is sized so the otter outranks the late-painting
                        // cookie-consent paragraph as the LCP element (otter ~46k px² at
                        // 150px lost to the banner's ~61k; 200px puts it well ahead).
                        height: { base: '200px', md: '220px' },
                        width: 'auto',
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.18))',
                    })}
                />

                <div className={css({ textAlign: { base: 'center', md: 'left' } })}>
                    <h1
                        className={css({
                            fontFamily: 'heading',
                            fontSize: { base: '2xl', md: '3xl' },
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
                            fontSize: { base: 'sm', md: 'md' },
                            maxW: '520px',
                            lineHeight: '1.6',
                            mt: '2',
                            mx: { base: 'auto', md: '0' },
                        })}
                    >
                        Sieh auf einen Blick, was gleichzeitig laeuft &ndash; ohne lange Listen.
                        Parallele Schritte, klar visualisiert.
                    </p>

                    {children && <div className={css({ mt: '4' })}>{children}</div>}
                </div>
            </motion.div>
        </section>
    );
}
