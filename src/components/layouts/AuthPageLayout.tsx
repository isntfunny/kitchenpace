'use client';

import { BookmarkPlus, Camera, ChefHat, Pin, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { ReactNode } from 'react';

import { PageShell } from '@app/components/layouts/PageShell';
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
        description:
            'Zeig deine Kreationen! Lade eigene Fotos zu jedem Rezeptschritt hoch.',
        icon: Camera,
    },
    {
        label: 'Rezepte importieren',
        description:
            'Importiere Rezepte von jeder Website — unsere KI wandelt sie automatisch in Flow-Diagramme um.',
        icon: BookmarkPlus,
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
                    paddingY: { base: '8', md: '10' },
                    display: 'flex',
                    justifyContent: 'center',
                })}
            >
                <div
                    className={css({
                        width: '100%',
                        maxWidth: '1400px',
                        marginX: 'auto',
                        paddingX: { base: '0', md: '2' },
                    })}
                >
                    <div
                        className={css({
                            display: 'grid',
                            gridTemplateColumns: { base: '1fr', lg: '1.15fr 0.85fr' },
                            gap: { base: '6', lg: '10' },
                        })}
                    >
                        <motion.div
                            className={css({
                                position: 'relative',
                                borderRadius: '3xl',
                                border: '1px solid',
                                borderColor: 'border',
                                background: 'surface',
                                padding: { base: '6', md: '8' },
                                overflow: 'hidden',
                                minHeight: '100%',
                            })}
                            initial={{ opacity: 0, x: -16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.45 }}
                        >
                            <div
                                aria-hidden
                                className={css({
                                    position: 'absolute',
                                    inset: 0,
                                    background:
                                        'radial-gradient(circle at top right, rgba(224,123,83,0.15), transparent 60%)',
                                    pointerEvents: 'none',
                                })}
                            />
                            <div
                                className={css({
                                    position: 'relative',
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
                                        color: 'foreground.muted',
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
                                    })}
                                >
                                    {heroTitle}
                                </h2>
                                <p
                                    className={css({
                                        color: 'foreground.muted',
                                        fontSize: 'md',
                                        marginBottom: '2',
                                        maxWidth: '420px',
                                    })}
                                >
                                    {heroSubtitle}
                                </p>
                                <div
                                    className={css({
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '3',
                                        marginTop: 'auto',
                                    })}
                                >
                                    {HERO_POINTS.map((point, index) => (
                                        <motion.div
                                            key={point.label}
                                            className={css({
                                                display: 'flex',
                                                gap: '3',
                                                padding: '3',
                                                borderRadius: '2xl',
                                                border: '1px solid',
                                                borderColor: 'border.muted',
                                                background: 'surface.elevated',
                                                alignItems: 'flex-start',
                                            })}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.3, delay: 0.2 + index * 0.06 }}
                                        >
                                            <div
                                                className={css({
                                                    width: '10',
                                                    height: '10',
                                                    borderRadius: 'full',
                                                    background: 'accent.soft',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                })}
                                            >
                                                <point.icon size={20} color="#e07b53" />
                                            </div>
                                            <div>
                                                <p
                                                    className={css({
                                                        fontSize: 'sm',
                                                        fontWeight: '600',
                                                        marginBottom: '1',
                                                    })}
                                                >
                                                    {point.label}
                                                </p>
                                                <p
                                                    className={css({
                                                        fontSize: 'xs',
                                                        color: 'foreground.muted',
                                                        margin: 0,
                                                        lineHeight: '1.6',
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

                        <motion.div
                            className={css({
                                display: 'flex',
                                justifyContent: 'center',
                            })}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.15 }}
                        >
                            <div
                                className={css({
                                    width: '100%',
                                    maxWidth: '560px',
                                    background: 'surface.elevated',
                                    borderRadius: '3xl',
                                    padding: { base: '6', md: '8' },
                                    boxShadow: '0 30px 90px rgba(0,0,0,0.12)',
                                    border: '1px solid',
                                    borderColor: 'border',
                                })}
                            >
                                <div
                                    className={css({
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
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>
        </PageShell>
    );
}
