import Link from 'next/link';

import type { TermFacet } from '@app/lib/recipeSearchTypes';

import { css } from 'styled-system/css';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TagIngredientCloudProps {
    tags: TermFacet;
    ingredients: TermFacet;
    categorySlug: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TagIngredientCloud({ tags, ingredients, categorySlug }: TagIngredientCloudProps) {
    if (tags.length + ingredients.length < 3) return null;

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
                Tags &amp; Zutaten
            </div>
            <div
                className={css({
                    px: '4',
                    py: '3',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '1.5',
                })}
            >
                {tags.map((tag) => (
                    <Link
                        key={`tag-${tag.key}`}
                        href={`/recipes?category=${categorySlug}&tags=${encodeURIComponent(tag.key)}`}
                        className={css({
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5',
                            px: '2.5',
                            py: '1',
                            borderRadius: '999px',
                            fontSize: 'xs',
                            fontWeight: '500',
                            textDecoration: 'none',
                            transition: 'opacity 0.15s',
                            bg: '#fdf2f8',
                            color: '#9d174d',
                            border: '1px solid #fbcfe8',
                            _hover: { opacity: '0.8' },
                        })}
                    >
                        <span className={css({ opacity: '0.7' })}>#</span>
                        {tag.key}
                        <span className={css({ opacity: '0.6' })}>({tag.count})</span>
                    </Link>
                ))}

                {ingredients.map((ingredient) => (
                    <Link
                        key={`ing-${ingredient.key}`}
                        href={`/recipes?category=${categorySlug}&ingredients=${encodeURIComponent(ingredient.key)}`}
                        className={css({
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5',
                            px: '2.5',
                            py: '1',
                            borderRadius: '999px',
                            fontSize: 'xs',
                            fontWeight: '500',
                            textDecoration: 'none',
                            transition: 'opacity 0.15s',
                            bg: '#fff7ed',
                            color: '#9a3412',
                            border: '1px solid #fed7aa',
                            _hover: { opacity: '0.8' },
                        })}
                    >
                        {ingredient.key}
                        <span className={css({ opacity: '0.6' })}>({ingredient.count})</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
