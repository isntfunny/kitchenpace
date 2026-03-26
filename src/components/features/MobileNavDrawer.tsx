'use client';

import {
    Clock,
    LayoutGrid,
    Leaf,
    Menu,
    Plus,
    Salad,
    Shield,
    ShieldCheck,
    Star,
    X,
} from 'lucide-react';
import Link from 'next/link';
import { type ComponentType, useState } from 'react';

import { useSession } from '@app/lib/auth-client';
import { buildRecipeFilterHref } from '@app/lib/recipeFilters';

import { css } from 'styled-system/css';

import { MobileDrawer } from '../ui/MobileDrawer';

import { ThemeToggle } from './ThemeToggle';

interface DrawerNavItem {
    label: string;
    description?: string;
    href: string;
    icon?: ComponentType<{ size?: number }>;
}

const GENERAL_LINKS: (DrawerNavItem & { authOnly?: boolean })[] = [
    {
        label: 'Rezepte entdecken',
        description: 'Stöbere durch die komplette Sammlung',
        href: '/recipes',
        icon: LayoutGrid,
    },
    {
        label: 'Rezept erstellen',
        description: 'Neue Idee festhalten',
        href: '/recipe/create',
        icon: Plus,
        authOnly: true,
    },
];

const QUICK_FILTERS: DrawerNavItem[] = [
    {
        label: 'Saisonal & frisch',
        description: 'Mit Zutaten der Saison',
        href: buildRecipeFilterHref({ tags: ['Saisonal'] }),
        icon: Leaf,
    },
    {
        label: 'In 30 Minuten fertig',
        description: 'Perfekt für Feierabend',
        href: buildRecipeFilterHref({ maxTotalTime: 30 }),
        icon: Clock,
    },
    {
        label: 'Vegetarische Highlights',
        description: 'Pflanzenbasiert & satt',
        href: buildRecipeFilterHref({ tags: ['Vegetarisch'] }),
        icon: Salad,
    },
    {
        label: 'Top bewertet',
        description: '4,7 Sterne & höher',
        href: buildRecipeFilterHref({ minRating: 4.7 }),
        icon: Star,
    },
];

const ADMIN_LINK: DrawerNavItem = {
    label: 'Administration',
    description: 'Benutzer & Inhalte verwalten',
    href: '/admin',
    icon: ShieldCheck,
};

const MOD_LINK: DrawerNavItem = {
    label: 'Moderation',
    description: 'Inhalte prüfen & moderieren',
    href: '/admin/moderation',
    icon: Shield,
};

function DrawerItem({ item, onClose }: { item: DrawerNavItem; onClose: () => void }) {
    const Icon = item.icon;
    return (
        <Link
            href={item.href}
            onClick={onClose}
            className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '3',
                px: '4',
                py: '3',
                minHeight: '48px',
                textDecoration: 'none',
                borderRadius: 'lg',
                transition: 'background 150ms ease',
                _hover: { background: 'accent.soft' },
            })}
        >
            {Icon && (
                <div
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
                </div>
            )}
            <div className={css({ display: 'flex', flexDirection: 'column', gap: '0.5' })}>
                <span
                    className={css({
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: 'text',
                    })}
                >
                    {item.label}
                </span>
                {item.description && (
                    <span
                        className={css({
                            fontSize: '0.75rem',
                            color: 'text.muted',
                        })}
                    >
                        {item.description}
                    </span>
                )}
            </div>
        </Link>
    );
}

export function MobileNavDrawer() {
    const [open, setOpen] = useState(false);
    const { data: session, isPending } = useSession();
    const isAuthenticated = !isPending && Boolean(session?.user?.id);
    const userRole = session?.user?.role;
    const isAdmin = isAuthenticated && userRole === 'admin';
    const isModerator = isAuthenticated && userRole === 'moderator';

    const visibleGeneralLinks = GENERAL_LINKS.filter((link) => !link.authOnly || isAuthenticated);

    const adminLinks: DrawerNavItem[] = [];
    if (isAdmin) {
        adminLinks.push(ADMIN_LINK, MOD_LINK);
    } else if (isModerator) {
        adminLinks.push(MOD_LINK);
    }

    const close = () => setOpen(false);

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className={css({
                    display: { base: 'flex', md: 'none' },
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '44px',
                    minHeight: '44px',
                    borderRadius: 'full',
                    border: '1px solid',
                    borderColor: 'border',
                    background: 'surface.elevated',
                    color: 'text',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    _hover: {
                        background: 'transparent',
                        color: 'primary',
                    },
                    _focusVisible: {
                        boxShadow: {
                            base: '0 0 0 3px rgba(224,123,83,0.35)',
                            _dark: '0 0 0 3px rgba(224,123,83,0.3)',
                        },
                    },
                })}
                aria-label="Menü öffnen"
            >
                <Menu size={18} />
            </button>

            <MobileDrawer open={open} onClose={close} direction="left">
                {/* Header */}
                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: '4',
                        py: '3',
                        borderBottom: '1px solid',
                        borderColor: 'border.subtle',
                    })}
                >
                    <span
                        className={css({
                            fontSize: '1rem',
                            fontWeight: '700',
                            color: 'text',
                        })}
                    >
                        Menü
                    </span>
                    <button
                        type="button"
                        onClick={close}
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '36px',
                            height: '36px',
                            borderRadius: 'full',
                            border: 'none',
                            background: 'transparent',
                            color: 'text.muted',
                            cursor: 'pointer',
                            transition: 'all 150ms ease',
                            _hover: { color: 'text', background: 'accent.soft' },
                        })}
                        aria-label="Menü schließen"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation items */}
                <div
                    className={css({
                        flex: 1,
                        overflowY: 'auto',
                        py: '2',
                    })}
                >
                    {/* General links */}
                    <div className={css({ px: '2' })}>
                        {visibleGeneralLinks.map((item) => (
                            <DrawerItem key={item.href} item={item} onClose={close} />
                        ))}
                    </div>

                    {/* Quick filters */}
                    <div
                        className={css({
                            mt: '2',
                            pt: '2',
                            borderTop: '1px solid',
                            borderColor: 'border.subtle',
                            px: '2',
                        })}
                    >
                        {QUICK_FILTERS.map((item) => (
                            <DrawerItem key={item.href} item={item} onClose={close} />
                        ))}
                    </div>

                    {/* Admin links */}
                    {adminLinks.length > 0 && (
                        <div
                            className={css({
                                mt: '2',
                                pt: '2',
                                borderTop: '1px solid',
                                borderColor: 'border.subtle',
                                px: '2',
                            })}
                        >
                            <span
                                className={css({
                                    display: 'block',
                                    px: '4',
                                    py: '1',
                                    fontSize: '0.6875rem',
                                    fontWeight: '600',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    color: 'text.muted',
                                })}
                            >
                                Verwaltung
                            </span>
                            {adminLinks.map((item) => (
                                <DrawerItem key={item.href} item={item} onClose={close} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer with theme toggle */}
                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: '4',
                        py: '3',
                        borderTop: '1px solid',
                        borderColor: 'border.subtle',
                    })}
                >
                    <span
                        className={css({
                            fontSize: 'sm',
                            color: 'text.muted',
                        })}
                    >
                        Darstellung
                    </span>
                    <ThemeToggle />
                </div>
            </MobileDrawer>
        </>
    );
}
