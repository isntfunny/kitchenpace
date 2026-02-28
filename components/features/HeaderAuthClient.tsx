'use client';

import { LogOut, Settings, User } from 'lucide-react';
import Link from 'next/link';
import { DropdownMenu } from 'radix-ui';

import { handleSignIn, handleSignOut } from '@/components/auth/actions';
import { css } from 'styled-system/css';

import { SmartImage } from '../atoms/SmartImage';

interface HeaderAuthClientProps {
    isAuthenticated: boolean;
    profile: {
        photoUrl: string | null;
        nickname: string | null;
    } | null;
}

export function HeaderAuthClient({ isAuthenticated, profile }: HeaderAuthClientProps) {
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
                            minWidth: '180px',
                            background: 'surface.elevated',
                            borderRadius: 'xl',
                            border: '1px solid',
                            borderColor: 'rgba(224,123,83,0.2)',
                            padding: '2',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
                            zIndex: 100,
                        })}
                        sideOffset={8}
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
                                <User size={16} />
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
                                <Settings size={16} />
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
            <span>Anmelden</span>
        </button>
    );
}
