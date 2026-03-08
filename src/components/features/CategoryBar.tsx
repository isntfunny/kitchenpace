'use client';

import type { LucideIcon } from 'lucide-react';
import * as icons from 'lucide-react';
import { Utensils } from 'lucide-react';
import Link from 'next/link';
import React, { createElement } from 'react';

import { css } from 'styled-system/css';

function resolveIcon(iconName: string | null): LucideIcon {
    if (!iconName) return Utensils;
    const pascal = iconName
        .split('-')
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join('');
    const icon = (icons as Record<string, unknown>)[pascal];
    return (icon as LucideIcon) ?? Utensils;
}

function DynamicIcon({ name, size }: { name: string | null; size: number }) {
    return createElement(resolveIcon(name), { size });
}

export interface CategoryBarItem {
    slug: string;
    name: string;
    icon: string | null;
    color: string;
    recipeCount: number;
}

interface CategoryBarProps {
    categories: CategoryBarItem[];
}

export function CategoryBar({ categories }: CategoryBarProps) {
    if (categories.length === 0) return null;

    return (
        <div
            className={css({
                p: '4',
                borderRadius: '2xl',
                bg: 'surface',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            })}
        >
            <div
                className={css({
                    display: 'grid',
                    gridTemplateColumns: { base: 'repeat(4, 1fr)', md: 'repeat(auto-fit, minmax(80px, 1fr))' },
                    gridTemplateRows: { base: 'repeat(2, auto)', md: 'auto' },
                    overflow: 'hidden',
                    gap: { base: '2', md: '3' },
                    pt: '1',
                })}
            >
                {categories.map((cat) => {
                    const color = cat.color;

                    return (
                        <Link
                            key={cat.slug}
                            href={`/category/${cat.slug}`}
                            className={css({
                                flex: { base: '1 1 80px', md: '1 1 0' },
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '2',
                                px: { base: '1.5', md: '2' },
                                py: '3',
                                borderRadius: 'xl',
                                border: '2px solid',
                                borderColor: 'transparent',
                                textDecoration: 'none',
                                transition: 'all 200ms ease',
                                cursor: 'pointer',
                                _hover: {
                                    borderColor: 'var(--cat-color)',
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 8px 24px color-mix(in srgb, var(--cat-color) 15%, transparent)',
                                },
                            })}
                            style={{ '--cat-color': color } as React.CSSProperties}
                        >
                            <div
                                className={css({
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: 'xl',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 200ms ease',
                                })}
                                style={{
                                    backgroundColor: `${color}18`,
                                    color,
                                }}
                            >
                                <DynamicIcon name={cat.icon} size={22} />
                            </div>
                            <span
                                className={css({
                                    fontSize: { base: '0.75rem', md: '0.8rem' },
                                    fontWeight: '600',
                                    color: 'text',
                                    whiteSpace: 'nowrap',
                                    textAlign: 'center',
                                    lineClamp: '1',
                                })}
                            >
                                {cat.name}
                            </span>
                            <span
                                className={css({
                                    fontSize: { base: '0.6rem', md: '0.65rem' },
                                    color: 'text-muted',
                                    whiteSpace: 'nowrap',
                                })}
                            >
                                {cat.recipeCount}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
