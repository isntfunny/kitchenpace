'use client';

'use client';

import Link from 'next/link';
import { useState } from 'react';

import type { UserRecipe } from '@/app/actions/user';
import { Button } from '@/components/atoms/Button';
import { css } from 'styled-system/css';


interface RecipeListProps {
    recipes: UserRecipe[];
}

export function RecipeList({ recipes }: RecipeListProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [localRecipes, setLocalRecipes] = useState<UserRecipe[]>(recipes);
    const [filter, setFilter] = useState<'ALL' | 'DRAFT' | 'PUBLISHED'>('ALL');

    const filteredRecipes = localRecipes.filter((recipe) => {
        if (filter === 'ALL') return true;
        return recipe.status === filter;
    });

    const handleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === filteredRecipes.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredRecipes.map((r) => r.id)));
        }
    };

    const handleBulkPublish = async () => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;

        const res = await fetch('/api/recipes/bulk-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipeIds: ids, status: 'PUBLISHED' }),
        });

        if (res.ok) {
            setLocalRecipes((prev) =>
                prev.map((r) =>
                    selectedIds.has(r.id)
                        ? { ...r, status: 'PUBLISHED' as const, publishedAt: new Date() }
                        : r,
                ),
            );
            setSelectedIds(new Set());
        }
    };

    const handleBulkDraft = async () => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;

        const res = await fetch('/api/recipes/bulk-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipeIds: ids, status: 'DRAFT' }),
        });

        if (res.ok) {
            setLocalRecipes((prev) =>
                prev.map((r) =>
                    selectedIds.has(r.id)
                        ? { ...r, status: 'DRAFT' as const, publishedAt: null }
                        : r,
                ),
            );
            setSelectedIds(new Set());
        }
    };

    return (
        <div>
            <div
                className={css({
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1.5rem',
                })}
            >
                <div className={css({ display: 'flex', gap: '0.5rem' })}>
                    {(['ALL', 'DRAFT', 'PUBLISHED'] as const).map((f) => (
                        <Button
                            key={f}
                            variant={filter === f ? 'primary' : 'secondary'}
                            size="sm"
                            onClick={() => setFilter(f)}
                        >
                            {f === 'ALL' ? 'Alle' : f === 'DRAFT' ? 'Entwürfe' : 'Veröffentlicht'}
                        </Button>
                    ))}
                </div>

                {selectedIds.size > 0 && (
                    <div className={css({ display: 'flex', gap: '0.5rem' })}>
                        <Button variant="primary" size="sm" onClick={handleBulkPublish}>
                            {selectedIds.size} veröffentlichen
                        </Button>
                        <Button variant="secondary" size="sm" onClick={handleBulkDraft}>
                            {selectedIds.size} als Entwurf
                        </Button>
                    </div>
                )}
            </div>

            {filteredRecipes.length === 0 ? (
                <div
                    className={css({
                        textAlign: 'center',
                        padding: '3rem',
                        color: 'muted',
                    })}
                >
                    <p className={css({ fontSize: '1.125rem', marginBottom: '0.5rem' })}>
                        Keine Rezepte gefunden
                    </p>
                    <Link
                        href="/recipe/create"
                        className={css({
                            color: 'accent',
                            textDecoration: 'underline',
                        })}
                    >
                        Erstelle dein erstes Rezept
                    </Link>
                </div>
            ) : (
                <div
                    className={css({
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '1rem',
                    })}
                >
                    <div
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            padding: '1rem',
                            borderRadius: 'md',
                            background: 'surface.card',
                        })}
                    >
                        <input
                            type="checkbox"
                            checked={
                                selectedIds.size === filteredRecipes.length &&
                                filteredRecipes.length > 0
                            }
                            onChange={handleSelectAll}
                            className={css({
                                width: '1.25rem',
                                height: '1.25rem',
                                marginRight: '0.75rem',
                                cursor: 'pointer',
                            })}
                        />
                        <span className={css({ color: 'muted', fontSize: '0.875rem' })}>
                            Alle auswählen
                        </span>
                    </div>

                    {filteredRecipes.map((recipe) => (
                        <div
                            key={recipe.id}
                            className={css({
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '1rem',
                                padding: '1rem',
                                borderRadius: 'md',
                                background: 'surface.elevated',
                                border: selectedIds.has(recipe.id)
                                    ? '2px solid primary'
                                    : '1px solid border',
                                boxShadow: 'shadow.small',
                            })}
                        >
                            <input
                                type="checkbox"
                                checked={selectedIds.has(recipe.id)}
                                onChange={() => handleSelect(recipe.id)}
                                className={css({
                                    width: '1.25rem',
                                    height: '1.25rem',
                                    marginTop: '0.25rem',
                                    cursor: 'pointer',
                                })}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <Link
                                    href={`/recipe/${recipe.id}`}
                                    className={css({
                                        display: 'block',
                                        fontWeight: 600,
                                        fontSize: '1rem',
                                        color: 'text',
                                        textDecoration: 'none',
                                        marginBottom: '0.25rem',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    })}
                                >
                                    {recipe.title}
                                </Link>
                                <div
                                    className={css({
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        fontSize: '0.75rem',
                                        color: 'muted',
                                    })}
                                >
                                    <span
                                        className={css({
                                            padding: '0.125rem 0.5rem',
                                            borderRadius: 'md',
                                            fontSize: '0.7rem',
                                            fontWeight: 600,
                                            background:
                                                recipe.status === 'PUBLISHED'
                                                    ? 'green-100'
                                                    : 'purple-100',
                                            color:
                                                recipe.status === 'PUBLISHED'
                                                    ? 'green-800'
                                                    : 'purple-800',
                                        })}
                                    >
                                        {recipe.status === 'PUBLISHED'
                                            ? 'Veröffentlicht'
                                            : 'Entwurf'}
                                    </span>
                                    {recipe.ratingCount > 0 && (
                                        <span>★ {recipe.rating.toFixed(1)}</span>
                                    )}
                                    <span>•</span>
                                    <span>
                                        {new Date(recipe.updatedAt).toLocaleDateString('de-DE')}
                                    </span>
                                </div>
                            </div>
                            <Link
                                href={`/recipe/${recipe.id}`}
                                className={css({
                                    padding: '0.5rem',
                                    borderRadius: 'sm',
                                    background: 'surface.card',
                                    color: 'muted',
                                    textDecoration: 'none',
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                })}
                            >
                                Bearbeiten
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
