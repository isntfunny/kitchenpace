'use client';

import { FileText, Heart, Settings, User, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { DropdownMenu } from 'radix-ui';

import { css } from 'styled-system/css';

export type NavLinkItem = {
    label: string;
    description: string;
    href: string;
    icon?: LucideIcon;
};

export const PERSONAL_LINKS: NavLinkItem[] = [
    {
        label: 'Profilübersicht',
        description: 'Insights & Kochplan',
        href: '/profile',
        icon: User,
    },
    {
        label: 'Favoriten',
        description: 'Gespeicherte Rezepte',
        href: '/favorites',
        icon: Heart,
    },
    {
        label: 'Meine Rezepte',
        description: 'Eigene Sammlung & Drafts',
        href: '/my-recipes',
        icon: FileText,
    },
    {
        label: 'Profil & Einstellungen',
        description: 'Account verwalten',
        href: '/profile/manage',
        icon: Settings,
    },
];

type MenuSectionProps = {
    title: string;
    items: NavLinkItem[];
};

type MenuCardProps = {
    item: NavLinkItem;
};

function MenuCard({ item }: MenuCardProps) {
    const Icon = item.icon;
    return (
        <DropdownMenu.Item asChild>
            <Link
                href={item.href}
                className={css({
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '3',
                    borderRadius: 'xl',
                    border: '1px solid',
                    borderColor: 'border.muted',
                    background: 'surface',
                    textDecoration: 'none',
                    color: 'foreground',
                    transition: 'all 150ms ease',
                    _hover: {
                        borderColor: 'accent',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                    },
                })}
            >
                {Icon ? (
                    <span className={css({ display: 'flex', alignItems: 'center', gap: '2' })}>
                        <Icon size={18} />
                        <span className={css({ fontWeight: '600' })}>{item.label}</span>
                    </span>
                ) : (
                    <span className={css({ fontWeight: '600' })}>{item.label}</span>
                )}
                <span className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                    {item.description}
                </span>
            </Link>
        </DropdownMenu.Item>
    );
}

export function MenuSection({ title, items }: MenuSectionProps) {
    return (
        <section>
            <p
                className={css({
                    fontSize: 'xs',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: 'wide',
                    color: 'foreground.muted',
                    marginBottom: '3',
                })}
            >
                {title}
            </p>
            <div className={css({ display: 'flex', flexDirection: 'column', gap: '2' })}>
                {items.map((item) => (
                    <MenuCard key={item.label} item={item} />
                ))}
            </div>
        </section>
    );
}
