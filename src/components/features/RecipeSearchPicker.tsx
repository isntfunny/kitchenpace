'use client';

import { Search, X } from 'lucide-react';
import { useState } from 'react';

import { SmartImage } from '@app/components/atoms/SmartImage';
import type { MultiSearchRecipe } from '@app/lib/hooks/useMultiSearch';
import { useMultiSearch } from '@app/lib/hooks/useMultiSearch';

import { css } from 'styled-system/css';

export type SelectedRecipe = Pick<
    MultiSearchRecipe,
    'id' | 'slug' | 'title' | 'category' | 'totalTime' | 'imageKey'
>;

interface RecipeSearchPickerProps {
    selected: SelectedRecipe | null;
    onSelect: (recipe: SelectedRecipe) => void;
    onClear: () => void;
    placeholder?: string;
}

export function RecipeSearchPicker({
    selected,
    onSelect,
    onClear,
    placeholder = 'Rezept suchen…',
}: RecipeSearchPickerProps) {
    const [inputValue, setInputValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    const trimmedQuery = inputValue.trim();

    const { recipes, loading } = useMultiSearch(trimmedQuery, {
        enabled: isFocused && trimmedQuery.length >= 2,
        types: 'recipes',
    });

    const showDropdown = isFocused && trimmedQuery.length >= 2;

    const handleSelect = (recipe: MultiSearchRecipe) => {
        onSelect({
            id: recipe.id,
            slug: recipe.slug,
            title: recipe.title,
            category: recipe.category,
            totalTime: recipe.totalTime,
            imageKey: recipe.imageKey,
        });
        setInputValue('');
        setIsFocused(false);
    };

    // Show rich preview when a recipe is selected
    if (selected) {
        return (
            <div
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3',
                    p: '3',
                    borderRadius: 'xl',
                    border: '1px solid',
                    borderColor: 'social.twitch',
                    bg: 'background',
                    transition: 'all 150ms ease',
                })}
            >
                <div
                    className={css({
                        width: '48px',
                        height: '48px',
                        borderRadius: 'lg',
                        overflow: 'hidden',
                        flexShrink: 0,
                        bg: 'surface.muted',
                    })}
                >
                    <SmartImage
                        imageKey={selected.imageKey}
                        alt={selected.title}
                        aspect="1:1"
                        sizes="48px"
                    />
                </div>
                <div className={css({ minWidth: 0, flex: 1 })}>
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
                        {selected.title}
                    </div>
                    <div className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                        {selected.category} · {selected.totalTime} Min.
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClear}
                    className={css({
                        flexShrink: 0,
                        p: '1.5',
                        borderRadius: 'md',
                        color: 'foreground.muted',
                        cursor: 'pointer',
                        background: 'transparent',
                        border: 'none',
                        transition: 'all 150ms ease',
                        _hover: { color: 'text', bg: 'surface.muted' },
                    })}
                >
                    <X size={16} />
                </button>
            </div>
        );
    }

    // Show search input with dropdown
    return (
        <div className={css({ position: 'relative' })}>
            <div className={css({ position: 'relative' })}>
                <input
                    type="text"
                    aria-label="Rezept suchen"
                    placeholder={placeholder}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 150)}
                    className={css({
                        width: '100%',
                        height: '44px',
                        pl: '11',
                        pr: '4',
                        borderRadius: 'xl',
                        border: '1px solid',
                        borderColor: 'border',
                        bg: 'background',
                        fontSize: 'sm',
                        fontFamily: 'body',
                        outline: 'none',
                        transition: 'all 150ms ease',
                        _placeholder: { color: 'text.muted' },
                        _focus: {
                            borderColor: 'social.twitch',
                            boxShadow: '0 0 0 3px rgba(145,70,255,0.15)',
                        },
                    })}
                />
                <span
                    className={css({
                        position: 'absolute',
                        left: '3.5',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        pointerEvents: 'none',
                        color: 'foreground.muted',
                    })}
                >
                    <Search size={16} />
                </span>
            </div>

            {showDropdown && (
                <div
                    className={css({
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: 0,
                        right: 0,
                        maxHeight: '280px',
                        overflowY: 'auto',
                        background: 'surface.elevated',
                        borderRadius: 'xl',
                        border: '1px solid',
                        borderColor: 'border',
                        boxShadow: {
                            base: '0 12px 32px rgba(0,0,0,0.1)',
                            _dark: '0 12px 32px rgba(0,0,0,0.35)',
                        },
                        zIndex: 50,
                    })}
                >
                    {loading && (
                        <div
                            className={css({
                                p: '4',
                                fontSize: 'sm',
                                color: 'foreground.muted',
                                fontFamily: 'body',
                            })}
                        >
                            Suche…
                        </div>
                    )}

                    {!loading && recipes.length === 0 && (
                        <div
                            className={css({
                                p: '4',
                                fontSize: 'sm',
                                color: 'foreground.muted',
                                fontFamily: 'body',
                            })}
                        >
                            Keine Rezepte gefunden
                        </div>
                    )}

                    {!loading && recipes.length > 0 && (
                        <div className={css({ p: '2', display: 'grid', gap: '1' })}>
                            {recipes.map((recipe) => (
                                <button
                                    key={recipe.id}
                                    type="button"
                                    onMouseDown={() => handleSelect(recipe)}
                                    className={css({
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3',
                                        textAlign: 'left',
                                        borderRadius: 'lg',
                                        padding: '2',
                                        fontFamily: 'body',
                                        cursor: 'pointer',
                                        border: '1px solid transparent',
                                        background: 'transparent',
                                        transition: 'all 150ms ease',
                                        _hover: {
                                            bg: 'accent.soft',
                                            borderColor: 'border',
                                        },
                                    })}
                                >
                                    <div
                                        className={css({
                                            width: '40px',
                                            height: '40px',
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
                                            sizes="40px"
                                        />
                                    </div>
                                    <div className={css({ minWidth: 0, flex: 1 })}>
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
                                        <div
                                            className={css({
                                                fontSize: 'xs',
                                                color: 'foreground.muted',
                                            })}
                                        >
                                            {recipe.category} · {recipe.totalTime} Min.
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
