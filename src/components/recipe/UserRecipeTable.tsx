'use client';

import { Archive, Edit2, Plus, Search, Send, Star, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import type { UserRecipe } from '@app/app/actions/user';
import { Button } from '@app/components/atoms/Button';
import { SmartImage } from '@app/components/atoms/SmartImage';
import { PALETTE } from '@app/lib/palette';
import { css, cx } from 'styled-system/css';

// ---------------------------------------------------------------------------
// Recipe Card Actions
// ---------------------------------------------------------------------------

function RecipeCardActions({
    recipeId,
    title,
    status,
}: {
    recipeId: string;
    title: string;
    status: string;
}) {
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const isPublished = status === 'PUBLISHED';

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const res = await fetch('/api/recipes/bulk-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipeIds: [recipeId] }),
            });
            if (res.ok) {
                window.location.reload();
            }
        } finally {
            setIsDeleting(false);
        }
    };

    const handlePublish = async () => {
        setIsUpdating(true);
        try {
            const res = await fetch('/api/recipes/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipeId }),
            });
            if (res.ok) {
                window.location.reload();
            }
        } finally {
            setIsUpdating(false);
        }
    };

    const handleUnpublish = async () => {
        setIsUpdating(true);
        try {
            const res = await fetch('/api/recipes/unpublish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipeId }),
            });
            if (res.ok) {
                window.location.reload();
            }
        } finally {
            setIsUpdating(false);
        }
    };

    const actionBtnClass = css({
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.5',
        px: '3',
        py: '2',
        borderRadius: 'lg',
        border: '1px solid',
        borderColor: 'border.muted',
        background: 'surface',
        fontSize: 'xs',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 150ms ease',
        color: 'foreground',
        _disabled: { opacity: 0.5, pointerEvents: 'none' },
    });

    return (
        <>
            <div className={css({ display: 'flex', gap: '2', flexWrap: 'wrap' })}>
                <Link
                    href={`/recipe/${recipeId}/edit`}
                    className={css({
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '1.5',
                        px: '3',
                        py: '2',
                        borderRadius: 'lg',
                        border: '1px solid',
                        borderColor: 'border.muted',
                        background: 'surface',
                        fontSize: 'xs',
                        fontWeight: '600',
                        color: 'foreground',
                        textDecoration: 'none',
                        transition: 'all 150ms ease',
                        _hover: {
                            borderColor: 'primary',
                            color: 'primary',
                        },
                    })}
                >
                    <Edit2 size={14} />
                    Bearbeiten
                </Link>

                {!isPublished && (
                    <button
                        onClick={handlePublish}
                        disabled={isUpdating}
                        className={actionBtnClass}
                        style={{ '--hover-color': '#16a34a' } as React.CSSProperties}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#16a34a';
                            e.currentTarget.style.color = '#16a34a';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '';
                            e.currentTarget.style.color = '';
                        }}
                    >
                        <Send size={14} />
                        Veröffentlichen
                    </button>
                )}

                {isPublished && (
                    <button
                        onClick={handleUnpublish}
                        disabled={isUpdating}
                        className={actionBtnClass}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#d97706';
                            e.currentTarget.style.color = '#d97706';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '';
                            e.currentTarget.style.color = '';
                        }}
                    >
                        <Archive size={14} />
                        Zurückziehen
                    </button>
                )}

                <button
                    onClick={() => setDeleteConfirm(true)}
                    disabled={isDeleting || isUpdating}
                    className={actionBtnClass}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#dc2626';
                        e.currentTarget.style.color = '#dc2626';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '';
                        e.currentTarget.style.color = '';
                    }}
                >
                    <Trash2 size={14} />
                    Löschen
                </button>
            </div>

            {deleteConfirm && (
                <div
                    className={css({
                        position: 'fixed',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0, 0, 0, 0.5)',
                        zIndex: 50,
                    })}
                    onClick={() => !isDeleting && setDeleteConfirm(false)}
                >
                    <div
                        className={css({
                            background: 'surface.elevated',
                            borderRadius: 'xl',
                            padding: '6',
                            maxWidth: '400px',
                            width: '90%',
                            boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
                        })}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3
                            className={css({
                                fontSize: 'lg',
                                fontWeight: 700,
                                marginBottom: '3',
                                color: 'red.600',
                            })}
                        >
                            Rezept löschen?
                        </h3>
                        <p
                            className={css({
                                color: 'foreground.muted',
                                marginBottom: '5',
                                lineHeight: 1.6,
                                fontSize: 'sm',
                            })}
                        >
                            &ldquo;{title}&rdquo; wird endgültig gelöscht und kann nicht
                            wiederhergestellt werden.
                        </p>
                        <div
                            className={css({
                                display: 'flex',
                                gap: '3',
                                justifyContent: 'flex-end',
                            })}
                        >
                            <Button
                                variant="secondary"
                                onClick={() => setDeleteConfirm(false)}
                                disabled={isDeleting}
                            >
                                Abbrechen
                            </Button>
                            <Button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className={css({
                                    background: 'red.600',
                                    _hover: { background: 'red.700' },
                                })}
                            >
                                {isDeleting ? 'Wird gelöscht...' : 'Löschen'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// ---------------------------------------------------------------------------
// Single Recipe Card
// ---------------------------------------------------------------------------

function UserRecipeCard({ recipe }: { recipe: UserRecipe }) {
    const isPublished = recipe.status === 'PUBLISHED';
    const date = new Date(recipe.updatedAt);

    return (
        <div
            className={css({
                background: 'surface.elevated',
                borderRadius: 'xl',
                border: '1px solid',
                borderColor: 'rgba(0,0,0,0.06)',
                overflow: 'hidden',
                transition: 'all 200ms ease',
                _hover: {
                    borderColor: 'primary',
                    boxShadow: `0 12px 28px ${PALETTE.orange}15`,
                },
            })}
        >
            {/* Image + Status Badge */}
            <Link
                href={`/recipe/${recipe.slug}`}
                className={css({ textDecoration: 'none', color: 'inherit' })}
            >
                <div
                    className={css({
                        position: 'relative',
                        aspectRatio: '16/9',
                        overflow: 'hidden',
                        background: 'surface',
                    })}
                >
                    <SmartImage
                        alt={recipe.title}
                        fill
                        imageKey={recipe.imageKey}
                        recipeId={recipe.id}
                        className={css({ objectFit: 'cover' })}
                    />
                    <span
                        className={css({
                            position: 'absolute',
                            top: '2.5',
                            left: '2.5',
                            px: '2.5',
                            py: '1',
                            borderRadius: 'full',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            letterSpacing: 'wide',
                            textTransform: 'uppercase',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        })}
                        style={{
                            background: isPublished ? '#16a34a' : PALETTE.gold,
                            color: 'white',
                        }}
                    >
                        {isPublished ? 'Live' : 'Entwurf'}
                    </span>
                </div>
            </Link>

            {/* Content */}
            <div className={css({ p: '4', display: 'flex', flexDirection: 'column', gap: '3' })}>
                <div>
                    <Link
                        href={`/recipe/${recipe.slug}`}
                        className={css({
                            textDecoration: 'none',
                            color: 'inherit',
                        })}
                    >
                        <h3
                            className={css({
                                fontWeight: '700',
                                fontSize: 'base',
                                lineHeight: 'tight',
                                lineClamp: 2,
                                color: 'text',
                                _hover: { color: 'primary' },
                            })}
                        >
                            {recipe.title}
                        </h3>
                    </Link>

                    {/* Meta row */}
                    <div
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3',
                            mt: '2',
                            fontSize: 'xs',
                            color: 'foreground.muted',
                        })}
                    >
                        {recipe.ratingCount > 0 && (
                            <span
                                className={css({
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1',
                                })}
                            >
                                <Star size={13} className={css({ color: 'palette.gold' })} />
                                {recipe.rating.toFixed(1)}
                                <span className={css({ color: 'foreground.muted' })}>
                                    ({recipe.ratingCount})
                                </span>
                            </span>
                        )}
                        {recipe.cookCount > 0 && (
                            <span>
                                {recipe.cookCount}x zubereitet
                            </span>
                        )}
                        <span>{date.toLocaleDateString('de-DE')}</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <RecipeCardActions
                    recipeId={recipe.id}
                    title={recipe.title}
                    status={recipe.status}
                />
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState() {
    return (
        <div
            className={css({
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: '16',
                gap: '4',
            })}
        >
            <div
                className={css({
                    width: '64px',
                    height: '64px',
                    borderRadius: 'full',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                })}
                style={{
                    background: `linear-gradient(135deg, ${PALETTE.orange}20, ${PALETTE.gold}20)`,
                }}
            >
                <Plus size={28} color={PALETTE.orange} />
            </div>
            <div className={css({ textAlign: 'center' })}>
                <p className={css({ fontWeight: '600', fontSize: 'lg', mb: '1' })}>
                    Noch keine Rezepte
                </p>
                <p className={css({ color: 'foreground.muted', fontSize: 'sm', mb: '4' })}>
                    Erstelle dein erstes Rezept und teile es mit der Community.
                </p>
            </div>
            <Link
                href="/recipe/create"
                className={css({
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2',
                    px: '5',
                    py: '3',
                    borderRadius: 'xl',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: 'sm',
                    textDecoration: 'none',
                    transition: 'all 150ms ease',
                    _hover: {
                        boxShadow: `0 8px 24px ${PALETTE.orange}40`,
                    },
                })}
                style={{
                    background: `linear-gradient(135deg, ${PALETTE.orange}, ${PALETTE.gold})`,
                }}
            >
                <Plus size={18} />
                Rezept erstellen
            </Link>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function UserRecipeTable({ recipes }: { recipes: UserRecipe[] }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'PUBLISHED'>('ALL');

    const filtered = recipes
        .filter((r) => {
            if (statusFilter === 'ALL') return true;
            if (statusFilter === 'PUBLISHED') return r.status === 'PUBLISHED';
            // "Entwürfe" = everything that's not published (DRAFT + ARCHIVED)
            return r.status !== 'PUBLISHED';
        })
        .filter(
            (r) =>
                !searchQuery.trim() ||
                r.title.toLowerCase().includes(searchQuery.trim().toLowerCase()),
        );

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '5' })}>
            {/* Toolbar */}
            <div
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3',
                    flexWrap: 'wrap',
                })}
            >
                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2',
                        background: 'surface.elevated',
                        borderRadius: 'xl',
                        border: '1px solid',
                        borderColor: 'border.muted',
                        px: '3',
                        py: '2.5',
                        flex: '1',
                        minWidth: '180px',
                        maxWidth: '360px',
                    })}
                >
                    <Search
                        size={16}
                        className={css({ color: 'foreground.muted', flexShrink: 0 })}
                    />
                    <input
                        type="text"
                        placeholder="Rezepte suchen..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={css({
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            fontSize: 'sm',
                            color: 'text',
                            width: '100%',
                            '&::placeholder': { color: 'foreground.muted' },
                        })}
                    />
                </div>

                <div className={css({ display: 'flex', gap: '1.5' })}>
                    {(['ALL', 'PUBLISHED', 'DRAFT'] as const).map((f) => {
                        const labels = { ALL: 'Alle', PUBLISHED: 'Live', DRAFT: 'Entwürfe' };
                        const isActive = statusFilter === f;
                        return (
                            <button
                                key={f}
                                type="button"
                                onClick={() => setStatusFilter(f)}
                                className={cx(
                                    css({
                                        px: '3',
                                        py: '2',
                                        borderRadius: 'lg',
                                        fontSize: 'xs',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        border: '1px solid',
                                        transition: 'all 150ms ease',
                                        borderColor: 'border.muted',
                                        background: 'surface',
                                        color: 'foreground.muted',
                                    }),
                                    isActive &&
                                        css({
                                            borderColor: 'primary',
                                            background: 'accent.soft',
                                            color: 'primary',
                                        }),
                                )}
                            >
                                {labels[f]}
                            </button>
                        );
                    })}
                </div>

                <span className={css({ fontSize: 'xs', color: 'foreground.muted', ml: 'auto' })}>
                    {filtered.length} {filtered.length === 1 ? 'Rezept' : 'Rezepte'}
                </span>
            </div>

            {/* Card Grid or Empty State */}
            {filtered.length === 0 ? (
                recipes.length === 0 ? (
                    <EmptyState />
                ) : (
                    <p
                        className={css({
                            textAlign: 'center',
                            py: '12',
                            color: 'foreground.muted',
                            fontSize: 'sm',
                        })}
                    >
                        Keine Rezepte gefunden.
                    </p>
                )
            ) : (
                <div
                    className={css({
                        display: 'grid',
                        gridTemplateColumns: {
                            base: '1fr',
                            sm: 'repeat(2, 1fr)',
                            lg: 'repeat(3, 1fr)',
                        },
                        gap: '4',
                    })}
                >
                    {filtered.map((recipe) => (
                        <UserRecipeCard key={recipe.id} recipe={recipe} />
                    ))}
                </div>
            )}
        </div>
    );
}
