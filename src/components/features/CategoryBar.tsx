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
                p: 'card',
                borderRadius: 'surface',
                bg: 'surface',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            })}
        >
            <div
                className={css({
                    display: 'flex',
                    flexWrap: 'wrap',
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
                                flex: '1 1 80px',
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
                                    boxShadow:
                                        '0 8px 24px color-mix(in srgb, var(--cat-color) 15%, transparent)',
                                    '& [data-cat-name]': { color: 'var(--cat-color)' },
                                },
                            })}
                            style={{ '--cat-color': color } as React.CSSProperties}
                        >
                            <div
                                className={css({
                                    width: '64px',
                                    height: '64px',
                                    borderRadius: 'xl',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '1.5',
                                    transition: 'all 200ms ease',
                                })}
                                style={{
                                    backgroundColor: `${color}18`,
                                    color,
                                }}
                            >
                                <DynamicIcon name={cat.icon} size={22} />
                                <span
                                    data-cat-count
                                    className={css({
                                        fontSize: '0.85rem',
                                        fontWeight: '700',
                                        lineHeight: '1',
                                        transition: 'color 200ms ease',
                                    })}
                                >
                                    {cat.recipeCount}
                                </span>
                            </div>
                            <span
                                data-cat-name
                                className={css({
                                    fontSize: { base: '0.75rem', md: '0.8rem' },
                                    fontWeight: '600',
                                    color: 'text',
                                    whiteSpace: 'nowrap',
                                    textAlign: 'center',
                                    lineClamp: '1',
                                    transition: 'color 200ms ease',
                                })}
                            >
                                {cat.name}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
