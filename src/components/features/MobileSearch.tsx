'use client';

import { BookOpen, Carrot, Search, Sparkles, Tag, User, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import { Avatar } from '@app/components/atoms/Avatar';
import { SmartImage } from '@app/components/atoms/SmartImage';
import { MobileOverlay } from '@app/components/ui/MobileOverlay';
import type {
    MultiSearchRecipe,
    MultiSearchUser,
    SuggestItem,
} from '@app/lib/hooks/useStreamingSearch';
import { useStreamingSearch } from '@app/lib/hooks/useStreamingSearch';
import { buildRecipeFilterHref } from '@app/lib/recipeFilters';

import { css } from 'styled-system/css';

// ── Main Component ───────────────────────────────────────────────────────────

export function MobileSearch() {
    const [open, setOpen] = useState(false);

    return (
        <>
            {/* Fake search trigger — looks like the real input */}
            <button
                type="button"
                onClick={() => setOpen(true)}
                className={css({
                    display: { base: 'flex', md: 'none' },
                    alignItems: 'center',
                    gap: '2',
                    width: '100%',
                    height: '44px',
                    paddingLeft: '4',
                    paddingRight: '3',
                    borderRadius: 'full',
                    border: '1px solid',
                    borderColor: 'border',
                    background: 'surface.elevated',
                    fontSize: 'sm',
                    fontFamily: 'body',
                    color: 'text.muted',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                })}
            >
                <span className={css({ flex: 1, textAlign: 'left' })}>
                    Rezepte, Zutaten, Tags suchen…
                </span>
                <Search size={18} />
            </button>

            <MobileOverlay open={open} onClose={() => setOpen(false)}>
                <MobileSearchContent onClose={() => setOpen(false)} />
            </MobileOverlay>
        </>
    );
}

// ── Overlay Content ──────────────────────────────────────────────────────────

function MobileSearchContent({ onClose }: { onClose: () => void }) {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const [inputValue, setInputValue] = useState('');

    const trimmedQuery = inputValue.trim();

    const { recipes, semanticRecipes, ingredients, tags, users, phase, hasSemantic } =
        useStreamingSearch(trimmedQuery, {
            enabled: trimmedQuery.length >= 2,
        });

    const hasAnyResults =
        recipes.length > 0 ||
        semanticRecipes.length > 0 ||
        ingredients.length > 0 ||
        tags.length > 0 ||
        users.length > 0;

    const handleSelect = (href: string) => {
        setInputValue('');
        onClose();
        router.push(href);
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!trimmedQuery) return;
        handleSelect(`/recipes?query=${encodeURIComponent(trimmedQuery)}`);
    };

    return (
        <>
            {/* Top bar: input + close */}
            <div
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2',
                    px: '4',
                    pt: 'env(safe-area-inset-top, 12px)',
                    pb: '3',
                    borderBottom: '1px solid',
                    borderColor: 'border.subtle',
                })}
            >
                <form onSubmit={handleSubmit} className={css({ flex: 1, minWidth: 0 })}>
                    <div className={css({ position: 'relative' })}>
                        <input
                            ref={inputRef}
                            autoFocus
                            type="text"
                            aria-label="Rezepte suchen"
                            placeholder="Rezepte, Zutaten, Tags suchen…"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className={css({
                                width: '100%',
                                height: '44px',
                                paddingLeft: '10',
                                paddingRight: '4',
                                borderRadius: 'full',
                                border: '1px solid',
                                borderColor: 'border',
                                background: 'surface.elevated',
                                fontSize: 'sm',
                                fontFamily: 'body',
                                outline: 'none',
                                color: 'text',
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
                                left: '3',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                pointerEvents: 'none',
                                color: 'foreground.muted',
                                display: 'flex',
                                alignItems: 'center',
                            })}
                        >
                            <Search size={18} />
                        </span>
                    </div>
                </form>

                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Suche schliessen"
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '44px',
                        height: '44px',
                        flexShrink: 0,
                        borderRadius: 'full',
                        border: 'none',
                        background: 'transparent',
                        color: 'text',
                        cursor: 'pointer',
                        transition: 'background 150ms ease',
                        _hover: { bg: 'accent.soft' },
                    })}
                >
                    <X size={22} />
                </button>
            </div>

            {/* Results area */}
            <div className={css({ flex: 1, overflowY: 'auto', pb: '8' })}>
                {/* Too short query */}
                {trimmedQuery.length < 2 && (
                    <div
                        className={css({
                            px: '4',
                            py: '6',
                            fontSize: 'sm',
                            color: 'foreground.muted',
                            fontFamily: 'body',
                            textAlign: 'center',
                        })}
                    >
                        Mindestens 2 Zeichen eingeben…
                    </div>
                )}

                {/* Searching phase */}
                {trimmedQuery.length >= 2 && phase === 'searching' && !hasAnyResults && (
                    <div
                        className={css({
                            px: '4',
                            py: '6',
                            fontSize: 'sm',
                            color: 'foreground.muted',
                            fontFamily: 'body',
                            textAlign: 'center',
                        })}
                    >
                        Suche…
                    </div>
                )}

                {/* Semantic results */}
                {hasSemantic && semanticRecipes.length > 0 && (
                    <MobileRecipeSection
                        icon={<Sparkles size={14} />}
                        title="Das könnte passen"
                        recipes={semanticRecipes}
                        onSelect={(slug) => handleSelect(`/recipe/${slug}`)}
                    />
                )}

                {/* Recipe results */}
                {recipes.length > 0 && (
                    <MobileRecipeSection
                        icon={<BookOpen size={14} />}
                        title="Rezepte"
                        recipes={recipes}
                        onSelect={(slug) => handleSelect(`/recipe/${slug}`)}
                    />
                )}

                {/* Ingredients */}
                {ingredients.length > 0 && (
                    <MobileSuggestSection
                        icon={<Carrot size={14} />}
                        title="Zutaten"
                        items={ingredients}
                        onSelect={(name) =>
                            handleSelect(buildRecipeFilterHref({ ingredients: [name] }))
                        }
                    />
                )}

                {/* Tags */}
                {tags.length > 0 && (
                    <MobileSuggestSection
                        icon={<Tag size={14} />}
                        title="Tags"
                        items={tags}
                        onSelect={(name) => handleSelect(buildRecipeFilterHref({ tags: [name] }))}
                    />
                )}

                {/* Users */}
                {users.length > 0 && (
                    <MobileUserSection
                        users={users}
                        onSelect={(slug) => handleSelect(`/user/${slug}`)}
                    />
                )}

                {/* No results */}
                {phase === 'done' && !hasAnyResults && (
                    <div
                        className={css({
                            px: '4',
                            py: '6',
                            fontSize: 'sm',
                            color: 'foreground.muted',
                            fontFamily: 'body',
                            textAlign: 'center',
                        })}
                    >
                        Keine Ergebnisse
                    </div>
                )}

                {/* View all button */}
                {phase === 'done' && hasAnyResults && (
                    <button
                        type="button"
                        onClick={() =>
                            handleSelect(`/recipes?query=${encodeURIComponent(trimmedQuery)}`)
                        }
                        className={css({
                            width: '100%',
                            borderTop: '1px solid',
                            borderColor: 'border',
                            px: '4',
                            py: '3',
                            fontSize: 'sm',
                            fontWeight: '600',
                            fontFamily: 'body',
                            color: 'primary',
                            textAlign: 'center',
                            cursor: 'pointer',
                            background: 'transparent',
                            border: 'none',
                            borderTopWidth: '1px',
                            borderTopStyle: 'solid',
                            transition: 'background 150ms ease',
                            _hover: { bg: 'accent.soft' },
                        })}
                    >
                        Alle Ergebnisse anzeigen
                    </button>
                )}
            </div>
        </>
    );
}

