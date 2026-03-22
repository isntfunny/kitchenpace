'use client';

import {
    Activity,
    ArrowLeft,
    Bell,
    BookOpen,
    Carrot,
    LayoutDashboard,
    LayoutList,
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
/*  Route configuration                                                */
/* ------------------------------------------------------------------ */

function isActive(pathname: string, href: string): boolean {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
}

/* ------------------------------------------------------------------ */
/*  AdminSidebar                                                       */
/* ------------------------------------------------------------------ */

export function AdminSidebar() {
    const pathname = usePathname();

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
            {/* -- Uebersicht -- */}
            <p className={cx(sectionHeaderStyle, css({ paddingTop: '0' }))}>Uebersicht</p>
            <NavItem
                href="/admin"
                icon={LayoutDashboard}
                label="Dashboard"
                active={isActive(pathname, '/admin')}
            />

            {/* -- Startseite -- */}
            <div className={dividerStyle} />
            <p className={sectionHeaderStyle}>Startseite</p>
            <NavItem
                href="/admin/content"
                icon={Star}
                label="Spotlight"
                active={isActive(pathname, '/admin/content')}
            />
            <NavItem
                href="/mods/fits-now"
                icon={Target}
                label="Passt zu jetzt"
                active={isActive(pathname, '/mods/fits-now')}
            />

            {/* -- Inhalte -- */}
            <div className={dividerStyle} />
            <p className={sectionHeaderStyle}>Inhalte</p>
            <NavItem
                href="/moderation"
                icon={ShieldAlert}
                label="Moderation"
                active={isActive(pathname, '/moderation')}
            />
            <NavItem
                href="/admin/recipes"
                icon={BookOpen}
                label="Rezepte"
                active={isActive(pathname, '/admin/recipes')}
            />
            <NavItem
                href="/admin/ingredients"
                icon={Carrot}
                label="Zutaten"
                active={isActive(pathname, '/admin/ingredients')}
            />
            <NavItem
                href="/admin/tags"
                icon={Tag}
                label="Tags"
                active={isActive(pathname, '/admin/tags')}
            />
            <NavItem
                href="/admin/categories"
                icon={LayoutList}
                label="Kategorien"
                active={isActive(pathname, '/admin/categories')}
            />

            {/* -- System -- */}
            <div className={dividerStyle} />
            <p className={sectionHeaderStyle}>System</p>
            <NavItem
                href="/admin/accounts"
                icon={Users}
                label="Accounts"
                active={isActive(pathname, '/admin/accounts')}
            />
            <NavItem
                href="/admin/notifications"
                icon={Bell}
                label="Nachrichten"
                active={isActive(pathname, '/admin/notifications')}
            />
            <NavItem
                href="/admin/worker"
                icon={Activity}
                label="Worker"
                active={isActive(pathname, '/admin/worker')}
            />
            <NavItem
                href="/admin/imports"
                icon={Sparkles}
                label="KI-Imports"
                active={isActive(pathname, '/admin/imports')}
            />

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
