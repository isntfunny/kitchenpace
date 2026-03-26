'use client';

import { Search } from 'lucide-react';
import { useState } from 'react';

import { SmartImage } from '@app/components/atoms/SmartImage';
import type { MultiSearchRecipe } from '@app/lib/hooks/useMultiSearch';
import { useMultiSearch } from '@app/lib/hooks/useMultiSearch';

import { css } from 'styled-system/css';

interface RecipeSearchInlineProps {
    onSelect: (recipe: MultiSearchRecipe) => void;
    placeholder?: string;
}

export function RecipeSearchInline({
    onSelect,
    placeholder = 'Rezept suchen…',
}: RecipeSearchInlineProps) {
    const [query, setQuery] = useState('');
    const trimmed = query.trim();
    const { recipes, loading } = useMultiSearch(trimmed, {
        enabled: trimmed.length >= 2,
        types: 'recipes',
    });

    return (
        <div className={css({ position: 'relative' })}>
            <div>
                <span
                    className={css({
                        position: 'absolute',
                        left: '3',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        pointerEvents: 'none',
                        color: 'foreground.muted',
                    })}
                >
                    <Search size={14} />
                </span>
                <input
                    type="text"
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className={css({
                        w: '100%',
                        height: '36px',
                        pl: '9',
                        pr: '3',
                        border: '1px solid',
                        borderColor: 'border',
                        borderRadius: 'lg',
                        bg: 'background',
                        fontSize: 'sm',
                        outline: 'none',
                        _focus: { borderColor: 'accent' },
                    })}
                />
            </div>
            {trimmed.length >= 2 && (
                <div
                    className={css({
                        mt: '1',
                        maxH: '200px',
                        overflowY: 'auto',
                        border: '1px solid',
                        borderColor: 'border',
                        borderRadius: 'lg',
                        bg: 'surface.elevated',
                        boxShadow: 'sm',
                    })}
                >
                    {loading && (
                        <p className={css({ p: '3', fontSize: 'xs', color: 'foreground.muted' })}>
                            Suche…
                        </p>
                    )}
                    {!loading && recipes.length === 0 && (
                        <p className={css({ p: '3', fontSize: 'xs', color: 'foreground.muted' })}>
                            Keine Rezepte gefunden
                        </p>
                    )}
                    {recipes.map((recipe) => (
                        <button
                            key={recipe.id}
                            type="button"
                            onClick={() => {
                                onSelect(recipe);
                                setQuery('');
                            }}
                            className={css({
                                w: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2',
                                p: '2',
                                textAlign: 'left',
                                cursor: 'pointer',
                                _hover: { bg: 'accent.soft' },
                            })}
                        >
                            <div
                                className={css({
                                    w: '32px',
                                    h: '32px',
                                    borderRadius: 'md',
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                    bg: 'surface.muted',
                                })}
                            >
                                <SmartImage
                                    imageKey={recipe.imageKey}
                                    alt={recipe.title}
                                    aspect="1:1"
                                    sizes="32px"
                                />
                            </div>
                            <div className={css({ minW: 0, flex: 1 })}>
                                <div
                                    className={css({
                                        fontSize: 'sm',
                                        fontWeight: '600',
                                        color: 'text',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    })}
                                >
                                    {recipe.title}
                                </div>
                                <div className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                                    {recipe.category}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
