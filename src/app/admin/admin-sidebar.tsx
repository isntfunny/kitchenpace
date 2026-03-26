'use client';

import {
    Activity,
    ArrowLeft,
    Bell,
    BookOpen,
    Carrot,
    Clock,
    Flag,
    LayoutDashboard,
    LayoutList,
    Library,
    Menu,
    Scale,
    ShieldAlert,
    Sparkles,
    Star,
    Tag,
    Target,
    Users,
    X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { css, cx } from 'styled-system/css';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type AdminRole = 'admin' | 'moderator';

interface NavLink {
    href: string;
    icon: LucideIcon;
    label: string;
    minRole: AdminRole;
}

interface NavSection {
    title: string;
    links: NavLink[];
}

/* ------------------------------------------------------------------ */
/*  Navigation config                                                  */
/* ------------------------------------------------------------------ */

const NAV_SECTIONS: NavSection[] = [
    {
        title: 'Uebersicht',
        links: [{ href: '/admin', icon: LayoutDashboard, label: 'Dashboard', minRole: 'admin' }],
    },
    {
        title: 'Startseite',
        links: [
            { href: '/admin/content', icon: Star, label: 'Spotlight', minRole: 'admin' },
            {
                href: '/admin/fits-now',
                icon: Target,
                label: 'Passt zu jetzt',
                minRole: 'moderator',
            },
        ],
    },
    {
        title: 'Moderation',
        links: [
            {
                href: '/admin/moderation',
                icon: ShieldAlert,
                label: 'Warteschlange',
                minRole: 'moderator',
            },
            {
                href: '/admin/moderation/reports',
                icon: Flag,
                label: 'Meldungen',
                minRole: 'moderator',
            },
            {
                href: '/admin/moderation/ingredients',
                icon: Carrot,
                label: 'Zutaten-Review',
                minRole: 'moderator',
            },
            {
                href: '/admin/moderation/history',
                icon: Clock,
                label: 'Verlauf',
                minRole: 'moderator',
            },
        ],
    },
    {
        title: 'Inhalte',
        links: [
            { href: '/admin/recipes', icon: BookOpen, label: 'Rezepte', minRole: 'admin' },
            {
                href: '/admin/collections',
                icon: Library,
                label: 'Sammlungen',
                minRole: 'moderator',
            },
            { href: '/admin/ingredients', icon: Carrot, label: 'Zutaten', minRole: 'moderator' },
            { href: '/admin/units', icon: Scale, label: 'Einheiten', minRole: 'moderator' },
            { href: '/admin/tags', icon: Tag, label: 'Tags', minRole: 'admin' },
            { href: '/admin/categories', icon: LayoutList, label: 'Kategorien', minRole: 'admin' },
        ],
    },
    {
        title: 'System',
        links: [
            { href: '/admin/accounts', icon: Users, label: 'Accounts', minRole: 'admin' },
            { href: '/admin/notifications', icon: Bell, label: 'Nachrichten', minRole: 'admin' },
            { href: '/admin/worker', icon: Activity, label: 'Worker', minRole: 'admin' },
            { href: '/admin/imports', icon: Sparkles, label: 'KI-Imports', minRole: 'admin' },
        ],
    },
];

function canAccess(minRole: AdminRole, userRole: AdminRole): boolean {
    if (userRole === 'admin') return true;
    return minRole === 'moderator';
}

/* ------------------------------------------------------------------ */
/*  NavItem                                                            */
/* ------------------------------------------------------------------ */

function NavItem({ href, icon: Icon, label, active, onClick }: NavItemProps) {
    return (
        <Link
            href={href}
            onClick={onClick}
            className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '2',
                paddingX: '2',
                paddingY: '1.5',
                borderRadius: 'lg',
                fontSize: 'sm',
                transition: 'all 150ms ease',
                textDecoration: 'none',
                fontWeight: active ? '600' : 'normal',
                color: active ? 'foreground' : 'foreground.muted',
                background: active ? 'accent.soft' : 'transparent',
                _hover: {
                    background: 'accent.soft',
                    color: 'foreground',
                },
            })}
        >
            <Icon size={16} />
            {label}
        </Link>
    );
}

