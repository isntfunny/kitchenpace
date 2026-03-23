'use client';

import { Check, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { css } from 'styled-system/css';

import { approveIngredient, deleteIngredient } from './ingredient-actions';

interface IngredientForReview {
    id: string;
    name: string;
    slug: string;
    pluralName: string | null;
    createdAt: Date;
    ingredientUnits: Array<{ unit: { shortName: string } }>;
    _count: { recipes: number };
}

export function IngredientReviewTable({ ingredients }: { ingredients: IngredientForReview[] }) {
    const [loading, setLoading] = useState<string | null>(null);

    if (ingredients.length === 0) {
        return (
            <p className={css({ color: 'foreground.muted', py: '8', textAlign: 'center' })}>
                Keine Zutaten zur Überprüfung.
            </p>
        );
    }

    const handleApprove = async (id: string) => {
        setLoading(id);
        await approveIngredient(id);
        setLoading(null);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`„${name}" wirklich löschen? Verknüpfte Rezeptzutaten werden entfernt.`))
            return;
        setLoading(id);
        await deleteIngredient(id);
        setLoading(null);
    };

    return (
        <div
            className={css({
                borderRadius: 'xl',
                border: '1px solid',
                borderColor: 'border.muted',
                overflow: 'hidden',
            })}
        >
            <table className={css({ width: '100%', borderCollapse: 'collapse' })}>
                <thead>
                    <tr
                        className={css({
                            bg: 'surface.muted',
                            fontSize: 'xs',
                            fontWeight: '600',
                            color: 'foreground.muted',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                        })}
                    >
                        <th className={thClass}>Name</th>
                        <th className={thClass}>Slug</th>
                        <th className={thClass}>Einheiten</th>
                        <th className={thClass}>Rezepte</th>
                        <th className={thClass}>Erstellt</th>
                        <th className={thClass}>Aktionen</th>
                    </tr>
                </thead>
                <tbody>
                    {ingredients.map((ing) => (
                        <tr
                            key={ing.id}
                            className={css({
                                borderTop: '1px solid',
                                borderColor: 'border.muted',
                                _hover: { bg: 'surface.muted' },
                            })}
                        >
                            <td className={tdClass}>
                                <span className={css({ fontWeight: '600' })}>{ing.name}</span>
                                {ing.pluralName && (
                                    <span
                                        className={css({
                                            color: 'foreground.muted',
                                            ml: '1',
                                            fontSize: 'xs',
                                        })}
                                    >
                                        ({ing.pluralName})
                                    </span>
                                )}
                            </td>
                            <td className={tdClass}>
                                <code
                                    className={css({ fontSize: 'xs', color: 'foreground.muted' })}
                                >
                                    {ing.slug}
                                </code>
                            </td>
                            <td className={tdClass}>
                                {ing.ingredientUnits.map((iu) => iu.unit.shortName).join(', ') ||
                                    '—'}
                            </td>
                            <td className={tdClass}>{ing._count.recipes}</td>
                            <td className={tdClass}>
                                {new Date(ing.createdAt).toLocaleDateString('de-DE')}
                            </td>
                            <td className={tdClass}>
                                <div className={css({ display: 'flex', gap: '1' })}>
                                    <button
                                        type="button"
                                        onClick={() => handleApprove(ing.id)}
                                        disabled={loading === ing.id}
                                        className={approveBtnClass}
                                        title="Freigeben"
                                    >
                                        <Check size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(ing.id, ing.name)}
                                        disabled={loading === ing.id}
                                        className={deleteBtnClass}
                                        title="Löschen"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

const thClass = css({ px: '3', py: '2', textAlign: 'left' });
const tdClass = css({ px: '3', py: '2.5', fontSize: 'sm' });

const approveBtnClass = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    p: '1.5',
    borderRadius: 'md',
    border: '1px solid',
    borderColor: { base: 'rgba(34,197,94,0.3)', _dark: 'rgba(34,197,94,0.4)' },
    bg: { base: 'rgba(34,197,94,0.08)', _dark: 'rgba(34,197,94,0.12)' },
    color: 'palette.emerald',
    cursor: 'pointer',
    transition: 'all 120ms ease',
    _hover: {
        bg: { base: 'rgba(34,197,94,0.15)', _dark: 'rgba(34,197,94,0.2)' },
    },
    _disabled: { opacity: 0.5, cursor: 'not-allowed' },
});

const deleteBtnClass = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    p: '1.5',
    borderRadius: 'md',
    border: '1px solid',
    borderColor: { base: 'rgba(239,68,68,0.3)', _dark: 'rgba(239,68,68,0.4)' },
    bg: { base: 'rgba(239,68,68,0.08)', _dark: 'rgba(239,68,68,0.12)' },
    color: 'red.500',
    cursor: 'pointer',
    transition: 'all 120ms ease',
    _hover: {
        bg: { base: 'rgba(239,68,68,0.15)', _dark: 'rgba(239,68,68,0.2)' },
    },
    _disabled: { opacity: 0.5, cursor: 'not-allowed' },
});
