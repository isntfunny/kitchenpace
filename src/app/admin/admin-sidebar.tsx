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
    Scale,
    ShieldAlert,
    Sparkles,
    Star,
    Tag,
    Target,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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

function NavItem({ href, icon: Icon, label, active }: NavItemProps) {
    return (
        <Link
            href={href}
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

function isActive(pathname: string, href: string): boolean {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
}

/* ------------------------------------------------------------------ */
/*  AdminSidebar                                                       */
/* ------------------------------------------------------------------ */

export function AdminSidebar({ role }: { role: AdminRole }) {
    const pathname = usePathname();

    const visibleSections = NAV_SECTIONS.map((section) => ({
        ...section,
        links: section.links.filter((link) => canAccess(link.minRole, role)),
    })).filter((section) => section.links.length > 0);

    return (
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
            })}
        >
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
                        />
                    ))}
                </div>
            ))}

            {/* -- Bottom link -- */}
            <div className={css({ marginTop: 'auto' })} />
            <div className={dividerStyle} />
            <div className={css({ paddingTop: '2' })}>
                <NavItem href="/" icon={ArrowLeft} label="Zurueck zur Seite" active={false} />
            </div>
        </nav>
    );
}

export const adminContentClass = css({
    flex: '1',
    overflowY: 'auto',
    padding: { base: '4', md: '6' },
    minWidth: 0,
});
