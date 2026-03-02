'use client';

import { LayoutGrid, Menu, Plus, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { DropdownMenu } from 'radix-ui';

import { NotificationBell } from '@/components/notifications/NotificationBell';
import { HeaderSearch } from '@/components/search/HeaderSearch';
import { buildRecipeFilterHref } from '@/lib/recipeFilters';
import { css } from 'styled-system/css';

import { SmartImage } from '../atoms/SmartImage';

import { HeaderAuth } from './HeaderAuth';
import { MenuSection, type NavLinkItem as MenuNavLinkItem } from './HeaderMenuPanel';
import { RecipeTabs } from './RecipeTabs';
import { ThemeToggle } from './ThemeToggle';

type GeneralNavLinkItem = MenuNavLinkItem & { authOnly?: boolean };

const GENERAL_NAV_LINKS: GeneralNavLinkItem[] = [
    {
        label: 'Rezepte entdecken',
        description: 'Stöbere durch die komplette Sammlung',
        href: '/recipes',
        icon: LayoutGrid,
    },
    {
        label: 'Rezept speichern',
        description: 'Neue Idee festhalten',
        href: '/recipe/create',
        icon: Plus,
        authOnly: true,
    },
];

const QUICK_FILTERS = [
    {
        label: 'Saisonal & frisch',
        description: 'Mit Zutaten der Saison',
        href: buildRecipeFilterHref({ tags: ['Saisonal'] }),
    },
    {
        label: 'In 30 Minuten fertig',
        description: 'Perfekt für Feierabend',
        href: buildRecipeFilterHref({ maxTotalTime: 30 }),
    },
    {
        label: 'Vegetarische Highlights',
        description: 'Pflanzenbasiert & satt',
        href: buildRecipeFilterHref({ tags: ['Vegetarisch'] }),
    },
    {
        label: 'Top bewertet',
        description: '4,7 Sterne & höher',
        href: buildRecipeFilterHref({ minRating: 4.7 }),
    },
];

function HeaderNavigationMenu({ isAuthenticated }: { isAuthenticated: boolean }) {
    const availableGeneralLinks = GENERAL_NAV_LINKS.filter(
        (link) => !link.authOnly || isAuthenticated,
    ) as MenuNavLinkItem[];

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <button
                    type="button"
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2',
                        padding: '2',
                        minWidth: '44px',
                        minHeight: '44px',
                        borderRadius: 'lg',
                        border: '1px solid',
                        borderColor: 'border',
                        background: 'surface.elevated',
                        color: 'text',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        transition: 'all 150ms ease',
                        _hover: {
                            background: 'accentSoft',
                            color: 'primary',
                        },
                        _focusVisible: {
                            boxShadow: '0 0 0 3px rgba(224,123,83,0.35)',
                        },
                    })}
                >
                    <Menu size={18} />
                    <span className={css({ display: { base: 'none', sm: 'inline-flex' } })}>
                        Entdecken
                    </span>
                </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    className={css({
                        width: 'min(520px, 90vw)',
                        background: 'surface.elevated',
                        borderRadius: '2xl',
                        border: '1px solid',
                        borderColor: 'border',
                        padding: '4',
                        boxShadow: '0 40px 120px rgba(0,0,0,0.15)',
                        animation: 'scaleUp 180ms ease',
                        zIndex: 100,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4',
                        maxHeight: 'calc(100vh - 6rem)',
                        overflowY: 'auto',
                    })}
                    sideOffset={8}
                >
                    <div
                        className={css({
                            display: 'grid',
                            gridTemplateColumns: { base: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                            gap: '4',
                        })}
                    >
                        <div
                            className={css({ display: 'flex', flexDirection: 'column', gap: '4' })}
                        >
                            <MenuSection title="Seiten" items={availableGeneralLinks} />
                        </div>
                        <div
                            className={css({ display: 'flex', flexDirection: 'column', gap: '4' })}
                        >
                            <MenuSection title="Schnelle Filter" items={QUICK_FILTERS} />
                            <section>
                                <p
                                    className={css({
                                        fontSize: 'xs',
                                        fontWeight: '600',
                                        textTransform: 'uppercase',
                                        letterSpacing: 'wide',
                                        color: 'text.muted',
                                        marginBottom: '3',
                                    })}
                                >
                                    Darstellung
                                </p>
                                <div
                                    className={css({
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '2',
                                        flexWrap: 'wrap',
                                    })}
                                >
                                    <p
                                        className={css({
                                            fontSize: 'sm',
                                            color: 'text.muted',
                                            margin: 0,
                                        })}
                                    >
                                        Theme & Layout
                                    </p>
                                    <ThemeToggle />
                                </div>
                            </section>
                        </div>
                    </div>
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
}

export function Header() {
    const { status, data: session } = useSession();
    const isAuthenticated = status === 'authenticated';
    const isAdmin = Boolean(session?.user?.role === 'ADMIN');

    return (
        <header
            className={css({
                position: 'sticky',
                top: 0,
                zIndex: 20,
                background: 'surface.elevated',
                boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            })}
        >
            <div
                className={css({
                    maxWidth: '1400px',
                    marginX: 'auto',
                    width: '100%',
                    px: { base: '4', md: '6' },
                    py: '3',
                })}
            >
                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                    })}
                >
                    <Link
                        href="/"
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3',
                        })}
                    >
                        <SmartImage
                            src="/kitchenpace.png"
                            alt="KüchenTakt Logo"
                            width={100}
                            height={39}
                            className={css({ objectFit: 'contain' })}
                        />
                    </Link>

                    <div
                        className={css({
                            flex: '1 1 320px',
                            minWidth: '220px',
                        })}
                    >
                        <HeaderSearch />
                    </div>

                    <div
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2',
                        })}
                    >
                        {isAuthenticated && <NotificationBell />}
                        <HeaderNavigationMenu isAuthenticated={isAuthenticated} />
                        {isAdmin && (
                            <Link
                                href="/admin"
                                className={css({
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1',
                                    padding: '2',
                                    borderRadius: 'lg',
                                    border: '1px solid',
                                    borderColor: 'border',
                                    background: 'surface.elevated',
                                    color: 'text',
                                    fontSize: 'sm',
                                    fontWeight: '500',
                                    transition: 'all 150ms ease',
                                    _hover: {
                                        background: 'accent.soft',
                                        color: 'primary',
                                    },
                                })}
                            >
                                <ShieldCheck size={18} />
                                <span
                                    className={css({ fontSize: 'xs', textTransform: 'uppercase' })}
                                >
                                    Admin
                                </span>
                            </Link>
                        )}
                        <HeaderAuth />
                    </div>
                </div>
            </div>

            <RecipeTabs />
        </header>
    );
}
