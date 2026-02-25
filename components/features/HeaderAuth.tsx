'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';

import { handleSignIn, handleSignOut } from '@/components/auth/actions';
import { css } from 'styled-system/css';

import { SmartImage } from '../atoms/SmartImage';

interface Profile {
    photoUrl: string | null;
    nickname: string | null;
}

export function HeaderAuth() {
    const { data: session, status } = useSession();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const signOutTriggeredRef = useRef(false);

    const authDebugEnabled =
        process.env.NEXT_PUBLIC_AUTH_DEBUG === '1' || process.env.NODE_ENV !== 'production';

    useEffect(() => {
        if (!authDebugEnabled) return;
        console.debug('[auth][HeaderAuth] session status changed', {
            status,
            userId: session?.user?.id ?? null,
        });
    }, [status, session?.user?.id, authDebugEnabled]);

    useEffect(() => {
        if (!session?.user?.id) {
            if (authDebugEnabled) {
                console.debug('[auth][HeaderAuth] session missing, clearing profile');
            }
            setProfile(null);
            setProfileLoading(false);
            signOutTriggeredRef.current = false;
            return;
        }

        if (session?.user?.id) {
            signOutTriggeredRef.current = false;
            setProfileLoading(true);
            const controller = new AbortController();

            const loadProfile = async () => {
                try {
                    if (authDebugEnabled) {
                        console.debug('[auth][HeaderAuth] fetching /api/auth/profile');
                    }

                    const response = await fetch('/api/auth/profile', {
                        method: 'GET',
                        cache: 'no-store',
                        credentials: 'same-origin',
                        signal: controller.signal,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        if (authDebugEnabled) {
                            console.warn('[auth][HeaderAuth] profile fetch failed', {
                                status: response.status,
                                body: data,
                            });
                        }
                        setProfile(null);
                        return;
                    }

                    if (data.needsSignOut) {
                        if (authDebugEnabled) {
                            console.warn('[auth][HeaderAuth] server requested sign-out', data);
                        }

                        if (!signOutTriggeredRef.current) {
                            signOutTriggeredRef.current = true;
                            handleSignOut();
                        }
                        return;
                    }

                    setProfile(data.profile);

                    if (authDebugEnabled) {
                        console.debug('[auth][HeaderAuth] profile loaded', data.profile);
                    }
                } catch (error) {
                    if (controller.signal.aborted) {
                        return;
                    }

                    if (authDebugEnabled) {
                        console.error('[auth][HeaderAuth] profile fetch error', error);
                    }
                    setProfile(null);
                } finally {
                    setProfileLoading(false);
                }
            };

            void loadProfile();

            return () => {
                controller.abort();
            };
        }
    }, [session?.user?.id, authDebugEnabled]);

    const isAuthenticated = status === 'authenticated' && Boolean(session?.user?.id);
    const isLoading = status === 'loading' || profileLoading;

    if (isLoading) {
        return (
            <div
                className={css({
                    width: '100px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                })}
            >
                <div
                    className={css({
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        border: '2px solid',
                        borderColor: 'rgba(224,123,83,0.3)',
                        borderTopColor: '#e07b53',
                        animation: 'spin 1s linear infinite',
                    })}
                />
            </div>
        );
    }

    if (isAuthenticated) {
        return (
            <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                    <button
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2',
                            px: '2',
                            py: '1',
                            borderRadius: 'full',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 150ms ease',
                            _hover: {
                                bg: 'rgba(224,123,83,0.08)',
                            },
                        })}
                    >
                        {profile?.photoUrl ? (
                            <SmartImage
                                src={profile.photoUrl}
                                alt={profile.nickname || 'Profil'}
                                width={32}
                                height={32}
                                className={css({
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                })}
                            />
                        ) : (
                            <div
                                className={css({
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #e07b53 0%, #f8b500 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: 'sm',
                                    fontWeight: '600',
                                })}
                            >
                                {(profile?.nickname || 'U').charAt(0).toUpperCase()}
                            </div>
                        )}
                    </button>
                </DropdownMenu.Trigger>

                <DropdownMenu.Portal>
                    <DropdownMenu.Content
                        className={css({
                            minWidth: '200px',
                            background: 'white',
                            borderRadius: 'xl',
                            border: '1px solid',
                            borderColor: 'rgba(224,123,83,0.2)',
                            padding: '2',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
                            zIndex: 100,
                        })}
                        sideOffset={8}
                        align="end"
                    >
                        <DropdownMenu.Item asChild>
                            <Link
                                href="/profile"
                                className={css({
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '2',
                                    padding: '3',
                                    borderRadius: 'lg',
                                    fontSize: 'sm',
                                    fontFamily: 'body',
                                    color: 'text',
                                    textDecoration: 'none',
                                    outline: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 150ms ease',
                                    _hover: {
                                        background: 'rgba(224,123,83,0.08)',
                                    },
                                })}
                            >
                                <span>👤</span>
                                <span>Mein Profil</span>
                            </Link>
                        </DropdownMenu.Item>

                        <DropdownMenu.Item asChild>
                            <Link
                                href="/profile/manage"
                                className={css({
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '2',
                                    padding: '3',
                                    borderRadius: 'lg',
                                    fontSize: 'sm',
                                    fontFamily: 'body',
                                    color: 'text',
                                    textDecoration: 'none',
                                    outline: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 150ms ease',
                                    _hover: {
                                        background: 'rgba(224,123,83,0.08)',
                                    },
                                })}
                            >
                                <span>⚙️</span>
                                <span>Einstellungen</span>
                            </Link>
                        </DropdownMenu.Item>

                        <DropdownMenu.Separator
                            className={css({
                                height: '1px',
                                background: 'rgba(224,123,83,0.2)',
                                margin: '2',
                            })}
                        />

                        <DropdownMenu.Item asChild>
                            <button
                                onClick={() => handleSignOut()}
                                className={css({
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '2',
                                    padding: '3',
                                    borderRadius: 'lg',
                                    fontSize: 'sm',
                                    fontFamily: 'body',
                                    color: 'red.500',
                                    textDecoration: 'none',
                                    outline: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 150ms ease',
                                    width: '100%',
                                    border: 'none',
                                    background: 'transparent',
                                    _hover: {
                                        background: 'rgba(224,123,83,0.08)',
                                    },
                                })}
                            >
                                <span>🚪</span>
                                <span>Abmelden</span>
                            </button>
                        </DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>
        );
    }

    return (
        <button
            onClick={() => handleSignIn()}
            className={css({
                fontFamily: 'body',
                fontSize: 'sm',
                fontWeight: '600',
                color: 'white',
                px: '4',
                py: '2',
                borderRadius: 'lg',
                background: 'linear-gradient(135deg, #e07b53 0%, #f8b500 100%)',
                display: 'flex',
                alignItems: 'center',
                gap: '1.5',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                _hover: {
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(224,123,83,0.3)',
                },
            })}
        >
            <span>🔑</span>
            <span className={css({ display: { base: 'none', md: 'inline' } })}>Anmelden</span>
        </button>
    );
}
