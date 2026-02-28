'use client';

import { ChefHat, Clock, Sparkles } from 'lucide-react';
import { ReactNode } from 'react';

import { PageShell } from '@/components/layouts/PageShell';
import { css } from 'styled-system/css';

const HERO_POINTS = [
    {
        label: 'Flow-Diagramme',
        description: 'Parallele Schritte und Timing im Blick',
        icon: ChefHat,
    },
    {
        label: 'Filterschnellzugriff',
        description: 'Saisonale, vegetarische oder schnelle Rezepte mit einem Klick',
        icon: Sparkles,
    },
    {
        label: 'Gemeinschaft & Tipps',
        description: 'Trending Tags und Quick Tips direkt aus der Community',
        icon: Clock,
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
                        <div
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
                                    {HERO_POINTS.map((point) => (
                                        <div
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
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div
                            className={css({
                                display: 'flex',
                                justifyContent: 'center',
                            })}
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
                        </div>
                    </div>
                </div>
            </section>
        </PageShell>
    );
}
