'use client';

import { Bookmark, ChefHat, FileText, Star } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { PALETTE } from '@app/lib/palette';
import { css } from 'styled-system/css';
import { grid } from 'styled-system/patterns';

import { SmartImage } from '../atoms/SmartImage';

interface DashboardStatCard {
    id: string;
    label: string;
    value: string | number;
    icon: ReactNode;
    color: string;
}

interface DraftRecipe {
    id: string;
    title: string;
    slug: string;
    imageKey: string | null;
    createdAt: Date;
    updatedAt: Date;
}

interface UserDashboardProps {
    userName?: string;
    userEmail?: string;
    userPhoto?: string;
    stats?: DashboardStatCard[];
    draftRecipes?: DraftRecipe[];
}

const defaultStats: DashboardStatCard[] = [
    {
        id: '1',
        label: 'Rezepte erstellt',
        value: 24,
        icon: <FileText size={20} />,
        color: PALETTE.orange,
    },
    { id: '2', label: 'Favoriten', value: 156, icon: <Bookmark size={20} />, color: PALETTE.pink },
    {
        id: '3',
        label: 'Zubereitete Gerichte',
        value: 89,
        icon: <ChefHat size={20} />,
        color: PALETTE.emerald,
    },
    { id: '4', label: 'Bewertungen', value: 34, icon: <Star size={20} />, color: PALETTE.gold },
];

