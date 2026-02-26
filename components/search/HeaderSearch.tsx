'use client';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import type { RecipeFilterSearchParams } from '@/lib/recipeFilters';
import { css } from 'styled-system/css';

import { useRecipeSearch } from './useRecipeSearch';

export function HeaderSearch() {
    const router = useRouter();
    const [inputValue, setInputValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    const trimmedQuery = inputValue.trim();

    const filters = useMemo<RecipeFilterSearchParams>(
        () => ({
            query: trimmedQuery || undefined,
            limit: 5,
            page: 1,
        }),
        [trimmedQuery],
    );

    const { data, loading } = useRecipeSearch(filters, {
        enabled: trimmedQuery.length > 0,
        debounceMs: 200,
    });

    const hasResults = data.length > 0;

    const navigateToSearch = (term: string) => {
        const query = term.trim();
        const href = query ? `/recipes?query=${encodeURIComponent(query)}` : '/recipes';
        router.push(href);
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!trimmedQuery) return;
        navigateToSearch(trimmedQuery);
    };

    const handleResultClick = (slug: string) => {
        router.push(`/recipe/${slug}`);
        setInputValue('');
        setIsFocused(false);
    };

    return (
        <div className={css({ position: 'relative' })}>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    aria-label="Rezepte suchen"
                    placeholder="Was möchtest du kochen?"
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 150)}
                    className={css({
                        width: '100%',
                        padding: '2.5',
                        paddingLeft: '10',
                        borderRadius: 'full',
                        border: '1px solid',
                        borderColor: 'rgba(224,123,83,0.3)',
                        background: 'white',
                        fontSize: 'sm',
                        fontFamily: 'body',
                        outline: 'none',
                        transition: 'all 150ms ease',
                        _placeholder: { color: 'text-muted' },
                        _focus: {
                            borderColor: '#e07b53',
                            boxShadow: '0 0 0 3px rgba(224,123,83,0.1)',
                        },
                    })}
                />
                <span
                    className={css({
                        position: 'absolute',
                        right: '3',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        pointerEvents: 'none',
                    })}
                >
                    <Search size={18} color="#999" />
                </span>
            </form>

            {isFocused && (loading || hasResults) && (
                <div
                    className={css({
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        left: 0,
                        right: 0,
                        bg: 'white',
                        borderRadius: 'xl',
                        border: '1px solid',
                        borderColor: 'rgba(224,123,83,0.2)',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                        zIndex: 50,
                    })}
                >
                    <div className={css({ p: '3' })}>
                        {loading && (
                            <div
                                className={css({
                                    fontSize: 'sm',
                                    color: 'text-muted',
                                })}
                            >
                                Lädt…
                            </div>
                        )}
                        {!loading && !hasResults && (
                            <div
                                className={css({
                                    fontSize: 'sm',
                                    color: 'text-muted',
                                })}
                            >
                                Keine schnellen Treffer
                            </div>
                        )}
                        {!loading && hasResults && (
                            <div className={css({ display: 'grid', gap: '2' })}>
                                {data.map((recipe) => (
                                    <button
                                        key={recipe.id}
                                        type="button"
                                        onMouseDown={() => handleResultClick(recipe.slug)}
                                        className={css({
                                            width: '100%',
                                            textAlign: 'left',
                                            borderRadius: 'md',
                                            padding: '2.5',
                                            fontFamily: 'body',
                                            fontSize: 'sm',
                                            border: '1px solid transparent',
                                            bg: 'rgba(224,123,83,0.05)',
                                            cursor: 'pointer',
                                            transition: 'border 150ms ease',
                                            _hover: {
                                                borderColor: 'rgba(224,123,83,0.3)',
                                            },
                                        })}
                                    >
                                        <div className={css({ fontWeight: '600', color: 'text' })}>
                                            {recipe.title}
                                        </div>
                                        <div
                                            className={css({ fontSize: 'xs', color: 'text-muted' })}
                                        >
                                            {recipe.category} · {recipe.time}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {!loading && hasResults && (
                        <button
                            type="button"
                            onMouseDown={() => navigateToSearch(trimmedQuery)}
                            className={css({
                                width: '100%',
                                borderTop: '1px solid rgba(0,0,0,0.05)',
                                px: '3',
                                py: '2',
                                fontSize: 'xs',
                                fontWeight: '600',
                                color: 'primary',
                                textAlign: 'left',
                            })}
                        >
                            Alle Ergebnisse anzeigen
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
