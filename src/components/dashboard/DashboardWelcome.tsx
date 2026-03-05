'use client';

import { Hand } from 'lucide-react';

import { css } from 'styled-system/css';

import { SmartImage } from '../atoms/SmartImage';

interface DashboardWelcomeProps {
    userName?: string;
    userPhoto?: string;
}

const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const months = [
    'Januar',
    'Februar',
    'März',
    'April',
    'Mai',
    'Juni',
    'Juli',
    'August',
    'September',
    'Oktober',
    'November',
    'Dezember',
];

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Guten Morgen';
    if (hour < 18) return 'Guten Tag';
    return 'Guten Abend';
}

export function DashboardWelcome({ userName = 'KüchenFan', userPhoto }: DashboardWelcomeProps) {
    const now = new Date();
    const dayName = days[now.getDay()];
    const monthName = months[now.getMonth()];
    const dayNumber = now.getDate();
    const year = now.getFullYear();

    const greeting = getGreeting();

    return (
        <div
            className={css({
                background: 'surface',
                borderRadius: '2xl',
                padding: { base: '6', md: '8' },
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'rgba(224,123,83,0.15)',
            })}
        >
            <div
                className={css({
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '200px',
                    height: '200px',
                    borderRadius: 'full',
                    background: 'radial-gradient(circle, rgba(224,123,83,0.1) 0%, transparent 70%)',
                })}
            />
            <div
                className={css({
                    position: 'absolute',
                    bottom: '-30px',
                    left: '20%',
                    width: '150px',
                    height: '150px',
                    borderRadius: 'full',
                    background: 'radial-gradient(circle, rgba(248,181,0,0.1) 0%, transparent 70%)',
                })}
            />

            <div
                className={css({
                    display: 'flex',
                    flexDir: { base: 'column', md: 'row' },
                    alignItems: { base: 'flex-start', md: 'center' },
                    justifyContent: 'space-between',
                    gap: '6',
                    position: 'relative',
                    zIndex: 1,
                })}
            >
                <div>
                    <p
                        className={css({
                            fontSize: 'sm',
                            color: 'text-muted',
                            fontWeight: '500',
                            letterSpacing: 'wide',
                            mb: '1',
                        })}
                    >
                        {dayName}, {dayNumber}. {monthName} {year}
                    </p>
                    <h1
                        className={css({
                            fontSize: { base: '3xl', md: '4xl' },
                            fontWeight: '800',
                            fontFamily: 'heading',
                            color: 'text',
                            lineHeight: 'tight',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                        })}
                    >
                        {greeting}
                        <Hand size={28} color="#e07b53" />
                    </h1>
                    <p
                        className={css({
                            fontSize: 'lg',
                            color: 'text-muted',
                            mt: '2',
                            maxW: '500px',
                        })}
                    >
                        Was möchtest du heute kochen? Ich helfe dir den Überblick zu behalten.
                    </p>
                </div>

                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4',
                    })}
                >
                    <div
                        className={css({
                            display: { base: 'none', sm: 'flex' },
                            flexDir: 'column',
                            gap: '1',
                            textAlign: 'right',
                        })}
                    >
                        <span
                            className={css({
                                fontSize: 'sm',
                                color: 'text-muted',
                            })}
                        >
                            Angemeldet als
                        </span>
                        <span
                            className={css({
                                fontWeight: '600',
                                color: 'text',
                            })}
                        >
                            {userName}
                        </span>
                    </div>
                    {userPhoto ? (
                        <SmartImage
                            src={userPhoto}
                            alt={userName}
                            width={64}
                            height={64}
                            className={css({
                                borderRadius: 'full',
                                objectFit: 'cover',
                                border: '3px solid white',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            })}
                        />
                    ) : (
                        <div
                            className={css({
                                width: '64px',
                                height: '64px',
                                borderRadius: 'full',
                                background: 'linear-gradient(135deg, #e07b53, #f8b500)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 'xl',
                                fontWeight: '700',
                                color: 'white',
                                border: '3px solid white',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            })}
                        >
                            {userName.slice(0, 2).toUpperCase()}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