export function UserDashboard({
    userName = 'KüchenFan',
    userEmail = 'user@example.com',
    userPhoto,
    stats = defaultStats,
    draftRecipes = [],
}: UserDashboardProps) {
    return (
        <section
            className={css({
                paddingY: { base: '8', md: '10' },
                fontFamily: 'body',
            })}
        >
            <div className={css({ maxW: '5xl', margin: '0 auto' })}>
                <div
                    className={css({
                        background: 'surface.elevated',
                        borderRadius: '3xl',
                        boxShadow: 'shadow.large',
                        padding: { base: '8', md: '14' },
                        mb: '8',
                    })}
                >
                    <div
                        className={css({
                            display: 'flex',
                            flexDir: { base: 'column', md: 'row' },
                            gap: '8',
                            alignItems: { base: 'flex-start', md: 'center' },
                        })}
                    >
                        <div>
                            {userPhoto ? (
                                <SmartImage
                                    src={userPhoto}
                                    alt={userName}
                                    width={120}
                                    height={120}
                                    className={css({
                                        borderRadius: 'full',
                                        objectFit: 'cover',
                                        border: {
                                            base: '4px solid #fff7f1',
                                            _dark: '4px solid #2d333b',
                                        },
                                        boxShadow: 'shadow.medium',
                                    })}
                                />
                            ) : (
                                <div
                                    className={css({
                                        width: '120px',
                                        height: '120px',
                                        borderRadius: 'full',
                                        background: {
                                            base: 'linear-gradient(135deg, #ffe5d1, #ffc89e)',
                                            _dark: 'linear-gradient(135deg, #5a3d2d, #7a5038)',
                                        },
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '3xl',
                                        fontWeight: '700',
                                        border: {
                                            base: '4px solid #fff7f1',
                                            _dark: '4px solid #2d333b',
                                        },
                                        boxShadow: 'shadow.medium',
                                    })}
                                >
                                    {userName.slice(0, 2).toUpperCase()}
                                </div>
                            )}
                        </div>

                        <div className={css({ flex: 1 })}>
                            <p
                                className={css({
                                    color: 'text-muted',
                                    letterSpacing: 'widest',
                                    mb: '1',
                                })}
                            >
                                Willkommen zurück
                            </p>
                            <h1 className={css({ fontSize: '3xl', fontWeight: '800', mb: '2' })}>
                                {userName}
                            </h1>
                            <p className={css({ color: 'text-muted' })}>{userEmail}</p>
                        </div>

                        <Link
                            href="/profile"
                            className={css({
                                padding: '3',
                                borderRadius: 'xl',
                                background: 'accent.soft',
                                color: 'primary',
                                fontWeight: '600',
                                textDecoration: 'none',
                                transition: 'all 150ms ease',
                                _hover: {
                                    background: 'accent.soft',
                                },
                            })}
                        >
                            Zum Profil →
                        </Link>
                    </div>
                </div>

                <div
                    className={grid({
                        columns: { base: 2, md: 4 },
                        gap: '4',
                        mb: '8',
                    })}
                >
                    {stats.map((stat) => (
                        <div
                            key={stat.id}
                            className={css({
                                bg: 'surface.elevated',
                                borderRadius: '2xl',
                                p: '5',
                                boxShadow: 'shadow.medium',
                            })}
                        >
                            <div
                                className={css({
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3',
                                })}
                            >
                                <div
                                    className={css({
                                        width: '44px',
                                        height: '44px',
                                        borderRadius: 'lg',
                                        background: `${stat.color}15`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 'xl',
                                    })}
                                >
                                    {stat.icon}
                                </div>
                                <div>
                                    <p
                                        className={css({
                                            fontSize: '2xl',
                                            fontWeight: '700',
                                            color: 'text',
                                        })}
                                    >
                                        {stat.value}
                                    </p>
                                    <p
                                        className={css({
                                            fontSize: 'sm',
                                            color: 'text-muted',
                                        })}
                                    >
                                        {stat.label}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div
                    className={grid({
                        columns: { base: 1, md: 2 },
                        gap: '6',
                    })}
                >
                    <Link
                        href="/profile/edit"
                        className={css({
                            borderRadius: '2xl',
                            padding: '6',
                            border: '1px solid rgba(224,123,83,0.3)',
                            background: 'surface.elevated',
                            textDecoration: 'none',
                            color: 'inherit',
                            boxShadow: 'shadow.small',
                            transition: 'transform 150ms ease, box-shadow 150ms ease',
                            _hover: {
                                transform: 'translateY(-2px)',
                                borderColor: 'palette.orange',
                                boxShadow: {
                                    base: '0 12px 40px rgba(224,123,83,0.15)',
                                    _dark: '0 12px 40px rgba(224,123,83,0.12)',
                                },
                            },
                        })}
                    >
                        <h2 className={css({ fontSize: 'xl', fontWeight: '700', mb: '2' })}>
                            Profil bearbeiten
                        </h2>
                        <p className={css({ color: 'text-muted' })}>
                            Foto, Nickname oder Teaser aktualisieren.
                        </p>
                    </Link>

                    <Link
                        href="/profile/settings"
                        className={css({
                            borderRadius: '2xl',
                            padding: '6',
                            border: '1px solid rgba(224,123,83,0.3)',
                            background: 'surface.elevated',
                            textDecoration: 'none',
                            color: 'inherit',
                            boxShadow: 'shadow.small',
                            transition: 'transform 150ms ease, box-shadow 150ms ease',
                            _hover: {
                                transform: 'translateY(-2px)',
                                borderColor: 'palette.orange',
                                boxShadow: {
                                    base: '0 12px 40px rgba(224,123,83,0.15)',
                                    _dark: '0 12px 40px rgba(224,123,83,0.12)',
                                },
                            },
                        })}
                    >
                        <h2 className={css({ fontSize: 'xl', fontWeight: '700', mb: '2' })}>
                            Konto & Einstellungen
                        </h2>
                        <p className={css({ color: 'text-muted' })}>
                            Passwort, E-Mail-Einstellungen und mehr.
                        </p>
                    </Link>

                    <Link
                        href="/profile/favorites"
                        className={css({
                            borderRadius: '2xl',
                            padding: '6',
                            border: '1px solid rgba(224,123,83,0.3)',
                            background: 'surface.elevated',
                            textDecoration: 'none',
                            color: 'inherit',
                            boxShadow: 'shadow.small',
                            transition: 'transform 150ms ease, box-shadow 150ms ease',
                            _hover: {
                                transform: 'translateY(-2px)',
                                borderColor: 'palette.orange',
                                boxShadow: {
                                    base: '0 12px 40px rgba(224,123,83,0.15)',
                                    _dark: '0 12px 40px rgba(224,123,83,0.12)',
                                },
                            },
                        })}
                    >
                        <h2 className={css({ fontSize: 'xl', fontWeight: '700', mb: '2' })}>
                            Meine Favoriten
                        </h2>
                        <p className={css({ color: 'text-muted' })}>
                            {stats[1].value} gespeicherte Rezepte
                        </p>
                    </Link>

                    <Link
                        href="/profile/recipes"
                        className={css({
                            borderRadius: '2xl',
                            padding: '6',
                            border: '1px solid rgba(224,123,83,0.3)',
                            background: 'surface.elevated',
                            textDecoration: 'none',
                            color: 'inherit',
                            boxShadow: 'shadow.small',
                            transition: 'transform 150ms ease, box-shadow 150ms ease',
                            _hover: {
                                transform: 'translateY(-2px)',
                                borderColor: 'palette.orange',
                                boxShadow: {
                                    base: '0 12px 40px rgba(224,123,83,0.15)',
                                    _dark: '0 12px 40px rgba(224,123,83,0.12)',
                                },
                            },
                        })}
                    >
                        <h2 className={css({ fontSize: 'xl', fontWeight: '700', mb: '2' })}>
                            Meine Rezepte
                        </h2>
                        <p className={css({ color: 'text-muted' })}>
                            {stats[0].value} eigene Rezepte
                        </p>
                    </Link>
                </div>

                {draftRecipes.length > 0 && (
                    <div
                        className={css({
                            mt: '8',
                        })}
                    >
                        <h2
                            className={css({
                                fontSize: 'xl',
                                fontWeight: '700',
                                mb: '4',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2',
                            })}
                        >
                            <span
                                className={css({
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: 'full',
                                    background: 'palette.purple',
                                })}
                            />
                            Deine Entwürfe
                        </h2>
                        <div
                            className={css({
                                display: 'grid',
                                gridTemplateColumns: {
                                    base: '1fr',
                                    sm: 'repeat(2, 1fr)',
                                    md: 'repeat(3, 1fr)',
                                },
                                gap: '4',
                            })}
                        >
                            {draftRecipes.map((draft) => (
                                <Link
                                    key={draft.id}
                                    href={`/recipe/${draft.id}`}
                                    className={css({
                                        borderRadius: 'xl',
                                        padding: '4',
                                        border: '1px solid rgba(108,92,231,0.3)',
                                        background: 'rgba(108,92,231,0.05)',
                                        textDecoration: 'none',
                                        color: 'inherit',
                                        transition: 'all 150ms ease',
                                        _hover: {
                                            transform: 'translateY(-2px)',
                                            borderColor: 'palette.purple',
                                            background: 'rgba(108,92,231,0.1)',
                                        },
                                    })}
                                >
                                    <p
                                        className={css({
                                            fontWeight: '600',
                                            mb: '1',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        })}
                                    >
                                        {draft.title}
                                    </p>
                                    <p
                                        className={css({
                                            fontSize: 'sm',
                                            color: 'text-muted',
                                        })}
                                    >
                                        Entwurf
                                    </p>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
