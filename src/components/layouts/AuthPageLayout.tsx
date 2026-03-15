import { Camera, ChefHat, Pin, Star } from 'lucide-react';
import { ReactNode } from 'react';

import { PALETTE } from '@app/lib/palette';

import { css } from 'styled-system/css';

import { FormPanelAnimation, HeroFloatingIcons, HeroPointCard } from './AuthHeroAnimations';
import { PageShell } from './PageShell';

const HERO_POINTS = [
    {
        label: 'Eigene Rezepte erstellen',
        description:
            'Erstelle Rezepte als visuelle Flow-Diagramme — mit parallelen Schritten, Timings und eigenen Fotos.',
        Icon: ChefHat,
    },
    {
        label: 'Rezepte anpinnen & organisieren',
        description:
            'Pinne deine Lieblingsrezepte an und hab sie immer griffbereit — dein persönliches Kochbuch.',
        Icon: Pin,
    },
    {
        label: 'Favoriten & Sammlungen',
        description: 'Favorisiere Rezepte anderer Köche und finde sie jederzeit wieder.',
        Icon: Star,
    },
    {
        label: 'Fotos hochladen',
        description: 'Zeig deine Kreationen! Lade eigene Fotos zu jedem Rezeptschritt hoch.',
        Icon: Camera,
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
                        {/* Hero panel */}
                        <div
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
                        >
                            <HeroFloatingIcons />

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
                                        color: 'rgba(255,246,236,0.85)',
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
                                        <HeroPointCard key={point.label} index={index}>
                                            <div
                                                className={css({
                                                    width: '9',
                                                    height: '9',
                                                    borderRadius: 'full',
                                                    background: 'rgba(255,246,236,0.25)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0,
                                                })}
                                            >
                                                <point.Icon size={18} color="#fff6ec" />
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
                                                        color: 'rgba(255,246,236,0.95)',
                                                        margin: 0,
                                                        lineHeight: '1.5',
                                                    })}
                                                >
                                                    {point.description}
                                                </p>
                                            </div>
                                        </HeroPointCard>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Form panel */}
                        <div
                            className={css({
                                background: 'surface.elevated',
                                order: { base: 1, lg: 2 },
                            })}
                        >
                            <FormPanelAnimation>
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
                            </FormPanelAnimation>
                        </div>
                    </div>
                </div>
            </section>
        </PageShell>
    );
}
