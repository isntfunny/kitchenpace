'use client';

import Link from 'next/link';
import { useState } from 'react';

import type { UserRecipe } from '@/app/actions/user';

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
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1.5rem',
                }}
            >
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {(['ALL', 'DRAFT', 'PUBLISHED'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '9999px',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                transition: 'all 150ms ease',
                                background:
                                    filter === f
                                        ? 'linear-gradient(135deg, #e07b53 0%, #f8b500 100%)'
                                        : '#f5f5f5',
                                color: filter === f ? 'white' : '#666',
                                border: 'none',
                                cursor: 'pointer',
                            }}
                        >
                            {f === 'ALL' ? 'Alle' : f === 'DRAFT' ? 'Entwürfe' : 'Veröffentlicht'}
                        </button>
                    ))}
                </div>

                {selectedIds.size > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={handleBulkPublish}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '9999px',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                background: '#00b894',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                            }}
                        >
                            {selectedIds.size} veröffentlichen
                        </button>
                        <button
                            onClick={handleBulkDraft}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '9999px',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                background: '#6c5ce7',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                            }}
                        >
                            {selectedIds.size} als Entwurf
                        </button>
                    </div>
                )}
            </div>

            {filteredRecipes.length === 0 ? (
                <div
                    style={{
                        textAlign: 'center',
                        padding: '3rem',
                        color: '#666',
                    }}
                >
                    <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
                        Keine Rezepte gefunden
                    </p>
                    <Link
                        href="/recipe/create"
                        style={{
                            color: '#e07b53',
                            textDecoration: 'underline',
                        }}
                    >
                        Erstelle dein erstes Rezept
                    </Link>
                </div>
            ) : (
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '1rem',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '1rem',
                            borderRadius: '0.75rem',
                            background: '#f9f9f9',
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={
                                selectedIds.size === filteredRecipes.length &&
                                filteredRecipes.length > 0
                            }
                            onChange={handleSelectAll}
                            style={{
                                width: '1.25rem',
                                height: '1.25rem',
                                marginRight: '0.75rem',
                                cursor: 'pointer',
                            }}
                        />
                        <span style={{ color: '#666', fontSize: '0.875rem' }}>Alle auswählen</span>
                    </div>

                    {filteredRecipes.map((recipe) => (
                        <div
                            key={recipe.id}
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '1rem',
                                padding: '1rem',
                                borderRadius: '0.75rem',
                                background: 'var(--colors-surface-elevated)',
                                border: selectedIds.has(recipe.id)
                                    ? '2px solid var(--colors-primary)'
                                    : '1px solid var(--colors-border)',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={selectedIds.has(recipe.id)}
                                onChange={() => handleSelect(recipe.id)}
                                style={{
                                    width: '1.25rem',
                                    height: '1.25rem',
                                    marginTop: '0.25rem',
                                    cursor: 'pointer',
                                }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <Link
                                    href={`/recipe/${recipe.id}`}
                                    style={{
                                        display: 'block',
                                        fontWeight: 600,
                                        fontSize: '1rem',
                                        color: '#333',
                                        textDecoration: 'none',
                                        marginBottom: '0.25rem',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {recipe.title}
                                </Link>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        fontSize: '0.75rem',
                                        color: '#666',
                                    }}
                                >
                                    <span
                                        style={{
                                            padding: '0.125rem 0.5rem',
                                            borderRadius: '9999px',
                                            fontSize: '0.7rem',
                                            fontWeight: 600,
                                            background:
                                                recipe.status === 'PUBLISHED'
                                                    ? 'rgba(0,184,148,0.15)'
                                                    : 'rgba(108,92,231,0.15)',
                                            color:
                                                recipe.status === 'PUBLISHED'
                                                    ? '#00b894'
                                                    : '#6c5ce7',
                                        }}
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
                                style={{
                                    padding: '0.5rem',
                                    borderRadius: '0.5rem',
                                    background: '#f5f5f5',
                                    color: '#666',
                                    textDecoration: 'none',
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                }}
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
