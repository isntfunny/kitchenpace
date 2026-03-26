'use client';

import { ChefHat, Egg, LayoutGrid, Menu, Plus, Shield, ShieldCheck, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { DropdownMenu } from 'radix-ui';

import { useTheme } from '@app/components/providers/ThemeProvider';
import { useSession } from '@app/lib/auth-client';
import { PALETTE } from '@app/lib/palette';
import { buildRecipeFilterHref } from '@app/lib/recipeFilters';
import { getThemeConfig } from '@app/lib/themes/registry';

import { css } from 'styled-system/css';

import { SmartImage } from '../atoms/SmartImage';

import { HeaderAuth } from './HeaderAuth';
import { MenuSection, type NavLinkItem as MenuNavLinkItem } from './HeaderMenuPanel';
import { HeaderSearch } from './HeaderSearch';
import { MobileNavDrawer } from './MobileNavDrawer';
import { MobileSearch } from './MobileSearch';
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
        label: 'Rezept erstellen',
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
    href: '/admin/moderation',
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
                            boxShadow: {
                                base: '0 0 0 3px rgba(224,123,83,0.35)',
                                _dark: '0 0 0 3px rgba(224,123,83,0.3)',
                            },
                        },
                    })}
                >
                    <Menu size={18} />
                    <span className={css({ display: { base: 'none', sm: 'inline-flex' } })}>
                        Menü
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
                        boxShadow: 'shadow.large',
                        zIndex: 100,
                        maxHeight:
                            'var(--radix-dropdown-menu-content-available-height, calc(100vh - 6rem))',
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
                            gap: 'modal',
                            padding: 'modal',
                        })}
                    >
                        <div
                            className={css({
                                display: 'grid',
                                gridTemplateColumns: {
                                    base: '1fr',
                                    md: 'repeat(2, minmax(0, 1fr))',
                                },
                                gap: 'modal',
                            })}
                        >
                            <div
                                className={css({
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 'modal',
                                })}
                            >
                                <MenuSection items={availableGeneralLinks} />
                                {adminLinks.length > 0 && (
                                    <MenuSection title="Verwaltung" items={adminLinks} />
                                )}
                            </div>
                            <div
                                className={css({
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4',
                                })}
                            >
                                <MenuSection items={QUICK_FILTERS} />
                                <div
                                    className={css({
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        px: '3',
                                        py: '2',
                                        borderRadius: 'lg',
                                        mt: '2',
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
                            </div>
                        </div>
                    </div>
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
}

export function Header() {
    const { data: session, isPending } = useSession();
    const isAuthenticated = !isPending && Boolean(session?.user?.id);
    const userRole = session?.user?.role;
    const isAdmin = isAuthenticated && userRole === 'admin';
    const isModerator = isAuthenticated && userRole === 'moderator';
    const [Icon1, Icon2, Icon3] = HEADER_ICONS;
    const { theme } = useTheme();
    const logoSrc = getThemeConfig(theme).logo;

    return (
        <header
            className={css({
                position: 'sticky',
                top: 0,
                zIndex: 20,
                boxShadow: {
                    base: '0 4px 30px rgba(0,0,0,0.15)',
                    _dark: '0 4px 30px rgba(0,0,0,0.4)',
                },
                background: {
                    base: 'linear-gradient(135deg, rgba(255,252,248,0.92), rgba(255,250,245,0.90))',
                    _dark: 'linear-gradient(135deg, rgba(30,28,26,0.92), rgba(30,28,26,0.90))',
                },
                backdropFilter: 'blur(8px)',
            })}
        >
            {/* Animated floating background elements — clipped to header bounds */}
            <div
                className={css({
                    position: 'absolute',
                    inset: 0,
                    overflow: 'hidden',
                    pointerEvents: 'none',
                    zIndex: 0,
                })}
            >
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
            </div>
            <div
                className={css({
                    position: 'relative',
                    zIndex: 2,
                    maxWidth: '1400px',
                    marginX: 'auto',
                    width: '100%',
                    px: { base: 'page.x', md: 'page.x.md' },
                    pt: 'card.compact',
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
                            src={logoSrc}
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
                        {isAuthenticated && (
                            <Link
                                href="/recipe/create"
                                className={css({
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '1.5',
                                    px: '3.5',
                                    py: '2',
                                    borderRadius: 'control',
                                    fontSize: 'sm',
                                    fontWeight: '600',
                                    fontFamily: 'body',
                                    color: 'white',
                                    bg: 'primary',
                                    textDecoration: 'none',
                                    transition: 'all 150ms ease',
                                    _hover: {
                                        opacity: 0.9,
                                        transform: 'translateY(-1px)',
                                    },
                                })}
                            >
                                <Plus size={15} />
                                Erstellen
                            </Link>
                        )}
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
                            src={logoSrc}
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
                    <MobileNavDrawer />

                    <div className={css({ flex: '1', minWidth: 0 })}>
                        <MobileSearch />
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
