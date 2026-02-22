'use client';

import { css } from 'styled-system/css';
import { grid } from 'styled-system/patterns';

import { SmartImage } from '../atoms/SmartImage';

interface DashboardStatCard {
    id: string;
    label: string;
    value: string | number;
    icon: string;
    color: string;
}

interface UserDashboardProps {
    userName?: string;
    userEmail?: string;
    userPhoto?: string;
    stats?: DashboardStatCard[];
}

const defaultStats: DashboardStatCard[] = [
    { id: '1', label: 'Rezepte erstellt', value: 24, icon: '📝', color: '#e07b53' },
    { id: '2', label: 'Favoriten', value: 156, icon: '❤️', color: '#fd79a8' },
    { id: '3', label: 'Gekochte Gerichte', value: 89, icon: '🍳', color: '#00b894' },
    { id: '4', label: 'Bewertungen', value: 34, icon: '⭐', color: '#f8b500' },
];

export function UserDashboard({
    userName = 'KüchenFan',
    userEmail = 'user@example.com',
    userPhoto,
    stats = defaultStats,
}: UserDashboardProps) {
    return (
        <div
            className={css({
                minH: '100vh',
                color: 'text',
                bg: '#f8f9fa',
            })}
        >
            <div
                className={css({
                    maxW: '1200px',
                    mx: 'auto',
                    px: { base: '4', md: '6' },
                    py: { base: '6', md: '10' },
                })}
            >
                <div
                    className={css({
                        mb: '8',
                    })}
                >
                    <h1
                        className={css({
                            fontSize: { base: '2xl', md: '3xl' },
                            fontWeight: '800',
                            fontFamily: 'heading',
                            color: 'text',
                        })}
                    >
                        Mein Dashboard
                    </h1>
                    <p
                        className={css({
                            color: 'text-muted',
                            mt: '1',
                        })}
                    >
                        Verwalte dein Konto und deine Einstellungen
                    </p>
                </div>

                <div
                    className={grid({
                        columns: { base: 1, md: 2, lg: 4 },
                        gap: '4',
                        mb: '8',
                    })}
                >
                    {stats.map((stat) => (
                        <div
                            key={stat.id}
                            className={css({
                                bg: 'white',
                                borderRadius: 'xl',
                                p: '5',
                                border: '1px solid',
                                borderColor: 'rgba(0,0,0,0.06)',
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
                        columns: { base: 1, lg: 3 },
                        gap: '6',
                    })}
                >
                    <div
                        className={css({
                            lg: { gridColumn: 'span 2' },
                        })}
                    >
                        <div
                            className={css({
                                bg: 'white',
                                borderRadius: '2xl',
                                overflow: 'hidden',
                                border: '1px solid',
                                borderColor: 'rgba(0,0,0,0.06)',
                                mb: '6',
                            })}
                        >
                            <div
                                className={css({
                                    bg: 'linear-gradient(135deg, #fff7f1 0%, #fffcf9 100%)',
                                    px: '6',
                                    py: '8',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6',
                                })}
                            >
                                {userPhoto ? (
                                    <SmartImage
                                        src={userPhoto}
                                        alt={userName}
                                        width={80}
                                        height={80}
                                        className={css({
                                            borderRadius: 'full',
                                            objectFit: 'cover',
                                            border: '4px solid white',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                        })}
                                    />
                                ) : (
                                    <div
                                        className={css({
                                            width: '80px',
                                            height: '80px',
                                            borderRadius: 'full',
                                            background: 'linear-gradient(135deg, #e07b53, #f8b500)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '2xl',
                                            fontWeight: '700',
                                            color: 'white',
                                            border: '4px solid white',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                        })}
                                    >
                                        {userName.slice(0, 2).toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <h2
                                        className={css({
                                            fontSize: 'xl',
                                            fontWeight: '700',
                                            color: 'text',
                                        })}
                                    >
                                        {userName}
                                    </h2>
                                    <p
                                        className={css({
                                            color: 'text-muted',
                                            fontSize: 'sm',
                                        })}
                                    >
                                        {userEmail}
                                    </p>
                                </div>
                            </div>

                            <div
                                className={css({
                                    p: '6',
                                    display: 'grid',
                                    gridTemplateColumns: { base: '1fr', sm: 'repeat(2, 1fr)' },
                                    gap: '4',
                                })}
                            >
                                <a
                                    href="/profile/edit"
                                    className={css({
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3',
                                        p: '4',
                                        borderRadius: 'xl',
                                        border: '1px solid',
                                        borderColor: 'rgba(0,0,0,0.08)',
                                        textDecoration: 'none',
                                        color: 'text',
                                        transition: 'all 150ms ease',
                                        _hover: {
                                            borderColor: '#e07b53',
                                            bg: 'rgba(224,123,83,0.03)',
                                        },
                                    })}
                                >
                                    <span
                                        className={css({
                                            fontSize: 'xl',
                                        })}
                                    >
                                        👤
                                    </span>
                                    <div>
                                        <p
                                            className={css({
                                                fontWeight: '600',
                                                fontSize: 'sm',
                                            })}
                                        >
                                            Profil bearbeiten
                                        </p>
                                        <p
                                            className={css({
                                                fontSize: 'xs',
                                                color: 'text-muted',
                                            })}
                                        >
                                            Foto, Name, Bio
                                        </p>
                                    </div>
                                </a>

                                <a
                                    href="/profile/manage"
                                    className={css({
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3',
                                        p: '4',
                                        borderRadius: 'xl',
                                        border: '1px solid',
                                        borderColor: 'rgba(0,0,0,0.08)',
                                        textDecoration: 'none',
                                        color: 'text',
                                        transition: 'all 150ms ease',
                                        _hover: {
                                            borderColor: '#e07b53',
                                            bg: 'rgba(224,123,83,0.03)',
                                        },
                                    })}
                                >
                                    <span
                                        className={css({
                                            fontSize: 'xl',
                                        })}
                                    >
                                        🔐
                                    </span>
                                    <div>
                                        <p
                                            className={css({
                                                fontWeight: '600',
                                                fontSize: 'sm',
                                            })}
                                        >
                                            Konto & Sicherheit
                                        </p>
                                        <p
                                            className={css({
                                                fontSize: 'xs',
                                                color: 'text-muted',
                                            })}
                                        >
                                            Passwort, E-Mail
                                        </p>
                                    </div>
                                </a>

                                <a
                                    href="/favorites"
                                    className={css({
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3',
                                        p: '4',
                                        borderRadius: 'xl',
                                        border: '1px solid',
                                        borderColor: 'rgba(0,0,0,0.08)',
                                        textDecoration: 'none',
                                        color: 'text',
                                        transition: 'all 150ms ease',
                                        _hover: {
                                            borderColor: '#e07b53',
                                            bg: 'rgba(224,123,83,0.03)',
                                        },
                                    })}
                                >
                                    <span
                                        className={css({
                                            fontSize: 'xl',
                                        })}
                                    >
                                        ❤️
                                    </span>
                                    <div>
                                        <p
                                            className={css({
                                                fontWeight: '600',
                                                fontSize: 'sm',
                                            })}
                                        >
                                            Meine Favoriten
                                        </p>
                                        <p
                                            className={css({
                                                fontSize: 'xs',
                                                color: 'text-muted',
                                            })}
                                        >
                                            156 gespeicherte Rezepte
                                        </p>
                                    </div>
                                </a>

                                <a
                                    href="/my-recipes"
                                    className={css({
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3',
                                        p: '4',
                                        borderRadius: 'xl',
                                        border: '1px solid',
                                        borderColor: 'rgba(0,0,0,0.08)',
                                        textDecoration: 'none',
                                        color: 'text',
                                        transition: 'all 150ms ease',
                                        _hover: {
                                            borderColor: '#e07b53',
                                            bg: 'rgba(224,123,83,0.03)',
                                        },
                                    })}
                                >
                                    <span
                                        className={css({
                                            fontSize: 'xl',
                                        })}
                                    >
                                        📖
                                    </span>
                                    <div>
                                        <p
                                            className={css({
                                                fontWeight: '600',
                                                fontSize: 'sm',
                                            })}
                                        >
                                            Meine Rezepte
                                        </p>
                                        <p
                                            className={css({
                                                fontSize: 'xs',
                                                color: 'text-muted',
                                            })}
                                        >
                                            24 eigene Rezepte
                                        </p>
                                    </div>
                                </a>
                            </div>
                        </div>

                        <div
                            className={css({
                                bg: 'white',
                                borderRadius: '2xl',
                                p: '6',
                                border: '1px solid',
                                borderColor: 'rgba(0,0,0,0.06)',
                            })}
                        >
                            <h3
                                className={css({
                                    fontSize: 'lg',
                                    fontWeight: '700',
                                    color: 'text',
                                    mb: '4',
                                })}
                            >
                                E-Mail-Einstellungen
                            </h3>
                            <div
                                className={css({
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '3',
                                })}
                            >
                                <label
                                    className={css({
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        p: '3',
                                        borderRadius: 'lg',
                                        border: '1px solid',
                                        borderColor: 'rgba(0,0,0,0.08)',
                                        cursor: 'pointer',
                                        _hover: {
                                            borderColor: 'rgba(0,0,0,0.12)',
                                        },
                                    })}
                                >
                                    <div>
                                        <p
                                            className={css({
                                                fontSize: 'sm',
                                                fontWeight: '500',
                                            })}
                                        >
                                            Neue Rezepte von anderen Kochbegeisterten
                                        </p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        defaultChecked
                                        className={css({
                                            width: '20px',
                                            height: '20px',
                                            accentColor: '#e07b53',
                                        })}
                                    />
                                </label>

                                <label
                                    className={css({
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        p: '3',
                                        borderRadius: 'lg',
                                        border: '1px solid',
                                        borderColor: 'rgba(0,0,0,0.08)',
                                        cursor: 'pointer',
                                        _hover: {
                                            borderColor: 'rgba(0,0,0,0.12)',
                                        },
                                    })}
                                >
                                    <div>
                                        <p
                                            className={css({
                                                fontSize: 'sm',
                                                fontWeight: '500',
                                            })}
                                        >
                                            Wöchentlicher Koch-Newsletter
                                        </p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        defaultChecked
                                        className={css({
                                            width: '20px',
                                            height: '20px',
                                            accentColor: '#e07b53',
                                        })}
                                    />
                                </label>

                                <label
                                    className={css({
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        p: '3',
                                        borderRadius: 'lg',
                                        border: '1px solid',
                                        borderColor: 'rgba(0,0,0,0.08)',
                                        cursor: 'pointer',
                                        _hover: {
                                            borderColor: 'rgba(0,0,0,0.12)',
                                        },
                                    })}
                                >
                                    <div>
                                        <p
                                            className={css({
                                                fontSize: 'sm',
                                                fontWeight: '500',
                                            })}
                                        >
                                            Erinnerungen an geplante Mahlzeiten
                                        </p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        className={css({
                                            width: '20px',
                                            height: '20px',
                                            accentColor: '#e07b53',
                                        })}
                                    />
                                </label>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div
                            className={css({
                                bg: 'white',
                                borderRadius: '2xl',
                                p: '6',
                                border: '1px solid',
                                borderColor: 'rgba(0,0,0,0.06)',
                                mb: '6',
                            })}
                        >
                            <h3
                                className={css({
                                    fontSize: 'lg',
                                    fontWeight: '700',
                                    color: 'text',
                                    mb: '4',
                                })}
                            >
                                Konto-Aktionen
                            </h3>
                            <div
                                className={css({
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '3',
                                })}
                            >
                                <a
                                    href="/profile/manage"
                                    className={css({
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3',
                                        p: '3',
                                        borderRadius: 'lg',
                                        bg: 'rgba(224,123,83,0.08)',
                                        textDecoration: 'none',
                                        color: 'primary',
                                        fontSize: 'sm',
                                        fontWeight: '500',
                                        transition: 'all 150ms ease',
                                        _hover: {
                                            bg: 'rgba(224,123,83,0.15)',
                                        },
                                    })}
                                >
                                    <span>⚙️</span>
                                    Einstellungen
                                </a>
                                <a
                                    href="/auth/signout"
                                    className={css({
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3',
                                        p: '3',
                                        borderRadius: 'lg',
                                        bg: 'rgba(255,118,117,0.08)',
                                        textDecoration: 'none',
                                        color: '#ff7675',
                                        fontSize: 'sm',
                                        fontWeight: '500',
                                        transition: 'all 150ms ease',
                                        _hover: {
                                            bg: 'rgba(255,118,117,0.15)',
                                        },
                                    })}
                                >
                                    <span>🚪</span>
                                    Abmelden
                                </a>
                            </div>
                        </div>

                        <div
                            className={css({
                                bg: 'white',
                                borderRadius: '2xl',
                                p: '6',
                                border: '1px solid',
                                borderColor: 'rgba(0,0,0,0.06)',
                            })}
                        >
                            <h3
                                className={css({
                                    fontSize: 'lg',
                                    fontWeight: '700',
                                    color: 'text',
                                    mb: '4',
                                })}
                            >
                                KüchenTakt Premium
                            </h3>
                            <p
                                className={css({
                                    fontSize: 'sm',
                                    color: 'text-muted',
                                    mb: '4',
                                })}
                            >
                                Schalte zusätzliche Funktionen frei
                            </p>
                            <ul
                                className={css({
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '2',
                                    mb: '4',
                                })}
                            >
                                <li
                                    className={css({
                                        fontSize: 'sm',
                                        color: 'text',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '2',
                                    })}
                                >
                                    <span>✓</span> Unbegrenzte Rezepte
                                </li>
                                <li
                                    className={css({
                                        fontSize: 'sm',
                                        color: 'text',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '2',
                                    })}
                                >
                                    <span>✓</span> Meal Planning
                                </li>
                                <li
                                    className={css({
                                        fontSize: 'sm',
                                        color: 'text',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '2',
                                    })}
                                >
                                    <span>✓</span> Einkaufslisten exportieren
                                </li>
                            </ul>
                            <button
                                className={css({
                                    width: '100%',
                                    py: '3',
                                    fontSize: 'sm',
                                    fontWeight: '600',
                                    color: 'white',
                                    background: 'linear-gradient(135deg, #e07b53, #f8b500)',
                                    border: 'none',
                                    borderRadius: 'xl',
                                    cursor: 'pointer',
                                    transition: 'all 200ms ease',
                                    _hover: {
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 4px 12px rgba(224,123,83,0.3)',
                                    },
                                })}
                            >
                                Upgrade jetzt
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
