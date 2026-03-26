import Link from 'next/link';

import type { CategoryAggregateStats } from '@app/app/actions/category';

import { css } from 'styled-system/css';
import { flex } from 'styled-system/patterns';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CategoryStatsProps {
    stats: CategoryAggregateStats;
    topIngredient: string | null;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatRow({
    label,
    value,
    href,
    isLast,
}: {
    label: string;
    value: React.ReactNode;
    href?: string;
    isLast?: boolean;
}) {
    return (
        <div
            className={css({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: '4',
                py: '2.5',
                borderBottom: isLast ? 'none' : '1px solid',
                borderColor: 'border',
            })}
        >
            <span
                className={css({
                    fontSize: 'sm',
                    color: 'text.secondary',
                })}
            >
                {label}
            </span>
            {href ? (
                <Link
                    href={href}
                    className={css({
                        fontSize: 'sm',
                        fontWeight: '500',
                        color: 'brand',
                        textDecoration: 'none',
                        maxW: '140px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        _hover: { textDecoration: 'underline' },
                    })}
                >
                    {value}
                </Link>
            ) : (
                <span
                    className={css({
                        fontSize: 'sm',
                        fontWeight: '600',
                        color: 'text.primary',
                    })}
                >
                    {value}
                </span>
            )}
        </div>
    );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CategoryStats({ stats, topIngredient }: CategoryStatsProps) {
    // Build the list of rows conditionally
    const rows: Array<{
        label: string;
        value: React.ReactNode;
        href?: string;
    }> = [];

    if (stats.avgTime != null) {
        rows.push({ label: 'Ø Zubereitungszeit', value: `${stats.avgTime} Min.` });
    }

    if (stats.caloriesCoverage > 0.5 && stats.avgCalories != null) {
        rows.push({ label: 'Ø Kalorien', value: `${stats.avgCalories} kcal` });
    }

    if (topIngredient != null) {
        rows.push({ label: 'Top-Zutat', value: topIngredient });
    }

    if (stats.fastestRecipe != null) {
        rows.push({
            label: 'Schnellstes',
            value: `${stats.fastestRecipe.time} Min.`,
            href: `/recipe/${stats.fastestRecipe.slug}`,
        });
    }

    if (stats.mostPopularRecipe != null) {
        rows.push({
            label: 'Beliebtestes',
            value: stats.mostPopularRecipe.title,
            href: `/recipe/${stats.mostPopularRecipe.slug}`,
        });
    }

    if (rows.length === 0) return null;

    return (
        <div
            className={css({
                bg: 'surface.card',
                border: '1px solid',
                borderColor: 'border',
                borderRadius: '10px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                overflow: 'hidden',
            })}
        >
            <div
                className={css({
                    px: '4',
                    py: '3',
                    borderBottom: '1px solid',
                    borderColor: 'border',
                    fontWeight: '600',
                    fontSize: 'sm',
                    color: 'text.primary',
                })}
            >
                Kategorie-Statistiken
            </div>
            <div className={flex({ direction: 'column', gap: '0' })}>
                {rows.map((row, i) => (
                    <StatRow
                        key={row.label}
                        label={row.label}
                        value={row.value}
                        href={row.href}
                        isLast={i === rows.length - 1}
                    />
                ))}
            </div>
        </div>
    );
}
