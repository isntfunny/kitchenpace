'use client';

import { LogOut, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { handleSignOut } from '@app/components/auth/actions';
import { useProfile } from '@app/components/providers/ProfileProvider';
import { useSession } from '@app/lib/auth-client';

import { css } from 'styled-system/css';

import { Avatar } from '../atoms/Avatar';
import { MobileDrawer } from '../ui/MobileDrawer';

import { PERSONAL_LINKS } from './HeaderMenuPanel';

export function MobileUserDrawer() {
    const [open, setOpen] = useState(false);
    const { data } = useSession();
    const { profile } = useProfile();

    const nickname = profile?.nickname ?? 'Nutzer';
    const email = data?.user?.email ?? '';

    return (
        <div
            className={css({
                display: { base: 'flex', md: 'none' },
                alignItems: 'center',
            })}
        >
            <button
                type="button"
                aria-label="Profil-Menü öffnen"
                onClick={() => setOpen(true)}
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
                })}
            >
                <Avatar imageKey={profile?.photoKey} name={profile?.nickname} size={36} />
            </button>

            <MobileDrawer open={open} onClose={() => setOpen(false)} direction="right">
                {/* Header */}
                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3',
                        padding: '4',
                    })}
                >
                    <Avatar imageKey={profile?.photoKey} name={profile?.nickname} size="md" />
                    <div className={css({ flex: 1, minWidth: 0 })}>
                        <p
                            className={css({
                                fontSize: 'sm',
                                fontWeight: '700',
                                color: 'text',
                                truncate: true,
                            })}
                        >
                            {nickname}
                        </p>
                        {email && (
                            <p
                                className={css({
                                    fontSize: 'xs',
                                    color: 'text.muted',
                                    truncate: true,
                                })}
                            >
                                {email}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        aria-label="Menü schließen"
                        onClick={() => setOpen(false)}
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '36px',
                            height: '36px',
                            borderRadius: 'lg',
                            cursor: 'pointer',
                            color: 'text.muted',
                            transition: 'all 150ms ease',
                            flexShrink: 0,
                            _hover: {
                                background: 'accent.soft',
                                color: 'text',
                            },
                        })}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Links */}
                <nav className={css({ flex: 1, padding: '3', overflowY: 'auto' })}>
                    <ul
                        className={css({
                            listStyle: 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1',
                        })}
                    >
                        {PERSONAL_LINKS.map((item) => {
                            const Icon = item.icon;
                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        onClick={() => setOpen(false)}
                                        className={css({
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '3',
                                            minHeight: '48px',
                                            padding: '2',
                                            borderRadius: 'lg',
                                            textDecoration: 'none',
                                            color: 'text',
                                            transition: 'background 150ms ease',
                                            _hover: {
                                                background: 'accent.soft',
                                            },
                                        })}
                                    >
                                        {Icon && (
                                            <span
                                                className={css({
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: '32px',
                                                    height: '32px',
                                                    borderRadius: 'lg',
                                                    background: 'accent.soft',
                                                    color: 'primary',
                                                    flexShrink: 0,
                                                })}
                                            >
                                                <Icon size={16} />
                                            </span>
                                        )}
                                        <div>
                                            <p
                                                className={css({
                                                    fontSize: '14px',
                                                    fontWeight: '600',
                                                    lineHeight: '1.3',
                                                })}
                                            >
                                                {item.label}
                                            </p>
                                            <p
                                                className={css({
                                                    fontSize: '12px',
                                                    color: 'text.muted',
                                                    lineHeight: '1.3',
                                                })}
                                            >
                                                {item.description}
                                            </p>
                                        </div>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* Footer — Sign out */}
                <div
                    className={css({
                        padding: '3',
                    })}
                >
                    <button
                        type="button"
                        onClick={() => {
                            setOpen(false);
                            handleSignOut();
                        }}
                        className={css({
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '2',
                            padding: '3',
                            borderRadius: 'lg',
                            border: 'none',
                            background: 'transparent',
                            fontSize: 'sm',
                            fontWeight: '600',
                            color: 'status.error',
                            cursor: 'pointer',
                            transition: 'background 150ms ease',
                            _hover: {
                                background: {
                                    base: 'rgba(255,107,107,0.08)',
                                    _dark: 'rgba(255,107,107,0.12)',
                                },
                            },
                        })}
                    >
                        <LogOut size={16} />
                        <span>Abmelden</span>
                    </button>
                </div>
            </MobileDrawer>
        </div>
    );
}
