'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { css } from 'styled-system/css';

const tabs = [
    { href: '/admin/moderation', label: 'Warteschlange' },
    { href: '/admin/moderation/reports', label: 'Meldungen' },
    { href: '/admin/moderation/ingredients', label: 'Zutaten' },
    { href: '/admin/moderation/history', label: 'Verlauf' },
];

export default function ModerationLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '6' })}>
            <header
                className={css({
                    borderRadius: '2xl',
                    borderWidth: '1px',
                    borderColor: 'border.muted',
                    background: 'surface',
                    padding: { base: '4', md: '5' },
                })}
            >
                <p
                    className={css({
                        fontSize: 'xs',
                        textTransform: 'uppercase',
                        letterSpacing: '0.4em',
                        color: 'foreground.muted',
                    })}
                >
                    Admin · Moderation
                </p>
                <h1
                    className={css({
                        fontSize: '3xl',
                        fontWeight: 'semibold',
                        color: 'foreground',
                        marginTop: '1',
                    })}
                >
                    Inhaltsprüfung
                </h1>
                <p
                    className={css({
                        marginTop: '2',
                        color: 'foreground.muted',
                    })}
                >
                    Inhalte prüfen, freigeben oder ablehnen. Meldungen bearbeiten und
                    Moderationsverlauf einsehen.
                </p>
                <nav
                    className={css({
                        display: 'flex',
                        gap: '1',
                        mt: '4',
                        borderTop: '1px solid',
                        borderColor: 'border.muted',
                        pt: '3',
                    })}
                >
                    {tabs.map((tab) => {
                        const active =
                            tab.href === '/admin/moderation'
                                ? pathname === '/admin/moderation'
                                : pathname.startsWith(tab.href);
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={css({
                                    px: '3',
                                    py: '1.5',
                                    borderRadius: 'lg',
                                    fontSize: 'sm',
                                    fontWeight: '600',
                                    color: active ? 'foreground' : 'foreground.muted',
                                    bg: active ? 'accent.soft' : 'transparent',
                                    textDecoration: 'none',
                                    transition: 'all 150ms ease',
                                    _hover: { bg: 'accent.soft', color: 'foreground' },
                                })}
                            >
                                {tab.label}
                            </Link>
                        );
                    })}
                </nav>
            </header>

            {children}
        </div>
    );
}
