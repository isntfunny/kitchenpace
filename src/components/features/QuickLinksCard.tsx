'use client';

import { Bell, Camera, Edit3, Settings, Shield } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Heading } from '@app/components/atoms/Typography';
import SignOutButton from '@app/components/auth/SignOutButton';

import { css } from 'styled-system/css';

const links = [
    { href: '/profile/edit', label: 'Profil bearbeiten', IconEl: Edit3 },
    { href: '/profile/account', label: 'Konto & Sicherheit', IconEl: Shield },
    { href: '/profile/settings', label: 'Privatsphäre', IconEl: Settings },
    { href: '/notifications', label: 'Benachrichtigungen', IconEl: Bell },
    { href: '/profile/images', label: 'Meine Zubereitet-Bilder', IconEl: Camera },
];

export function QuickLinksCard({ userSlug: _userSlug }: { userSlug?: string }) {
    const pathname = usePathname();

    return (
        <div
            className={css({
                p: { base: '4', md: '5' },
                borderRadius: 'surface',
                bg: 'surface',
                boxShadow: 'shadow.medium',
            })}
        >
            <Heading as="h2" size="md" className={css({ mb: '3' })}>
                Schnellzugriff
            </Heading>
            <div className={css({ display: 'flex', flexDir: 'column', gap: '1' })}>
                {links.map(({ href, label, IconEl }) => {
                    const isActive = pathname === href;
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3',
                                px: '3',
                                py: '2',
                                borderRadius: 'lg',
                                textDecoration: 'none',
                                color: isActive ? 'white' : 'text',
                                bg: isActive ? 'primary' : 'transparent',
                                fontSize: 'sm',
                                fontWeight: '500',
                                transition: 'all 150ms ease',
                                _hover: { bg: 'primary', color: 'white' },
                            })}
                        >
                            <IconEl size={16} />
                            {label}
                        </Link>
                    );
                })}
                <div
                    className={css({
                        pt: '3',
                        mt: '5',
                        borderTop: '1px solid',
                        borderColor: 'border',
                    })}
                >
                    <SignOutButton label="Abmelden" />
                </div>
            </div>
        </div>
    );
}
