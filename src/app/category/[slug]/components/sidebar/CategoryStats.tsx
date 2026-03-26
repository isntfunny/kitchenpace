import { BarChart3, Clock, Crown, Flame, Leaf, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

import type { CategoryAggregateStats } from '@app/app/actions/category';
import { Heading, Text } from '@app/components/atoms/Typography';

import { css } from 'styled-system/css';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CategoryStatsProps {
    stats: CategoryAggregateStats;
    topIngredient: string | null;
    categorySlug: string;
}

interface StatItem {
    icon: LucideIcon;
    iconBg: string;
    title: string;
    content: string;
    href?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CategoryStats({ stats, topIngredient, categorySlug }: CategoryStatsProps) {
    const items: StatItem[] = [];

    if (stats.avgTime != null) {
        items.push({
            icon: Clock,
            iconBg: '#6c5ce7',
            title: `${stats.avgTime} Min.`,
            content: 'Durchschnittliche Zubereitungszeit',
        });
    }

    if (stats.caloriesCoverage > 0.5 && stats.avgCalories != null) {
        items.push({
            icon: Flame,
            iconBg: '#e17055',
            title: `${stats.avgCalories} kcal`,
            content: 'Durchschnittliche Kalorien',
        });
    }

    if (topIngredient != null) {
        items.push({
            icon: Leaf,
            iconBg: '#00b894',
            title: topIngredient,
            content: 'Meistverwendete Zutat',
            href: `/recipes?category=${categorySlug}&ingredients=${encodeURIComponent(topIngredient)}`,
        });
    }

    if (stats.fastestRecipe != null) {
        items.push({
            icon: Zap,
            iconBg: '#fdcb6e',
            title: stats.fastestRecipe.title,
            content: `Schnellstes Rezept · ${stats.fastestRecipe.time} Min.`,
            href: `/recipe/${stats.fastestRecipe.slug}`,
        });
    }

    if (stats.mostPopularRecipe != null) {
        items.push({
            icon: Crown,
            iconBg: '#fd79a8',
            title: stats.mostPopularRecipe.title,
            content: 'Beliebtestes Rezept',
            href: `/recipe/${stats.mostPopularRecipe.slug}`,
        });
    }

    if (items.length === 0) return null;

    return (
        <div
            className={css({
                p: 'card',
                borderRadius: 'surface',
                bg: 'surface',
                boxShadow: 'shadow.medium',
            })}
        >
            <div className={css({ mb: '2' })}>
                <Heading
                    as="h3"
                    size="md"
                    className={css({
                        color: { base: '#00b894', _dark: '#55efc4' },
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                    })}
                >
                    <BarChart3 size={18} />
                    <span>Statistiken</span>
                </Heading>
            </div>

            <div className={css({ display: 'flex', flexDirection: 'column', gap: '2' })}>
                {items.map((item) => {
                    const Icon = item.icon;
                    const inner = (
                        <div
                            className={css({
                                display: 'flex',
                                gap: '2',
                                p: '2',
                                borderRadius: 'lg',
                                _hover: { bg: 'surface.muted' },
                                transition: 'background 150ms ease',
                            })}
                        >
                            <span
                                className={css({
                                    flexShrink: 0,
                                    width: '36px',
                                    height: '36px',
                                    display: 'grid',
                                    placeItems: 'center',
                                    borderRadius: 'full',
                                })}
                                style={{ background: item.iconBg }}
                            >
                                <Icon size={18} color="white" />
                            </span>
                            <div>
                                <Text
                                    size="sm"
                                    className={css({ fontWeight: '600', color: 'text' })}
                                >
                                    {item.title}
                                </Text>
                                <Text size="sm" color="muted">
                                    {item.content}
                                </Text>
                            </div>
                        </div>
                    );

                    if (item.href) {
                        return (
                            <Link
                                key={item.content}
                                href={item.href}
                                className={css({ textDecoration: 'none', color: 'inherit' })}
                            >
                                {inner}
                            </Link>
                        );
                    }
                    return <div key={item.content}>{inner}</div>;
                })}
            </div>
        </div>
    );
}
