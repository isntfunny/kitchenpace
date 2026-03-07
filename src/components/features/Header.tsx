'use client';

import { Apple, ChefHat, Droplet, Egg, Flame, Leaf, LayoutGrid, Menu, Plus, Shield, ShieldCheck, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { DropdownMenu } from 'radix-ui';
import { useMemo } from 'react';

import { NotificationBell } from '@app/components/notifications/NotificationBell';
import { useAdminInboxCount } from '@app/components/notifications/useAdminInboxCount';
import { HeaderSearch } from '@app/components/search/HeaderSearch';
import { PALETTE } from '@app/lib/palette';
import { buildRecipeFilterHref } from '@app/lib/recipeFilters';
import { css } from 'styled-system/css';

import { SmartImage } from '../atoms/SmartImage';

import { HeaderAuth } from './HeaderAuth';
import { MenuSection, type NavLinkItem as MenuNavLinkItem } from './HeaderMenuPanel';
import { RecipeTabs } from './RecipeTabs';
import { ThemeToggle } from './ThemeToggle';

type GeneralNavLinkItem = MenuNavLinkItem & { authOnly?: boolean };

const ICON_POOL = [Apple, Egg, Flame, ChefHat, Leaf, Zap, Droplet];

function getRandomIcons() {
    const shuffled = [...ICON_POOL].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
}

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
                        padding: '4',
                        boxShadow: '0 40px 120px rgba(0,0,0,0.15)',
                        zIndex: 100,
                        transformOrigin: 'var(--radix-dropdown-menu-content-transform-origin)',
                        '&[data-state="open"]': {
                            animation: 'scaleUp 200ms ease',
                        },
                        '&[data-state="closed"]': {
                            animation: 'scaleDown 150ms ease',
                        },
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
    const isAuthenticated = status === 'authenticated' && Boolean(session?.user?.id);
    const userRole = session?.user?.role;
    const isAdmin = isAuthenticated && userRole === 'ADMIN';
    const isModerator = isAuthenticated && userRole === 'MODERATOR';
    const isAdminOrMod = isAdmin || isModerator;

    const [Icon1, Icon2, Icon3] = useMemo(() => getRandomIcons(), []);

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
                background: `linear-gradient(135deg, rgba(224,123,83,0.05), rgba(248,181,0,0.02))`,
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
                            flex: { base: '1 1 180px', sm: '1 1 240px', md: '1 1 320px' },
                            minWidth: { base: '160px', sm: '180px', md: '220px' },
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
                        {isAdminOrMod && (
                            <ModerationHeaderLink isAdmin={isAdmin} />
                        )}
                        <HeaderAuth />
                    </div>
                </div>
            </div>

            <div className={css({ position: 'relative', zIndex: 1 })}>
                <RecipeTabs />
            </div>
        </header>
    );
}

function ModerationHeaderLink({ isAdmin }: { isAdmin: boolean }) {
    const { count } = useAdminInboxCount();

    const Icon = isAdmin ? ShieldCheck : Shield;
    const href = isAdmin ? '/admin' : '/moderation';
    const label = isAdmin ? 'Admin' : 'Mod';

    return (
        <Link
            href={href}
            className={css({
                position: 'relative',
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
                fontSize: '0.875rem',
                fontWeight: '500',
                transition: 'all 150ms ease',
                _hover: {
                    background: 'transparent',
                    color: 'primary',
                },
            })}
        >
            <Icon size={18} />
            <span
                className={css({
                    display: { base: 'none', sm: 'inline-flex' },
                    fontSize: '0.875rem',
                    fontWeight: '500',
                })}
            >
                {label}
            </span>
            {count > 0 && (
                <span
                    className={css({
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        minWidth: '18px',
                        height: '18px',
                        borderRadius: 'full',
                        background: '#dc2626',
                        color: 'white',
                        fontSize: '0.65rem',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        px: '1',
                        lineHeight: '1',
                    })}
                >
                    {count > 99 ? '99+' : count}
                </span>
            )}
        </Link>
    );
}