interface NavItemProps {
    href: string;
    icon: LucideIcon;
    label: string;
    active: boolean;
    onClick?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Section helpers                                                     */
/* ------------------------------------------------------------------ */

const sectionHeaderStyle = css({
    fontSize: 'xs',
    textTransform: 'uppercase',
    letterSpacing: '0.15em',
    color: 'foreground.muted',
    paddingX: '2',
    paddingTop: '4',
    paddingBottom: '1',
});

const dividerStyle = css({
    borderTopWidth: '1px',
    borderColor: 'border.muted',
    marginTop: '2',
});

/* ------------------------------------------------------------------ */
/*  Route matching                                                     */
/* ------------------------------------------------------------------ */

/** Routes whose children are separate sidebar entries — match exactly. */
const EXACT_MATCH_ROUTES = new Set(['/admin', '/admin/moderation']);

function isActive(pathname: string, href: string): boolean {
    if (EXACT_MATCH_ROUTES.has(href)) return pathname === href;
    return pathname.startsWith(href);
}

/* ------------------------------------------------------------------ */
/*  Sidebar nav content (shared between desktop + mobile drawer)       */
/* ------------------------------------------------------------------ */

function SidebarContent({
    visibleSections,
    pathname,
    onNavigate,
}: {
    visibleSections: NavSection[];
    pathname: string;
    onNavigate?: () => void;
}) {
    return (
        <>
            {visibleSections.map((section, i) => (
                <div key={section.title}>
                    {i > 0 && <div className={dividerStyle} />}
                    <p
                        className={cx(
                            sectionHeaderStyle,
                            i === 0 ? css({ paddingTop: '0' }) : undefined,
                        )}
                    >
                        {section.title}
                    </p>
                    {section.links.map((link) => (
                        <NavItem
                            key={link.href}
                            href={link.href}
                            icon={link.icon}
                            label={link.label}
                            active={isActive(pathname, link.href)}
                            onClick={onNavigate}
                        />
                    ))}
                </div>
            ))}

            {/* -- Bottom link -- */}
            <div className={css({ marginTop: 'auto' })} />
            <div className={dividerStyle} />
            <div className={css({ paddingTop: '2' })}>
                <NavItem
                    href="/"
                    icon={ArrowLeft}
                    label="Zurueck zur Seite"
                    active={false}
                    onClick={onNavigate}
                />
            </div>
        </>
    );
}

/* ------------------------------------------------------------------ */
/*  AdminSidebar                                                       */
/* ------------------------------------------------------------------ */

export function AdminSidebar({ role }: { role: AdminRole }) {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    // Close drawer on route change — the onNavigate callback handles this
    // when the user clicks a link, so no effect needed here.

    // Lock body scroll when drawer is open
    useEffect(() => {
        if (!mobileOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [mobileOpen]);

    const visibleSections = NAV_SECTIONS.map((section) => ({
        ...section,
        links: section.links.filter((link) => canAccess(link.minRole, role)),
    })).filter((section) => section.links.length > 0);

    return (
        <>
            {/* ── Desktop sidebar ── */}
            <nav
                className={css({
                    display: { base: 'none', md: 'flex' },
                    flexDirection: 'column',
                    width: '240px',
                    minWidth: '240px',
                    height: '100%',
                    background: 'surface',
                    borderRightWidth: '1px',
                    borderColor: 'border.muted',
                    overflowY: 'auto',
                    padding: '4',
                    position: 'relative',
                    zIndex: 25,
                })}
            >
                <SidebarContent visibleSections={visibleSections} pathname={pathname} />
            </nav>

            {/* ── Mobile hamburger button ── */}
            <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Navigation oeffnen"
                className={css({
                    display: { base: 'flex', md: 'none' },
                    position: 'fixed',
                    bottom: '4',
                    left: '4',
                    zIndex: 50,
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '48px',
                    height: '48px',
                    borderRadius: 'full',
                    background: 'primary',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                    transition: 'transform 150ms ease',
                    _hover: { transform: 'scale(1.05)' },
                })}
            >
                <Menu size={22} />
            </button>

            {/* ── Mobile drawer ── */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        className={css({
                            display: { base: 'flex', md: 'none' },
                            position: 'fixed',
                            inset: 0,
                            zIndex: 60,
                        })}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setMobileOpen(false)}
                    >
                        {/* Backdrop */}
                        <div
                            className={css({
                                position: 'absolute',
                                inset: 0,
                                background: 'rgba(0,0,0,0.5)',
                            })}
                        />

                        {/* Drawer panel */}
                        <motion.nav
                            className={css({
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                width: '280px',
                                maxWidth: '80vw',
                                height: '100%',
                                background: 'surface',
                                overflowY: 'auto',
                                padding: '4',
                                boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
                            })}
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close button */}
                            <button
                                type="button"
                                onClick={() => setMobileOpen(false)}
                                aria-label="Navigation schliessen"
                                className={css({
                                    alignSelf: 'flex-end',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: 'full',
                                    border: 'none',
                                    background: 'transparent',
                                    color: 'foreground.muted',
                                    cursor: 'pointer',
                                    mb: '2',
                                    _hover: { color: 'foreground', background: 'accent.soft' },
                                })}
                            >
                                <X size={18} />
                            </button>

                            <SidebarContent
                                visibleSections={visibleSections}
                                pathname={pathname}
                                onNavigate={() => setMobileOpen(false)}
                            />
                        </motion.nav>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

export const adminContentClass = css({
    flex: '1',
    overflowY: 'auto',
    padding: { base: '4', md: '6' },
    minWidth: 0,
});
