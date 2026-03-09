'use client';

import { Camera, ChefHat, Pin, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { ReactNode } from 'react';

import { PageShell } from '@app/components/layouts/PageShell';
import { PALETTE } from '@app/lib/palette';
import { css } from 'styled-system/css';

const HERO_POINTS = [
    {
        label: 'Eigene Rezepte erstellen',
        description:
            'Erstelle Rezepte als visuelle Flow-Diagramme — mit parallelen Schritten, Timings und eigenen Fotos.',
        icon: ChefHat,
    },
    {
        label: 'Rezepte anpinnen & organisieren',
        description:
            'Pinne deine Lieblingsrezepte an und hab sie immer griffbereit — dein persönliches Kochbuch.',
        icon: Pin,
    },
    {
        label: 'Favoriten & Sammlungen',
        description:
            'Speichere Rezepte anderer Köche als Favoriten und finde sie jederzeit wieder.',
        icon: Star,
    },
    {
        label: 'Fotos hochladen',
        description: 'Zeig deine Kreationen! Lade eigene Fotos zu jedem Rezeptschritt hoch.',
        icon: Camera,
    },
];

type AuthPageLayoutProps = {
    children: ReactNode;
    formFooter?: ReactNode;
    heroTitle?: string;
    heroSubtitle?: string;
    heroCaption?: string;
};

export function AuthPageLayout({
    children,
    formFooter,
    heroTitle = 'Planen ohne Kompromisse',
    heroSubtitle = 'KüchenTakt verbindet den visuellen Flow deiner Rezeptschritte mit smarten Filtern und Community-Insights.',
    heroCaption = 'KüchenTakt',
}: AuthPageLayoutProps) {
    return (
        <PageShell>
            <section
                className={css({
                    paddingY: { base: '6', md: '10' },
                    paddingX: { base: '4', sm: '6', lg: '6' },
                    display: 'flex',
                    justifyContent: 'center',
                })}
            >
                <div
                    className={css({
                        width: '100%',
                        maxWidth: '1200px',
                    })}
                >
                    {/* Seamless card: overflow:hidden clips both panels with the outer border-radius */}
                    <div
                        className={css({
                            display: 'grid',
                            gridTemplateColumns: { base: '1fr', lg: '1.15fr 0.85fr' },
                            overflow: 'hidden',
                            borderRadius: '3xl',
                            boxShadow: {
                                base: '0 30px 90px rgba(0,0,0,0.14)',
                                _dark: '0 30px 90px rgba(0,0,0,0.5)',
                            },
                            border: '1px solid',
                            borderColor: 'border',
                            minHeight: { base: 'auto', lg: '580px' },
                        })}
                    >
                        {/* Hero panel — below form on small, left on large */}
                        <motion.div
                            className={css({
                                display: 'flex',
                                order: { base: 2, lg: 1 },
                                position: 'relative',
                                overflow: 'hidden',
                                flexDirection: 'column',
                                justifyContent: 'flex-end',
                                minHeight: { base: '300px', lg: 'auto' },
                            })}
                            style={{
                                background: `linear-gradient(135deg, color-mix(in srgb, ${PALETTE.orange} 90%, black), ${PALETTE.orange}, color-mix(in srgb, ${PALETTE.orange} 75%, white))`,
                            }}
                            initial={{ opacity: 0, x: -16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.45 }}
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

                            {/* Content */}
                            <div
                                className={css({
                                    position: 'relative',
                                    p: { base: '6', md: '8' },
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4',
                                    height: '100%',
                                })}
                            >
                                <p
                                    className={css({
                                        textTransform: 'uppercase',
                                        letterSpacing: 'wide',
                                        fontSize: 'xs',
                                        fontWeight: '700',
                                        color: 'rgba(255,246,236,0.7)',
                                    })}
                                >
                                    {heroCaption}
                                </p>
                                <h2
                                    className={css({
                                        fontSize: { base: '3xl', md: '4xl' },
                                        fontWeight: '800',
                                        lineHeight: '1.2',
                                        margin: 0,
                                        color: '#fff6ec',
                                    })}
                                >
                                    {heroTitle}
                                </h2>
                                <p
                                    className={css({
                                        color: 'rgba(255,246,236,0.85)',
                                        fontSize: 'md',
                                        maxWidth: '420px',
                                    })}
                                >
                                    {heroSubtitle}
                                </p>

                                <div
                                    className={css({
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '2.5',
                                        marginTop: 'auto',
                                    })}
                                >
                                    {HERO_POINTS.map((point, index) => (
                                        <motion.div
                                            key={point.label}
                                            className={css({
                                                display: 'flex',
                                                gap: '3',
                                                p: '3',
                                                borderRadius: 'xl',
                                                background: 'rgba(255,246,236,0.15)',
                                                backdropFilter: 'blur(12px)',
                                                border: '1px solid rgba(255,246,236,0.1)',
                                                alignItems: 'center',
                                            })}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{
                                                duration: 0.3,
                                                delay: 0.2 + index * 0.06,
                                            }}
                                        >
                                            <div
                                                className={css({
                                                    width: '9',
                                                    height: '9',
                                                    borderRadius: 'full',
                                                    background: 'rgba(255,246,236,0.2)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                })}
                                            >
                                                <point.icon size={18} color="#fff6ec" />
                                            </div>
                                            <div>
                                                <p
                                                    className={css({
                                                        fontSize: 'sm',
                                                        fontWeight: '600',
                                                        color: '#fff6ec',
                                                        margin: 0,
                                                    })}
                                                >
                                                    {point.label}
                                                </p>
                                                <p
                                                    className={css({
                                                        fontSize: 'xs',
                                                        color: 'rgba(255,246,236,0.75)',
                                                        margin: 0,
                                                        lineHeight: '1.5',
                                                    })}
                                                >
                                                    {point.description}
                                                </p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>

                        {/* Form panel */}
                        <motion.div
                            className={css({
                                background: 'surface.elevated',
                                display: 'flex',
                                order: { base: 1, lg: 2 },
                                flexDirection: 'column',
                                justifyContent: 'center',
                                padding: { base: '6', md: '10' },
                            })}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.15 }}
                        >
                            <div
                                className={css({
                                    width: '100%',
                                    maxWidth: '460px',
                                    marginX: 'auto',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4',
                                })}
                            >
                                {children}
                            </div>
                            {formFooter && (
                                <div
                                    className={css({
                                        width: '100%',
                                        maxWidth: '460px',
                                        marginX: 'auto',
                                        marginTop: '5',
                                        borderTop: '1px solid',
                                        borderColor: 'border.muted',
                                        paddingTop: '4',
                                        fontSize: 'sm',
                                        color: 'foreground.muted',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '2',
                                    })}
                                >
                                    {formFooter}
                                </div>
                            )}
                        </motion.div>
                    </div>
                </div>
            </section>
        </PageShell>
    );
}
