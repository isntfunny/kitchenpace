'use client';

import {
    Activity,
    Bookmark,
    ChefHat,
    Clock,
    Flame,
    Star,
    TrendingUp,
    Utensils,
    type LucideIcon,
} from 'lucide-react';
import * as icons from 'lucide-react';
import Link from 'next/link';
import { createElement } from 'react';

import type { ActivityFeedItem } from '@app/app/actions/community';
import type { RecipeCardData } from '@app/app/actions/recipes';
import { ActivityList } from '@app/components/features/ActivitySidebar';
import { HorizontalRecipeScroll } from '@app/components/features/HorizontalRecipeScroll';
import { css } from 'styled-system/css';
import { flex, grid } from 'styled-system/patterns';

import type { CategoryPageData } from '../../actions/category';

// ─── Icon resolver ───────────────────────────────────────────────────────────

function resolveLucideIcon(iconName: string | null): LucideIcon {
    if (!iconName) return Utensils;
    const pascal = iconName
        .split('-')
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join('');
    const icon = (icons as Record<string, unknown>)[pascal];
    return (icon as LucideIcon) ?? Utensils;
}

function CategoryIcon({ name, size, color: iconColor }: { name: string | null; size: number; color?: string }) {
    return createElement(resolveLucideIcon(name), { size, color: iconColor });
}

// ─── Stat Pill ───────────────────────────────────────────────────────────────

