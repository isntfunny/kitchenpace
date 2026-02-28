'use client';

import { Key, LogOut } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { DropdownMenu } from 'radix-ui';
import { useEffect } from 'react';

import { handleSignIn, handleSignOut } from '@/components/auth/actions';
import { useProfile } from '@/components/providers/ProfileProvider';
import { css } from 'styled-system/css';

import { SmartImage } from '../atoms/SmartImage';

import { MenuSection, PERSONAL_LINKS } from './HeaderMenuPanel';

export function HeaderAuth() {
    const { data: session, status } = useSession();
    const { profile } = useProfile();

    const authDebugEnabled =
        process.env.NEXT_PUBLIC_AUTH_DEBUG === '1' || process.env.NODE_ENV !== 'production';

    useEffect(() => {
        if (!authDebugEnabled) return;
        console.debug('[auth][HeaderAuth] session status changed', {
            status,
            userId: session?.user?.id ?? null,
        });
    }, [status, session?.user?.id, authDebugEnabled]);

    const isAuthenticated = status === 'authenticated' && Boolean(session?.user?.id);
    const isLoading = status === 'loading';

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
                            minWidth: '240px',
                            background: 'surface.elevated',
                            borderRadius: '2xl',
                            border: '1px solid',
                            borderColor: 'border',
                            padding: '3',
                            boxShadow: '0 30px 80px rgba(0,0,0,0.14)',
                            zIndex: 100,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4',
                        })}
                        sideOffset={8}
                        align="end"
                    >
                        <MenuSection title="Für dich" items={PERSONAL_LINKS} />
                        <DropdownMenu.Separator
                            className={css({ height: '1px', background: 'border', marginY: '2' })}
                        />
                        <DropdownMenu.Item asChild>
                            <button
                                onClick={() => handleSignOut()}
                                className={css({
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '2',
                                    padding: '3',
                                    borderRadius: 'xl',
                                    border: '1px solid',
                                    borderColor: 'border.muted',
                                    background: 'surface',
                                    fontSize: 'sm',
                                    fontWeight: '600',
                                    color: 'red.500',
                                    cursor: 'pointer',
                                    transition: 'all 150ms ease',
                                    _hover: {
                                        borderColor: 'red.500',
                                        boxShadow: '0 10px 30px rgba(224,123,83,0.25)',
                                    },
                                })}
                            >
                                <LogOut size={16} />
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
            <Key size={16} />
            <span className={css({ display: { base: 'none', md: 'inline-flex' } })}>Anmelden</span>
        </button>
    );
}
