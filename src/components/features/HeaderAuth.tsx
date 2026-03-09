'use client';

import { Key, LogOut } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { DropdownMenu } from 'radix-ui';
import { useEffect } from 'react';

import { handleSignIn, handleSignOut } from '@app/components/auth/actions';
import { useNotifications } from '@app/components/notifications/useNotifications';
import { useProfile } from '@app/components/providers/ProfileProvider';
import { PALETTE } from '@app/lib/palette';
import { css } from 'styled-system/css';

import { SmartImage } from '../atoms/SmartImage';

import { MenuSection, PERSONAL_LINKS } from './HeaderMenuPanel';

export function HeaderAuth() {
    const { data: session, status } = useSession();
    const { profile } = useProfile();
    const isAuthenticated = status === 'authenticated' && Boolean(session?.user?.id);
    const isLoading = status === 'loading';
    const { unreadCount } = useNotifications({ enabled: isAuthenticated });

    const authDebugEnabled =
        process.env.NEXT_PUBLIC_AUTH_DEBUG === '1' || process.env.NODE_ENV !== 'production';

    useEffect(() => {
        if (!authDebugEnabled) return;
        console.debug('[auth][HeaderAuth] session status changed', {
            status,
            userId: session?.user?.id ?? null,
        });
    }, [status, session?.user?.id, authDebugEnabled]);

    const badgeContent = unreadCount > 9 ? '9+' : unreadCount;

    if (isLoading) {
        return (
            <div
                className={css({
                    width: '44px',
                    height: '44px',
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
                        borderColor: { base: 'rgba(224,123,83,0.3)', _dark: 'rgba(224,123,83,0.35)' },
                        borderTopColor: 'palette.orange',
                        animation: 'spin 1s linear infinite',
                    })}
                />
            </div>
        );
    }

    if (isAuthenticated) {
        const avatar = (
            <div className={css({ position: 'relative' })}>
                {profile?.photoUrl ? (
                    <SmartImage
                        src={profile.photoUrl}
                        alt={profile.nickname || 'Profil'}
                        width={36}
                        height={36}
                        className={css({
                            borderRadius: '50%',
                            objectFit: 'cover',
                        })}
                    />
                ) : (
                    <div
                        className={css({
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: `linear-gradient(135deg, ${PALETTE.orange} 0%, ${PALETTE.gold} 100%)`,
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
                {unreadCount > 0 && (
                    <Link
                        href="/notifications"
                        onClick={(e) => e.stopPropagation()}
                        className={css({
                            position: 'absolute',
                            top: '-6px',
                            right: '-8px',
                            minWidth: '20px',
                            height: '20px',
                            borderRadius: 'full',
                            background: 'status.danger',
                            color: 'white',
                            fontSize: '0.65rem',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            px: '1',
                            lineHeight: '1',
                            border: '2px solid',
                            borderColor: 'surface.elevated',
                            textDecoration: 'none',
                            zIndex: 1,
                        })}
                    >
                        <motion.span
                            animate={{ scale: [1, 1.15, 1] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            {badgeContent}
                        </motion.span>
                    </Link>
                )}
            </div>
        );

        return (
            <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                    <button
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '44px',
                            height: '44px',
                            padding: '0',
                            borderRadius: 'full',
                            border: '1px solid',
                            borderColor: 'border',
                            background: 'surface.elevated',
                            cursor: 'pointer',
                            transition: 'all 150ms ease',
                            _hover: {
                                background: 'transparent',
                                borderColor: 'primary',
                            },
                            _focusVisible: {
                                boxShadow: { base: '0 0 0 3px rgba(224,123,83,0.35)', _dark: '0 0 0 3px rgba(224,123,83,0.4)' },
                            },
                        })}
                    >
                        {avatar}
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
                            boxShadow: { base: '0 30px 80px rgba(0,0,0,0.14)', _dark: '0 30px 80px rgba(0,0,0,0.5)' },
                            zIndex: 100,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4',
                            transformOrigin: 'var(--radix-dropdown-menu-content-transform-origin)',
                            '&[data-state="open"]': {
                                animation: 'scaleUp 200ms ease',
                            },
                            '&[data-state="closed"]': {
                                animation: 'scaleDown 150ms ease',
                            },
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
                                        boxShadow: { base: '0 10px 30px rgba(224,123,83,0.25)', _dark: '0 10px 30px rgba(224,123,83,0.3)' },
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '44px',
                height: '44px',
                padding: '0',
                borderRadius: 'full',
                border: '1px solid',
                borderColor: 'border',
                background: `linear-gradient(135deg, ${PALETTE.orange} 0%, ${PALETTE.gold} 100%)`,
                color: 'white',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                _hover: {
                    borderColor: 'primary',
                    boxShadow: { base: '0 4px 12px rgba(224,123,83,0.3)', _dark: '0 4px 12px rgba(224,123,83,0.35)' },
                },
            })}
        >
            <Key size={18} />
        </button>
    );
}
