import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import type { RecipeCardData } from '@app/app/actions/recipes';
import { RecipeCard } from '@app/components/features/RecipeCard';
import type { FilterSetWithRelations } from '@app/lib/fits-now/db-queries';

import { css } from 'styled-system/css';
import { flex } from 'styled-system/patterns';

// ─── Props ────────────────────────────────────────────────────────────────────

interface SeasonalTeaserBarProps {
    period: FilterSetWithRelations;
    recipes: RecipeCardData[];
    categorySlug: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SeasonalTeaserBar({ period, recipes, categorySlug }: SeasonalTeaserBarProps) {
    if (recipes.length === 0) return null;

    const displayed = recipes.slice(0, 4);

    const tagNames = period.tags.map((t) => t.tag.name);
    const tagParam = tagNames.length > 0 ? `&tags=${tagNames.join(',')}` : '';
    const allHref = `/recipes?category=${categorySlug}${tagParam}`;

    return (
        <div
            className={css({
                width: '100%',
                background: 'linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%)',
                py: { base: '5', md: '6' },
            })}
        >
            {/* Centered inner container */}
            <div
                className={css({
                    maxW: '1400px',
                    mx: 'auto',
                    px: { base: '4', md: '6' },
                })}
            >
                {/* Desktop layout: label | cards | link */}
                <div
                    className={flex({
                        direction: { base: 'column', md: 'row' },
                        align: { base: 'flex-start', md: 'center' },
                        gap: { base: '4', md: '6' },
                    })}
                >
                    {/* Left: label + description */}
                    <div
                        className={css({
                            flex: '0 0 auto',
                            minW: { md: '160px' },
                            maxW: { md: '200px' },
                        })}
                    >
                        <p
                            className={css({
                                fontWeight: '700',
                                fontSize: 'md',
                                color: '#5d4037',
                                lineHeight: '1.2',
                            })}
                        >
                            {period.label}
                        </p>
                        {period.description && (
                            <p
                                className={css({
                                    fontSize: 'sm',
                                    color: '#8d6e63',
                                    mt: '1',
                                    lineHeight: '1.4',
                                })}
                            >
                                {period.description}
                            </p>
                        )}
                    </div>

                    {/* Center: recipe cards */}
                    <div
                        className={css({
                            flex: '1',
                            display: 'flex',
                            flexDirection: 'row',
                            gap: '3',
                            overflowX: { base: 'auto', md: 'visible' },
                            scrollSnapType: { base: 'x mandatory', md: 'none' },
                            pb: { base: '1', md: '0' },
                            // Hide scrollbar on mobile while keeping scrollability
                            scrollbarWidth: 'none',
                            '&::-webkit-scrollbar': { display: 'none' },
                        })}
                    >
                        {displayed.map((recipe) => (
                            <div
                                key={recipe.id}
                                className={css({
                                    flex: '0 0 auto',
                                    w: { base: '130px', md: '150px' },
                                    scrollSnapAlign: { base: 'start', md: 'none' },
                                })}
                            >
                                <RecipeCard recipe={recipe} variant="compact" hideCategory={true} />
                            </div>
                        ))}
                    </div>

                    {/* Right: "Alle →" link */}
                    <div
                        className={css({
                            flex: '0 0 auto',
                        })}
                    >
                        <Link
                            href={allHref}
                            className={css({
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '1',
                                fontWeight: '600',
                                fontSize: 'sm',
                                color: '#bf8600',
                                textDecoration: 'none',
                                whiteSpace: 'nowrap',
                                _hover: { color: '#7a5500' },
                                transition: 'color 0.15s ease',
                            })}
                        >
                            Alle
                            <ArrowRight size={14} />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
