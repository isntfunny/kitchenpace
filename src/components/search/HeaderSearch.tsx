'use client';

import { BookOpen, Carrot, Search, Tag, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Avatar } from '@app/components/atoms/Avatar';
import { SmartImage } from '@app/components/atoms/SmartImage';
import { buildRecipeFilterHref } from '@app/lib/recipeFilters';

import { css } from 'styled-system/css';

import type { MultiSearchRecipe, MultiSearchUser, SuggestItem } from './useMultiSearch';
import { useMultiSearch } from './useMultiSearch';

export function HeaderSearch() {
    const router = useRouter();
    const [inputValue, setInputValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    const trimmedQuery = inputValue.trim();

    const { recipes, ingredients, tags, users, loading } = useMultiSearch(trimmedQuery, {
        enabled: isFocused && trimmedQuery.length >= 2,
    });

    const hasAnyResults =
        recipes.length > 0 || ingredients.length > 0 || tags.length > 0 || users.length > 0;
    const showDropdown =
        isFocused && trimmedQuery.length >= 2 && (loading || hasAnyResults || !loading);

    const navigate = (href: string) => {
        router.push(href);
        setInputValue('');
        setIsFocused(false);
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!trimmedQuery) return;
        navigate(`/recipes?query=${encodeURIComponent(trimmedQuery)}`);
    };

    return (
        <div className={css({ position: 'relative', zIndex: 10 })}>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    aria-label="Rezepte suchen"
                    placeholder="Rezepte, Zutaten, Tags suchen…"
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 150)}
                    className={css({
                        width: '100%',
                        height: '44px',
                        paddingLeft: '4',
                        paddingRight: '10',
                        borderRadius: 'full',
                        border: '1px solid',
                        borderColor: 'border',
                        background: 'surface.elevated',
                        fontSize: 'sm',
                        fontFamily: 'body',
                        outline: 'none',
                        transition: 'all 150ms ease',
                        _placeholder: { color: 'text.muted' },
                        _focus: {
                            borderColor: 'accent',
                            boxShadow: {
                                base: '0 0 0 3px rgba(224,123,83,0.15)',
                                _dark: '0 0 0 3px rgba(224,123,83,0.12)',
                            },
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
                        color: 'foreground.muted',
                    })}
                >
                    <Search size={18} color="currentColor" />
                </span>
            </form>

            {showDropdown && (
                <div
                    className={css({
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        left: 0,
                        right: 0,
                        minWidth: '360px',
                        maxHeight: '420px',
                        overflowY: 'auto',
                        background: 'surface.elevated',
                        borderRadius: 'xl',
                        border: '1px solid',
                        borderColor: 'border',
                        boxShadow: {
                            base: '0 20px 40px rgba(0,0,0,0.1)',
                            _dark: '0 20px 40px rgba(0,0,0,0.35)',
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

                    {!loading && !hasAnyResults && (
                        <div
                            className={css({
                                p: '4',
                                fontSize: 'sm',
                                color: 'foreground.muted',
                                fontFamily: 'body',
                            })}
                        >
                            Keine Ergebnisse gefunden
                        </div>
                    )}

                    {!loading && hasAnyResults && (
                        <>
                            {recipes.length > 0 && (
                                <RecipeSection
                                    recipes={recipes}
                                    onSelect={(slug) => navigate(`/recipe/${slug}`)}
                                />
                            )}

                            {ingredients.length > 0 && (
                                <SuggestSection
                                    icon={<Carrot size={14} />}
                                    title="Zutaten"
                                    items={ingredients}
                                    onSelect={(name) =>
                                        navigate(buildRecipeFilterHref({ ingredients: [name] }))
                                    }
                                />
                            )}

                            {tags.length > 0 && (
                                <SuggestSection
                                    icon={<Tag size={14} />}
                                    title="Tags"
                                    items={tags}
                                    onSelect={(name) =>
                                        navigate(buildRecipeFilterHref({ tags: [name] }))
                                    }
                                />
                            )}

                            {users.length > 0 && (
                                <UserSection
                                    users={users}
                                    onSelect={(slug) => navigate(`/user/${slug}`)}
                                />
                            )}
                        </>
                    )}

                    {!loading && hasAnyResults && (
                        <button
                            type="button"
                            onMouseDown={() =>
                                navigate(`/recipes?query=${encodeURIComponent(trimmedQuery)}`)
                            }
                            className={css({
                                width: '100%',
                                borderTop: '1px solid',
                                borderColor: 'border',
                                px: '4',
                                py: '2.5',
                                fontSize: 'xs',
                                fontWeight: '600',
                                fontFamily: 'body',
                                color: 'primary',
                                textAlign: 'left',
                                cursor: 'pointer',
                                background: 'transparent',
                                transition: 'background 150ms ease',
                                _hover: { bg: 'accent.soft' },
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

/* ── Section: Recipes ──────────────────────────────────── */

function RecipeSection({
    recipes,
    onSelect,
}: {
    recipes: MultiSearchRecipe[];
    onSelect: (slug: string) => void;
}) {
    return (
        <div className={css({ borderBottom: '1px solid', borderColor: 'border' })}>
            <SectionHeader icon={<BookOpen size={14} />} title="Rezepte" />
            <div className={css({ px: '2', pb: '2', display: 'grid', gap: '1' })}>
                {recipes.map((recipe) => (
                    <button
                        key={recipe.id}
                        type="button"
                        onMouseDown={() => onSelect(recipe.slug)}
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
                                width: '48px',
                                height: '48px',
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
                                {recipe.title}
                            </div>
                            <div className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                                {recipe.category} · {recipe.totalTime} Min.
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

/* ── Section: Users ────────────────────────────────────── */

function UserSection({
    users,
    onSelect,
}: {
    users: MultiSearchUser[];
    onSelect: (slug: string) => void;
}) {
    return (
        <div
            className={css({
                borderBottom: '1px solid',
                borderColor: 'border',
                _last: { borderBottom: 'none' },
            })}
        >
            <SectionHeader icon={<User size={14} />} title="Profile" />
            <div className={css({ px: '2', pb: '2', display: 'grid', gap: '1' })}>
                {users.map((user) => (
                    <button
                        key={user.id}
                        type="button"
                        onMouseDown={() => onSelect(user.slug)}
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
                            _hover: { bg: 'accent.soft', borderColor: 'border' },
                        })}
                    >
                        <Avatar
                            imageKey={user.photoKey}
                            name={user.nickname}
                            size={36}
                            fallbackType="user"
                        />
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
                                {user.nickname}
                            </div>
                            <div className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                                {user.recipeCount} {user.recipeCount === 1 ? 'Rezept' : 'Rezepte'}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

/* ── Section: Suggest (Ingredients / Tags) ─────────────── */

function SuggestSection({
    icon,
    title,
    items,
    onSelect,
}: {
    icon: React.ReactNode;
    title: string;
    items: SuggestItem[];
    onSelect: (name: string) => void;
}) {
    return (
        <div
            className={css({
                borderBottom: '1px solid',
                borderColor: 'border',
                _last: { borderBottom: 'none' },
            })}
        >
            <SectionHeader icon={icon} title={title} />
            <div className={css({ px: '2', pb: '2', display: 'grid', gap: '1' })}>
                {items.map((item) => (
                    <button
                        key={item.name}
                        type="button"
                        onMouseDown={() => onSelect(item.name)}
                        className={css({
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            textAlign: 'left',
                            borderRadius: 'lg',
                            px: '3',
                            py: '2',
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
                        <span className={css({ fontSize: 'sm', color: 'text', fontWeight: '500' })}>
                            {item.name}
                        </span>
                        <span
                            className={css({
                                fontSize: 'xs',
                                color: 'foreground.muted',
                                flexShrink: 0,
                                ml: '3',
                            })}
                        >
                            {item.count} {item.count === 1 ? 'Rezept' : 'Rezepte'}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}

/* ── Section Header ────────────────────────────────────── */

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
    return (
        <div
            className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '2',
                px: '4',
                pt: '3',
                pb: '1.5',
            })}
        >
            <span className={css({ color: 'primary', display: 'flex' })}>{icon}</span>
            <span
                className={css({
                    fontSize: 'xs',
                    fontWeight: '600',
                    fontFamily: 'body',
                    color: 'foreground.muted',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                })}
            >
                {title}
            </span>
        </div>
    );
}
