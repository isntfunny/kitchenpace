'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import Link from 'next/link';
import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

import { HeaderSearch } from '@/components/search/HeaderSearch';
import { buildRecipeFilterHref } from '@/lib/recipeFilters';
import { css } from 'styled-system/css';

import { SmartImage } from '../atoms/SmartImage';

import { HeaderAuthClient } from './HeaderAuthClient';
import { RecipeTabs } from './RecipeTabs';

const categories = [
    { name: 'Frühstück', icon: '🍳' },
    { name: 'Mittagessen', icon: '🥗' },
    { name: 'Abendessen', icon: '🍽️' },
    { name: 'Desserts', icon: '🍰' },
    { name: 'Getränke', icon: '🥤' },
    { name: 'Snacks', icon: '🥨' },
    { name: 'Beilagen', icon: '🥬' },
    { name: 'Backen', icon: '🥖' },
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
                        <span>{category.icon}</span>
                        <span>{category.name}</span>
                    </Link>
                </DropdownMenu.Item>
            ))}
        </div>
    );
}

function MobileMenu() {
    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <button
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1',
                        borderRadius: 'full',
                        padding: '2.5',
                        border: '1px solid rgba(0,0,0,0.1)',
                        background: 'rgba(255,255,255,0.9)',
                        fontSize: 'sm',
                        fontFamily: 'body',
                        fontWeight: '600',
                        cursor: 'pointer',
                        _hover: { boxShadow: '0 10px 20px rgba(0,0,0,0.12)' },
                    })}
                >
                    <span aria-hidden>☰</span>
                    <span>Menu</span>
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
                        padding: '4',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
                        animation: 'slideDown 200ms ease',
                        zIndex: 100,
                    })}
                    sideOffset={8}
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
                            <span>❤️</span>
                            <span>Favoriten</span>
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
                            <span>+</span>
                            <span>Rezept</span>
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

export async function Header() {
    const session = await getServerAuthSession('header');

    let profile: { photoUrl: string | null; nickname: string | null } | null = null;

    if (session?.user?.id) {
        const userProfile = await prisma.profile.findUnique({
            where: { userId: session.user.id },
        });
        if (userProfile) {
            profile = {
                photoUrl: userProfile.photoUrl,
                nickname: userProfile.nickname,
            };
        }
    }

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
                                    <span>📋</span>
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
                            <span>❤️</span>
                            <span className={css({ display: { base: 'none', md: 'inline' } })}>
                                Favoriten
                            </span>
                        </Link>

                        <Link
                            href="/recipe/create"
                            className={css({
                                fontFamily: 'body',
                                fontSize: 'sm',
                                fontWeight: '600',
                                color: 'white',
                                px: '4',
                                py: '2',
                                borderRadius: 'lg',
                                background: 'linear-gradient(135deg, #e07b53 0%, #f8b500 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1.5',
                                transition: 'all 150ms ease',
                                textDecoration: 'none',
                                _hover: {
                                    transform: 'translateY(-1px)',
                                    boxShadow: '0 4px 12px rgba(224,123,83,0.3)',
                                },
                            })}
                        >
                            <span>+</span>
                            <span className={css({ display: { base: 'none', md: 'inline' } })}>
                                Rezept
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
                    <div className={css({ flex: 1, minWidth: 0 })}>
                        <HeaderSearch />
                    </div>
                    <div className={css({ flex: '0 0 auto' })}>
                        <HeaderAuthClient
                            isAuthenticated={Boolean(session?.user?.id)}
                            profile={profile}
                        />
                    </div>
                </div>
            </div>

            <RecipeTabs />
        </header>
    );
}