// ── Section Header ───────────────────────────────────────────────────────────

function MobileSectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
    return (
        <div
            className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '2',
                px: '4',
                pt: '4',
                pb: '2',
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

// ── Section: Recipes ─────────────────────────────────────────────────────────

function MobileRecipeSection({
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
        <div className={css({ borderBottom: '1px solid', borderColor: 'border.subtle' })}>
            <MobileSectionHeader icon={icon} title={title} />
            <div className={css({ px: '3', pb: '3', display: 'grid', gap: '1' })}>
                {recipes.map((recipe) => (
                    <button
                        key={recipe.id}
                        type="button"
                        onClick={() => onSelect(recipe.slug)}
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
                            minHeight: '44px',
                            transition: 'all 150ms ease',
                            _hover: { bg: 'accent.soft', borderColor: 'border' },
                            _active: { bg: 'accent.soft' },
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

// ── Section: Users ───────────────────────────────────────────────────────────

function MobileUserSection({
    users,
    onSelect,
}: {
    users: MultiSearchUser[];
    onSelect: (slug: string) => void;
}) {
    return (
        <div className={css({ borderBottom: '1px solid', borderColor: 'border.subtle' })}>
            <MobileSectionHeader icon={<User size={14} />} title="Profile" />
            <div className={css({ px: '3', pb: '3', display: 'grid', gap: '1' })}>
                {users.map((user) => (
                    <button
                        key={user.id}
                        type="button"
                        onClick={() => onSelect(user.slug)}
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
                            minHeight: '44px',
                            transition: 'all 150ms ease',
                            _hover: { bg: 'accent.soft', borderColor: 'border' },
                            _active: { bg: 'accent.soft' },
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

// ── Section: Suggest (Ingredients / Tags) ────────────────────────────────────

function MobileSuggestSection({
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
        <div className={css({ borderBottom: '1px solid', borderColor: 'border.subtle' })}>
            <MobileSectionHeader icon={icon} title={title} />
            <div className={css({ px: '3', pb: '3', display: 'grid', gap: '1' })}>
                {items.map((item) => (
                    <button
                        key={item.name}
                        type="button"
                        onClick={() => onSelect(item.name)}
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
                            minHeight: '44px',
                            transition: 'all 150ms ease',
                            _hover: { bg: 'accent.soft', borderColor: 'border' },
                            _active: { bg: 'accent.soft' },
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
