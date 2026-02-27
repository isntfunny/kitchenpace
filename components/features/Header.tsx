'use client';

import {
    ChefHat,
    Coffee,
    GlassWater,
    Heart,
    LayoutDashboard,
    LayoutGrid,
    Menu,
    Moon,
    Plus,
    UtensilsCrossed,
} from 'lucide-react';
import Link from 'next/link';
import { DropdownMenu } from 'radix-ui';
import { useState } from 'react';

import { HeaderSearch } from '@/components/search/HeaderSearch';
import { buildRecipeFilterHref } from '@/lib/recipeFilters';
import { css } from 'styled-system/css';

import { SmartImage } from '../atoms/SmartImage';

import { HeaderAuth } from './HeaderAuth';
import { RecipeTabs } from './RecipeTabs';

const categories = [
    { name: 'Frühstück', icon: Coffee },
    { name: 'Mittagessen', icon: UtensilsCrossed },
    { name: 'Abendessen', icon: Moon },
    { name: 'Desserts', icon: ChefHat },
    { name: 'Getränke', icon: GlassWater },
    { name: 'Snacks', icon: LayoutGrid },
    { name: 'Beilagen', icon: LayoutGrid },
    { name: 'Backen', icon: ChefHat },
];

function CategoryGrid() {
    return (
        <div
            className={css({
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1',
            })}
        >
            {categories.map((category) => (
                <DropdownMenu.Item key={category.name} asChild>
                    <Link
                        href={buildRecipeFilterHref({
                            mealTypes: [category.name],
                        })}
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2',
                            padding: '3',
                            borderRadius: 'lg',
                            cursor: 'pointer',
                            fontSize: 'sm',
                            fontFamily: 'body',
                            outline: 'none',
                            transition: 'all 150ms ease',
                            textDecoration: 'none',
                            color: 'text',
                            _hover: {
                                background: 'rgba(224,123,83,0.08)',
                                transform: 'translateX(2px)',
                            },
                        })}
                    >
                        <category.icon size={18} color="#666" />
                        <span>{category.name}</span>
                    </Link>
                </DropdownMenu.Item>
            ))}
        </div>
    );
}

function MobileMenu() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenu.Trigger asChild>
                <button
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '10',
                        height: '10',
                        borderRadius: 'lg',
                        border: '1px solid rgba(0,0,0,0.1)',
                        background: 'white',
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                        _hover: { background: 'rgba(224,123,83,0.08)' },
                    })}
                    aria-label="Menü öffnen"
                >
                    <Menu size={20} />
                </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
                {isOpen && (
                    <div
                        className={css({
                            position: 'fixed',
                            inset: 0,
                            zIndex: 90,
                            background: 'rgba(0,0,0,0.25)',
                        })}
                        onPointerDown={() => setIsOpen(false)}
                    />
                )}
                {/* 
                    position: fixed verhindert Seitenverschiebung 
                    onInteractOutside stellt sicher, dass Klick außerhalb das Menü schließt
                */}
                <DropdownMenu.Content
                    className={css({
                        position: 'fixed',
                        right: '16px',
                        top: '70px',
                        minWidth: '260px',
                        maxWidth: '85vw',
                        background: 'white',
                        borderRadius: 'xl',
                        border: '1px solid',
                        borderColor: 'rgba(224,123,83,0.2)',
                        padding: '4',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
                        animation: 'contentShow 200ms ease',
                        zIndex: 100,
                    })}
                    sideOffset={8}
                    onCloseAutoFocus={(event) => event.preventDefault()}
                >
                    <DropdownMenu.Label className={css({ fontSize: 'sm', fontWeight: '600' })}>
                        Aktionen
                    </DropdownMenu.Label>
                    <DropdownMenu.Item asChild>
                        <Link
                            href="/favorites"
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2',
                                padding: '3',
                                borderRadius: 'lg',
                                textDecoration: 'none',
                                fontSize: 'sm',
                                fontFamily: 'body',
                                color: 'text',
                                transition: 'all 150ms ease',
                                _hover: { background: 'rgba(224,123,83,0.08)' },
                            })}
                        >
                            <Heart size={16} />
                            <span>Favoriten</span>
                        </Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item asChild>
                        <Link
                            href="/dashboard"
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2',
                                padding: '3',
                                borderRadius: 'lg',
                                textDecoration: 'none',
                                fontSize: 'sm',
                                fontFamily: 'body',
                                color: 'text',
                                transition: 'all 150ms ease',
                                _hover: { background: 'rgba(224,123,83,0.08)' },
                            })}
                        >
                            <LayoutDashboard size={16} />
                            <span>Dashboard</span>
                        </Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item asChild>
                        <Link
                            href="/recipe/create"
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2',
                                padding: '3',
                                borderRadius: 'lg',
                                textDecoration: 'none',
                                fontSize: 'sm',
                                fontFamily: 'body',
                                color: 'text',
                                transition: 'all 150ms ease',
                                _hover: { background: 'rgba(224,123,83,0.08)' },
                            })}
                        >
                            <Plus size={16} />
                            <span>Rezept erstellen</span>
                        </Link>
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator
                        className={css({ my: '3', height: '1px', background: 'rgba(0,0,0,0.1)' })}
                    />
                    <DropdownMenu.Label className={css({ fontSize: 'sm', fontWeight: '600' })}>
                        Kategorien
                    </DropdownMenu.Label>
                    <CategoryGrid />
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
}

