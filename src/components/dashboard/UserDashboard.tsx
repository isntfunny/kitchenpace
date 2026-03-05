'use client';

import { ChefHat, FileText, Heart, Star } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

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
    imageUrl: string | null;
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
        color: '#e07b53',
    },
    { id: '2', label: 'Favoriten', value: 156, icon: <Heart size={20} />, color: '#fd79a8' },
    {
        id: '3',
        label: 'Gekochte Gerichte',
        value: 89,
        icon: <ChefHat size={20} />,
        color: '#00b894',
    },
    { id: '4', label: 'Bewertungen', value: 34, icon: <Star size={20} />, color: '#f8b500' },
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
                        boxShadow: '0 40px 120px rgba(224,123,83,0.25)',
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
                                        border: '4px solid #fff7f1',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                    })}
                                />
                            ) : (
                                <div
                                    className={css({
                                        width: '120px',
                                        height: '120px',
                                        borderRadius: 'full',
                                        background: 'linear-gradient(135deg, #ffe5d1, #ffc89e)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '3xl',
                                        fontWeight: '700',
                                        border: '4px solid #fff7f1',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
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
                                background: 'rgba(224,123,83,0.1)',
                                color: 'primary',
                                fontWeight: '600',
                                textDecoration: 'none',
                                transition: 'all 150ms ease',
                                _hover: {
                                    background: 'rgba(224,123,83,0.2)',
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
                                boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
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
                            boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
                            transition: 'transform 150ms ease, box-shadow 150ms ease',
                            _hover: {
                                transform: 'translateY(-2px)',
                                borderColor: '#e07b53',
                                boxShadow: '0 12px 40px rgba(224,123,83,0.15)',
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
                        href="/profile/manage"
                        className={css({
                            borderRadius: '2xl',
                            padding: '6',
                            border: '1px solid rgba(224,123,83,0.3)',
                            background: 'surface.elevated',
                            textDecoration: 'none',
                            color: 'inherit',
                            boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
                            transition: 'transform 150ms ease, box-shadow 150ms ease',
                            _hover: {
                                transform: 'translateY(-2px)',
                                borderColor: '#e07b53',
                                boxShadow: '0 12px 40px rgba(224,123,83,0.15)',
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
                        href="/favorites"
                        className={css({
                            borderRadius: '2xl',
                            padding: '6',
                            border: '1px solid rgba(224,123,83,0.3)',
                            background: 'surface.elevated',
                            textDecoration: 'none',
                            color: 'inherit',
                            boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
                            transition: 'transform 150ms ease, box-shadow 150ms ease',
                            _hover: {
                                transform: 'translateY(-2px)',
                                borderColor: '#e07b53',
                                boxShadow: '0 12px 40px rgba(224,123,83,0.15)',
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
                        href="/my-recipes"
                        className={css({
                            borderRadius: '2xl',
                            padding: '6',
                            border: '1px solid rgba(224,123,83,0.3)',
                            background: 'surface.elevated',
                            textDecoration: 'none',
                            color: 'inherit',
                            boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
                            transition: 'transform 150ms ease, box-shadow 150ms ease',
                            _hover: {
                                transform: 'translateY(-2px)',
                                borderColor: '#e07b53',
                                boxShadow: '0 12px 40px rgba(224,123,83,0.15)',
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
                                    background: '#6c5ce7',
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
                                            borderColor: '#6c5ce7',
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
