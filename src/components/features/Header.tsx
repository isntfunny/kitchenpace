'use client';

import {
    ChefHat,
    Egg,
    LayoutGrid,
    Menu,
    Plus,
    Shield,
    ShieldCheck,
    Zap,
} from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { DropdownMenu } from 'radix-ui';

import { HeaderSearch } from '@app/components/search/HeaderSearch';
import { useIsDark } from '@app/lib/darkMode';
import { PALETTE } from '@app/lib/palette';
import { buildRecipeFilterHref } from '@app/lib/recipeFilters';
import { css } from 'styled-system/css';

import { SmartImage } from '../atoms/SmartImage';

import { HeaderAuth } from './HeaderAuth';
import { MenuSection, type NavLinkItem as MenuNavLinkItem } from './HeaderMenuPanel';
import { RecipeTabs } from './RecipeTabs';
import { ThemeToggle } from './ThemeToggle';

type GeneralNavLinkItem = MenuNavLinkItem & { authOnly?: boolean };

const HEADER_ICONS = [Egg, Zap, ChefHat] as const;

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

const ADMIN_LINK: GeneralNavLinkItem = {
    label: 'Administration',
    description: 'Benutzer & Inhalte verwalten',
    href: '/admin',
    icon: ShieldCheck,
};

const MOD_LINK: GeneralNavLinkItem = {
    label: 'Moderation',
    description: 'Inhalte prüfen & moderieren',
    href: '/moderation',
    icon: Shield,
};

function HeaderNavigationMenu({
    isAuthenticated,
    isAdmin,
    isModerator,
}: {
    isAuthenticated: boolean;
    isAdmin: boolean;
    isModerator: boolean;
}) {
    const availableGeneralLinks = GENERAL_NAV_LINKS.filter(
        (link) => !link.authOnly || isAuthenticated,
    ) as MenuNavLinkItem[];

    const adminLinks: MenuNavLinkItem[] = [];
    if (isAdmin) {
        adminLinks.push(ADMIN_LINK, MOD_LINK);
    } else if (isModerator) {
        adminLinks.push(MOD_LINK);
    }

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <button
                    type="button"
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2',
                        padding: '2',
                        minWidth: '44px',
                        minHeight: '44px',
                        borderRadius: 'full',
                        border: '1px solid',
                        borderColor: 'border',
                        background: 'surface.elevated',
                        color: 'text',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        transition: 'all 150ms ease',
                        _hover: {
                            background: 'transparent',
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
                        boxShadow: '0 40px 120px rgba(0,0,0,0.15)',
                        zIndex: 100,
                        maxHeight: 'var(--radix-dropdown-menu-content-available-height, calc(100vh - 6rem))',
                        overflowY: 'auto',
                        transformOrigin: 'var(--radix-dropdown-menu-content-transform-origin)',
                        '&[data-state="open"]': {
                            animation: 'scaleUp 200ms ease',
                        },
                        '&[data-state="closed"]': {
                            animation: 'scaleDown 150ms ease',
                        },
                    })}
                    sideOffset={8}
                >
                    <div
                        className={css({
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4',
                            padding: '4',
                        })}
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
                            {adminLinks.length > 0 && (
                                <MenuSection title="Verwaltung" items={adminLinks} />
                            )}
                        </div>
                        <div
                            className={css({ display: 'flex', flexDirection: 'column', gap: '4' })}
                        >
                            <MenuSection title="Schnelle Filter" items={QUICK_FILTERS} />
                        </div>
                    </div>
                    <section>
                        <div
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '2',
                                padding: '3',
                                borderRadius: 'xl',
                                border: '1px solid',
                                borderColor: 'border.muted',
                                background: 'surface',
                            })}
                        >
                            <p
                                className={css({
                                    fontSize: 'sm',
                                    color: 'text.muted',
                                    margin: 0,
                                })}
                            >
                                Darstellung
                            </p>
                            <ThemeToggle />
                        </div>
                    </section>
                    </div>
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
}