export function Header() {
    return (
        <header
            className={css({
                position: 'sticky',
                top: 0,
                zIndex: 20,
                bg: '#fffcf9',
                boxShadow: '0 4px 20px rgba(224,123,83,0.15)',
            })}
        >
            <div
                className={css({
                    maxW: '1400px',
                    marginX: 'auto',
                    width: '100%',
                    px: { base: '4', md: '6' },
                    py: '3',
                    borderBottom: '1px solid',
                    borderColor: 'rgba(0,0,0,0.05)',
                })}
            >
                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '3',
                    })}
                >
                    <div
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4',
                        })}
                    >
                        <div className={css({ display: { base: 'flex', md: 'none' } })}>
                            <MobileMenu />
                        </div>
                        <Link href="/">
                            <SmartImage
                                src="/kitchenpace.png"
                                alt="KüchenTakt Logo"
                                width={100}
                                height={39}
                                className={css({ objectFit: 'contain' })}
                            />
                        </Link>
                    </div>

                    <div
                        className={css({
                            flex: 1,
                            minWidth: 0,
                            marginLeft: '2',
                            display: { base: 'none', md: 'block' },
                        })}
                    >
                        <HeaderSearch />
                    </div>

                    <div
                        className={css({
                            display: { base: 'none', md: 'flex' },
                            gap: '2',
                            alignItems: 'center',
                        })}
                    >
                        <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                                <button
                                    suppressHydrationWarning
                                    className={css({
                                        fontFamily: 'body',
                                        fontSize: 'sm',
                                        fontWeight: '500',
                                        color: 'text',
                                        px: '3',
                                        py: '2',
                                        borderRadius: 'lg',
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1.5',
                                        transition: 'all 150ms ease',
                                        _hover: {
                                            bg: 'rgba(224,123,83,0.08)',
                                            color: 'primary',
                                        },
                                    })}
                                >
                                    <Menu size={16} />
                                    <span
                                        className={css({ display: { base: 'none', md: 'inline' } })}
                                    >
                                        Kategorien
                                    </span>
                                </button>
                            </DropdownMenu.Trigger>

                            <DropdownMenu.Portal>
                                <DropdownMenu.Content
                                    className={css({
                                        minWidth: '240px',
                                        background: 'white',
                                        borderRadius: 'xl',
                                        border: '1px solid',
                                        borderColor: 'rgba(224,123,83,0.2)',
                                        padding: '2',
                                        boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
                                        animation: 'slideDown 200ms ease',
                                        zIndex: 100,
                                    })}
                                    sideOffset={8}
                                >
                                    <CategoryGrid />
                                </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                        </DropdownMenu.Root>

                        <Link
                            href="/favorites"
                            className={css({
                                fontFamily: 'body',
                                fontSize: 'sm',
                                fontWeight: '500',
                                color: 'text',
                                px: '3',
                                py: '2',
                                borderRadius: 'lg',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1.5',
                                transition: 'all 150ms ease',
                                textDecoration: 'none',
                                _hover: {
                                    bg: 'rgba(224,123,83,0.08)',
                                    color: 'primary',
                                },
                            })}
                        >
                            <Heart size={16} />
                            <span className={css({ display: { base: 'none', md: 'inline' } })}>
                                Favoriten
                            </span>
                        </Link>
                    </div>
                </div>

                <div
                    className={css({
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: '3',
                        justifyContent: 'space-between',
                        marginTop: '3',
                    })}
                >
                    <div
                        className={css({
                            display: { base: 'flex', md: 'none' },
                            alignItems: 'center',
                            gap: '2',
                            flex: 1,
                        })}
                    >
                        <div className={css({ flex: 1, minWidth: 0 })}>
                            <HeaderSearch />
                        </div>
                    </div>
                    <div className={css({ flex: '0 0 auto' })}>
                        <HeaderAuth />
                    </div>
                </div>
            </div>

            <RecipeTabs />
        </header>
    );
}
