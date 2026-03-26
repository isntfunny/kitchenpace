import { Tags } from 'lucide-react';
import Link from 'next/link';

import { Heading } from '@app/components/atoms/Typography';
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
                p: 'card',
                bg: 'surface',
                borderRadius: 'surface',
                boxShadow: 'shadow.medium',
            })}
        >
            <div className={css({ mb: '3' })}>
                <Heading
                    as="h3"
                    size="md"
                    className={css({
                        color: { base: '#6c5ce7', _dark: '#a29bfe' },
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                    })}
                >
                    <Tags size={18} />
                    <span>Tags &amp; Zutaten</span>
                </Heading>
            </div>
            <div
                className={css({
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '1.5',
                })}
            >
                {[
                    ...tags.map((t) => ({ ...t, type: 'tag' as const })),
                    ...ingredients.map((i) => ({ ...i, type: 'ingredient' as const })),
                ]
                    .sort((a, b) => b.count - a.count)
                    .map((item) => (
                        <Link
                            key={`${item.type}-${item.key}`}
                            href={
                                item.type === 'tag'
                                    ? `/recipes?category=${categorySlug}&tags=${encodeURIComponent(item.key)}`
                                    : `/recipes?category=${categorySlug}&ingredients=${encodeURIComponent(item.key)}`
                            }
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
                                bg: item.type === 'tag' ? '#fdf2f8' : '#fff7ed',
                                color: item.type === 'tag' ? '#9d174d' : '#9a3412',
                                border:
                                    item.type === 'tag' ? '1px solid #fbcfe8' : '1px solid #fed7aa',
                                _hover: { opacity: '0.8' },
                            })}
                        >
                            {item.type === 'tag' && (
                                <span className={css({ opacity: '0.7' })}>#</span>
                            )}
                            {item.key}
                            <span className={css({ opacity: '0.6' })}>({item.count})</span>
                        </Link>
                    ))}
            </div>
        </div>
    );
}