function StatPill({
    icon: Icon,
    label,
    value,
    color,
}: {
    icon: LucideIcon;
    label: string;
    value: string | number;
    color: string;
}) {
    return (
        <div
            className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '2',
                bg: 'surface.card',
                px: '4',
                py: '2.5',
                borderRadius: 'xl',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                border: '1px solid',
                borderColor: 'border',
            })}
        >
            <div
                className={css({
                    width: '32px',
                    height: '32px',
                    borderRadius: 'lg',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                })}
                style={{ backgroundColor: `${color}20`, color }}
            >
                <Icon size={16} />
            </div>
            <div>
                <div className={css({ fontSize: 'lg', fontWeight: '700', lineHeight: '1.2', color: 'text' })}>
                    {value}
                </div>
                <div className={css({ fontSize: '0.7rem', color: 'text-muted', lineHeight: '1.2' })}>
                    {label}
                </div>
            </div>
        </div>
    );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function RecipeSection({
    title,
    icon: Icon,
    recipes,
    accentColor,
}: {
    title: string;
    icon: LucideIcon;
    recipes: RecipeCardData[];
    accentColor: string;
}) {
    if (recipes.length === 0) return null;

    return (
        <div className={css({ mt: '5' })}>
            <div
                className={flex({
                    align: 'center',
                    gap: '3',
                    mb: '4',
                })}
            >
                <div
                    className={css({
                        width: '36px',
                        height: '36px',
                        borderRadius: 'lg',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                    })}
                    style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                >
                    <Icon size={20} />
                </div>
                <h2
                    className={css({
                        fontFamily: 'heading',
                        fontSize: 'xl',
                        fontWeight: '600',
                        color: 'text',
                    })}
                >
                    {title}
                </h2>
            </div>
            <HorizontalRecipeScroll recipes={recipes} hideCategory={true} />
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface CategoryLandingProps {
    category: CategoryPageData;
    newest: RecipeCardData[];
    topRated: RecipeCardData[];
    mostCooked: RecipeCardData[];
    quick: RecipeCardData[];
    popular: RecipeCardData[];
    activity: ActivityFeedItem[];
}

export function CategoryLanding({
    category,
    newest,
    topRated,
    mostCooked,
    quick,
    popular,
    activity,
}: CategoryLandingProps) {
    const color = category.color;

    return (
        <div className={css({ minH: '100vh', color: 'text' })}>
            {/* ── Hero Banner ── */}
            <div
                className={css({
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: { base: '0', md: '2xl' },
                    mx: { base: '0', md: '6' },
                    mt: { base: '0', md: '5' },
                })}
                style={{
                    background: `linear-gradient(135deg, ${color}, ${color}dd, ${color}aa)`,
                }}
            >
                {/* Decorative circles */}
                <div
                    className={css({
                        position: 'absolute',
                        top: '-40px',
                        right: '-40px',
                        width: '200px',
                        height: '200px',
                        borderRadius: 'full',
                        opacity: 0.15,
                    })}
                    style={{ backgroundColor: 'white' }}
                />
                <div
                    className={css({
                        position: 'absolute',
                        bottom: '-60px',
                        left: '20%',
                        width: '300px',
                        height: '300px',
                        borderRadius: 'full',
                        opacity: 0.08,
                    })}
                    style={{ backgroundColor: 'white' }}
                />

                <div
                    className={css({
                        position: 'relative',
                        zIndex: 1,
                        px: { base: '5', md: '8' },
                        py: { base: '8', md: '10' },
                        maxW: '1400px',
                        mx: 'auto',
                    })}
                >
                    <div className={flex({ align: 'center', gap: '3', mb: '3' })}>
                        <div
                            className={css({
                                width: '48px',
                                height: '48px',
                                borderRadius: 'xl',
                                bg: 'rgba(255,255,255,0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backdropFilter: 'blur(8px)',
                            })}
                        >
                            <CategoryIcon name={category.icon} size={24} color="white" />
                        </div>
                        <div>
                            <h1
                                className={css({
                                    fontFamily: 'heading',
                                    fontSize: { base: '2xl', md: '4xl' },
                                    fontWeight: '700',
                                    color: 'white',
                                    lineHeight: '1.1',
                                })}
                            >
                                {category.name}
                            </h1>
                        </div>
                    </div>

                    {category.description && (
                        <p
                            className={css({
                                color: 'rgba(255,255,255,0.9)',
                                fontSize: { base: 'sm', md: 'md' },
                                maxW: '600px',
                                lineHeight: '1.6',
                                mb: '5',
                            })}
                        >
                            {category.description}
                        </p>
                    )}

                    {/* Stats row */}
                    <div
                        className={flex({
                            gap: '3',
                            flexWrap: 'wrap',
                        })}
                    >
                        <StatPill
                            icon={ChefHat}
                            label="Rezepte"
                            value={category.recipeCount}
                            color={color}
                        />
                        {category.stats.totalCooks > 0 && (
                            <StatPill
                                icon={Flame}
                                label="Mal gekocht"
                                value={category.stats.totalCooks}
                                color={color}
                            />
                        )}
                        {category.stats.avgRating > 0 && (
                            <StatPill
                                icon={Star}
                                label="Bewertung"
                                value={`${category.stats.avgRating} ★`}
                                color={color}
                            />
                        )}
                        {category.stats.totalRatings > 0 && (
                            <StatPill
                                icon={Bookmark}
                                label="Bewertungen"
                                value={category.stats.totalRatings}
                                color={color}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* ── Content ── */}
            <main
                className={css({
                    maxW: '1400px',
                    mx: 'auto',
                    px: { base: '4', md: '6' },
                    py: { base: '4', md: '5' },
                })}
            >
                <div
                    className={grid({
                        columns: { base: 1, lg: 12 },
                        gap: '4',
                    })}
                >
                    {/* Left column — recipe sections */}
                    <div className={css({ lg: { gridColumn: 'span 8' } })}>
                        <RecipeSection
                            title="Neueste Rezepte"
                            icon={Clock}
                            recipes={newest}
                            accentColor={color}
                        />

                        <RecipeSection
                            title="Am beliebtesten"
                            icon={TrendingUp}
                            recipes={popular}
                            accentColor={color}
                        />

                        <RecipeSection
                            title="Bestbewertet"
                            icon={Star}
                            recipes={topRated}
                            accentColor={color}
                        />

                        <RecipeSection
                            title="Am meisten gekocht"
                            icon={Flame}
                            recipes={mostCooked}
                            accentColor={color}
                        />

                        <RecipeSection
                            title="Schnell & einfach"
                            icon={Clock}
                            recipes={quick}
                            accentColor={color}
                        />
                    </div>

                    {/* Right column — activity sidebar */}
                    <div className={css({ lg: { gridColumn: 'span 4' } })}>
                        {activity.length > 0 && (
                            <aside
                                className={css({
                                    p: '5',
                                    borderRadius: '2xl',
                                    bg: 'surface',
                                    boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                                    height: 'fit-content',
                                    position: 'sticky',
                                    top: '100px',
                                })}
                            >
                                <div className={css({ mb: '4' })}>
                                    <h3
                                        className={css({
                                            fontFamily: 'heading',
                                            fontSize: 'xl',
                                            fontWeight: '600',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                        })}
                                        style={{ color }}
                                    >
                                        <Activity size={18} />
                                        <span>Aktivität</span>
                                    </h3>
                                    <p
                                        className={css({
                                            fontSize: '0.75rem',
                                            color: 'text-muted',
                                        })}
                                    >
                                        Was gerade in {category.name} passiert
                                    </p>
                                </div>

                                <ActivityList activities={activity} />
                            </aside>
                        )}

                        {/* Browse all link */}
                        <div className={css({ mt: '4' })}>
                            <Link
                                href={`/recipes?category=${category.slug}`}
                                className={css({
                                    display: 'block',
                                    width: '100%',
                                    py: '3',
                                    textAlign: 'center',
                                    fontSize: 'sm',
                                    fontWeight: '600',
                                    color: 'white',
                                    border: 'none',
                                    cursor: 'pointer',
                                    borderRadius: 'xl',
                                    textDecoration: 'none',
                                    transition: 'all 200ms ease',
                                    _hover: {
                                        transform: 'translateY(-2px)',
                                        opacity: 0.9,
                                    },
                                })}
                                style={{ backgroundColor: color }}
                            >
                                Alle {category.name}-Rezepte durchsuchen
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
