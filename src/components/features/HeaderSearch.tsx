'use client';

import { BookOpen, Carrot, Search, Sparkles, Tag, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Avatar } from '@app/components/atoms/Avatar';
import { SmartImage } from '@app/components/atoms/SmartImage';
import type {
    MultiSearchRecipe,
    MultiSearchUser,
    SuggestItem,
} from '@app/lib/hooks/useStreamingSearch';
import { useStreamingSearch } from '@app/lib/hooks/useStreamingSearch';
import { buildRecipeFilterHref } from '@app/lib/recipeFilters';

import { css } from 'styled-system/css';

import './header-search.css';

// ── Main Component ───────────────────────────────────────────────────────────

export function HeaderSearch() {
    const router = useRouter();
    const [inputValue, setInputValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    const trimmedQuery = inputValue.trim();

    const { recipes, semanticRecipes, ingredients, tags, users, phase, progress, hasSemantic } =
        useStreamingSearch(trimmedQuery, {
            enabled: isFocused && trimmedQuery.length >= 2,
        });

    const hasAnyResults =
        recipes.length > 0 ||
        semanticRecipes.length > 0 ||
        ingredients.length > 0 ||
        tags.length > 0 ||
        users.length > 0;

    const isActive = phase !== 'idle';
    const showDropdown = isFocused && trimmedQuery.length >= 2 && isActive;

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
                <div className={css({ position: 'relative' })}>
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

                    {/* Icon area: dots while debouncing, pulsing search while searching, static otherwise */}
                    <span
                        className={css({
                            position: 'absolute',
                            right: '3',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            pointerEvents: 'none',
                            color: 'foreground.muted',
                            display: 'flex',
                            alignItems: 'center',
                        })}
                    >
                        {phase === 'debouncing' ? (
                            <TypingDots />
                        ) : (
                            <Search
                                size={18}
                                color="currentColor"
                                className={
                                    phase === 'searching'
                                        ? css({
                                              animation: 'searchPulse 1.2s ease-in-out infinite',
                                          })
                                        : undefined
                                }
                            />
                        )}
                    </span>

                    {/* Progress bar */}
                    {phase === 'searching' && (
                        <div
                            className={css({
                                position: 'absolute',
                                bottom: 0,
                                left: '16px',
                                right: '16px',
                                height: '3px',
                                borderRadius: 'full',
                                overflow: 'hidden',
                            })}
                        >
                            <div
                                className={css({
                                    height: '100%',
                                    bg: 'accent',
                                    borderRadius: 'full',
                                    transition: 'width 300ms ease',
                                })}
                                style={{ width: `${progress * 100}%` }}
                            />
                        </div>
                    )}
                </div>
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
                    {/* Semantic section (top) — skeleton or real results */}
                    {hasSemantic && (
                        <>
                            {semanticRecipes.length > 0 ? (
                                <RecipeSection
                                    icon={<Sparkles size={14} />}
                                    title="Das könnte passen"
                                    recipes={semanticRecipes}
                                    onSelect={(slug) => navigate(`/recipe/${slug}`)}
                                />
                            ) : (
                                phase === 'searching' && (
                                    <RecipeSkeletonSection
                                        title="Das könnte passen"
                                        icon={<Sparkles size={14} />}
                                        count={3}
                                    />
                                )
                            )}
                        </>
                    )}

                    {/* Recipe section — skeleton or real results */}
                    {recipes.length > 0 ? (
                        <RecipeSection
                            icon={<BookOpen size={14} />}
                            title="Rezepte"
                            recipes={recipes}
                            onSelect={(slug) => navigate(`/recipe/${slug}`)}
                        />
                    ) : (
                        phase === 'searching' && (
                            <RecipeSkeletonSection
                                title="Rezepte"
                                icon={<BookOpen size={14} />}
                                count={3}
                            />
                        )
                    )}

                    {/* Suggest sections — skeleton or real */}
                    {ingredients.length > 0 ? (
                        <SuggestSection
                            icon={<Carrot size={14} />}
                            title="Zutaten"
                            items={ingredients}
                            onSelect={(name) =>
                                navigate(buildRecipeFilterHref({ ingredients: [name] }))
                            }
                        />
                    ) : (
                        phase === 'searching' && tags.length === 0 && <SuggestSkeletonSection />
                    )}

                    {tags.length > 0 && (
                        <SuggestSection
                            icon={<Tag size={14} />}
                            title="Tags"
                            items={tags}
                            onSelect={(name) => navigate(buildRecipeFilterHref({ tags: [name] }))}
                        />
                    )}

                    {/* User section */}
                    {users.length > 0 && (
                        <UserSection users={users} onSelect={(slug) => navigate(`/user/${slug}`)} />
                    )}

                    {/* No results message */}
                    {phase === 'done' && !hasAnyResults && (
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

                    {/* "View all" button */}
                    {phase === 'done' && hasAnyResults && (
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

/* ── Typing Dots Animation ────────────────────────────── */

function TypingDots() {
    return (
        <span className={css({ display: 'flex', gap: '1', alignItems: 'center' })}>
            {[0, 1, 2].map((i) => (
                <span
                    key={i}
                    className={css({
                        width: '4px',
                        height: '4px',
                        borderRadius: 'full',
                        bg: 'foreground.muted',
                        animation: 'searchDotBounce 1.2s ease-in-out infinite',
                    })}
                    style={{ animationDelay: `${i * 0.15}s` }}
                />
            ))}
        </span>
    );
}

/* ── Skeleton Components ──────────────────────────────── */

const skeletonBarStyle = css({
    height: '12px',
    borderRadius: 'md',
    background: {
        base: 'linear-gradient(90deg, rgba(0,0,0,0.06) 25%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.06) 75%)',
        _dark: 'linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.06) 75%)',
    },
    backgroundSize: '200% 100%',
    animation: 'searchShimmer 1.5s ease-in-out infinite',
});

function RecipeSkeletonSection({
    title,
    icon,
    count,
}: {
    title: string;
    icon: React.ReactNode;
    count: number;
}) {
    return (
        <div className={css({ borderBottom: '1px solid', borderColor: 'border' })}>
            <SectionHeader icon={icon} title={title} />
            <div className={css({ px: '2', pb: '2', display: 'grid', gap: '1' })}>
                {Array.from({ length: count }).map((_, i) => (
                    <div
                        key={i}
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3',
                            padding: '2',
                        })}
                    >
                        <div
                            className={css({
                                width: '48px',
                                height: '48px',
                                borderRadius: 'md',
                                flexShrink: 0,
                                background: {
                                    base: 'rgba(0,0,0,0.06)',
                                    _dark: 'rgba(255,255,255,0.06)',
                                },
                                animation: 'searchPulse 1.5s ease-in-out infinite',
                            })}
                        />
                        <div className={css({ flex: 1, display: 'grid', gap: '1.5' })}>
                            <div className={skeletonBarStyle} style={{ width: '70%' }} />
                            <div
                                className={skeletonBarStyle}
                                style={{ width: '40%', height: '10px' }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function SuggestSkeletonSection() {
    return (
        <div className={css({ borderBottom: '1px solid', borderColor: 'border' })}>
            <SectionHeader icon={<Carrot size={14} />} title="Zutaten" />
            <div className={css({ px: '2', pb: '2', display: 'grid', gap: '1' })}>
                {[0, 1].map((i) => (
                    <div key={i} className={css({ px: '3', py: '2' })}>
                        <div className={skeletonBarStyle} style={{ width: `${55 + i * 20}%` }} />
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── Section: Recipes ──────────────────────────────────── */

function RecipeSection({
    icon,
    title,
    recipes,
    onSelect,
}: {
    icon: React.ReactNode;
    title: string;
    recipes: MultiSearchRecipe[];
    onSelect: (slug: string) => void;
}) {
    return (
        <div className={css({ borderBottom: '1px solid', borderColor: 'border' })}>
            <SectionHeader icon={icon} title={title} />
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
                        <span
                            className={css({
                                fontSize: 'sm',
                                color: 'text',
                                fontWeight: '500',
                            })}
                        >
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
