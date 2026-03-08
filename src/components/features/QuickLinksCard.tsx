'use client';

import { Camera, Edit3, Lock, Settings, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Heading } from '@app/components/atoms/Typography';
import SignOutButton from '@app/components/auth/SignOutButton';
import { css } from 'styled-system/css';

const links = [
    { href: '/profile/edit', label: 'Profil bearbeiten', IconEl: Edit3 },
    { href: '/profile/settings', label: 'Einstellungen', IconEl: Settings },
    { href: '/profile/images', label: 'Meine Zubereitet-Bilder', IconEl: Camera },
    { href: '/auth/password/edit', label: 'Passwort ändern', IconEl: Lock },
];

export function QuickLinksCard({ userSlug }: { userSlug: string }) {
    const pathname = usePathname();

    const allLinks = [
        ...links,
        { href: `/user/${userSlug}`, label: 'Öffentliches Profil', IconEl: User },
    ];

    return (
        <div
            className={css({
                p: { base: '4', md: '5' },
                borderRadius: '2xl',
                bg: 'surface',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            })}
        >
            <Heading as="h2" size="md" className={css({ mb: '3' })}>
                Schnellzugriff
            </Heading>
            <div className={css({ display: 'flex', flexDir: 'column', gap: '1' })}>
                {allLinks.map(({ href, label, IconEl }) => {
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
                <div className={css({ pt: '1', mt: '1', borderTop: '1px solid', borderColor: 'border' })}>
                    <SignOutButton label="Abmelden" />
                </div>
            </div>
        </div>
    );
}