export function Header() {
    const { status, data: session } = useSession();
    const isAuthenticated = status === 'authenticated' && Boolean(session?.user?.id);
    const userRole = session?.user?.role;
    const isAdmin = isAuthenticated && userRole === 'ADMIN';
    const isModerator = isAuthenticated && userRole === 'MODERATOR';
    const dark = useIsDark();

    const [Icon1, Icon2, Icon3] = HEADER_ICONS;

    return (
        <header
            className={css({
                position: 'sticky',
                top: 0,
                zIndex: 20,
                overflow: 'hidden',
                boxShadow: '0 4px 30px rgba(0,0,0,0.15)',
            })}
            style={{
                background: dark
                    ? 'linear-gradient(135deg, rgba(224,123,83,0.08), rgba(248,181,0,0.04))'
                    : 'linear-gradient(135deg, rgba(224,123,83,0.05), rgba(248,181,0,0.02))',
                backdropFilter: 'blur(8px)',
            }}
        >
            {/* Animated floating background elements */}
            <motion.div
                className={css({
                    position: 'absolute',
                    top: '-20px',
                    right: '10%',
                    opacity: 0.08,
                    pointerEvents: 'none',
                    zIndex: 0,
                })}
                animate={{ y: [0, -20, 0], rotate: [0, 3, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            >
                <Icon1 size={140} color={PALETTE.orange} />
            </motion.div>
            <motion.div
                className={css({
                    position: 'absolute',
                    top: '50%',
                    left: '-30px',
                    opacity: 0.07,
                    pointerEvents: 'none',
                    zIndex: 0,
                })}
                animate={{ y: [0, 18, 0], rotate: [0, -4, 0] }}
                transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            >
                <Icon2 size={120} color={PALETTE.orange} />
            </motion.div>
            <motion.div
                className={css({
                    position: 'absolute',
                    bottom: '-25px',
                    right: '20%',
                    opacity: 0.05,
                    pointerEvents: 'none',
                    zIndex: 0,
                })}
                animate={{ y: [0, 20, 0], rotate: [0, 2, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            >
                <Icon3 size={160} color={PALETTE.gold} />
            </motion.div>
            <div
                className={css({
                    position: 'relative',
                    zIndex: 1,
                    maxWidth: '1400px',
                    marginX: 'auto',
                    width: '100%',
                    px: { base: '4', md: '6' },
                    pt: '3',
                    pb: '0',
                })}
            >
                {/* Desktop: single row — Logo | Search | Menu + Auth */}
                <div
                    className={css({
                        display: { base: 'none', md: 'flex' },
                        alignItems: 'center',
                        gap: '3',
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
                        <HeaderNavigationMenu
                            isAuthenticated={isAuthenticated}
                            isAdmin={isAdmin}
                            isModerator={isModerator}
                        />
                        <HeaderAuth />
                    </div>
                </div>

                {/* Mobile: row 1 — Logo only */}
                <div
                    className={css({
                        display: { base: 'flex', md: 'none' },
                        alignItems: 'center',
                        justifyContent: 'center',
                    })}
                >
                    <Link
                        href="/"
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
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
                </div>

                {/* Mobile: row 2 — Menu | Search | Profile */}
                <div
                    className={css({
                        display: { base: 'flex', md: 'none' },
                        alignItems: 'center',
                        gap: '2',
                        mt: '2',
                    })}
                >
                    <HeaderNavigationMenu
                        isAuthenticated={isAuthenticated}
                        isAdmin={isAdmin}
                        isModerator={isModerator}
                    />

                    <div className={css({ flex: '1', minWidth: 0 })}>
                        <HeaderSearch />
                    </div>

                    <HeaderAuth />
                </div>
            </div>

            <div className={css({ position: 'relative', zIndex: 1 })}>
                <RecipeTabs />
            </div>
        </header>
    );
}
