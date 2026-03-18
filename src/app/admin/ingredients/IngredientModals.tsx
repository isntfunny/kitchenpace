'use client';

import { Check, X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useMemo, useState, useTransition } from 'react';

import { css } from 'styled-system/css';

import { createIngredient, mergeIngredients } from './actions';
import {
    type Ingredient,
    btnPrimary,
    btnSecondary,
    closeButtonStyle,
    dialogContentSmallStyle,
    inputStyle,
    inputStyleObj,
    overlayStyle,
    sectionLabelStyle,
} from './ingredient-types';

// Re-export IngredientEditPanel so existing imports continue to work
export { IngredientEditPanel } from './IngredientEditPanel';

// ---------------------------------------------------------------------------
// AddIngredientForm
// ---------------------------------------------------------------------------

export function AddIngredientForm({ onClose }: { onClose: () => void }) {
    const [name, setName] = useState('');
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (!name.trim()) return;
        setError('');
        startTransition(async () => {
            try {
                await createIngredient({ name: name.trim() });
                onClose();
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
            }
        });
    };

    return (
        <div
            className={css({
                padding: '4',
                borderBottom: '1px solid',
                borderColor: 'border.muted',
                bg: { base: 'rgba(224,123,83,0.04)', _dark: 'rgba(224,123,83,0.06)' },
                display: 'flex',
                alignItems: 'center',
                gap: '3',
            })}
        >
            <div
                className={css({
                    width: '3px',
                    height: '24px',
                    borderRadius: 'full',
                    bg: 'brand.primary',
                    flexShrink: '0',
                })}
            />
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSubmit();
                    }
                    if (e.key === 'Escape') onClose();
                }}
                placeholder="Neuer Zutatname..."
                autoFocus
                className={css({ flex: '1', ...inputStyleObj })}
            />
            {error && (
                <span className={css({ fontSize: 'xs', color: 'error.text', fontWeight: '500' })}>
                    {error}
                </span>
            )}
            <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || !name.trim()}
                className={btnPrimary}
            >
                <Check size={14} />
            </button>
            <button type="button" onClick={onClose} className={btnSecondary}>
                <X size={14} />
            </button>
        </div>
    );
}

// ---------------------------------------------------------------------------
// MergeModal
// ---------------------------------------------------------------------------

export function MergeModal({
    ingredients,
    onClose,
}: {
    ingredients: Ingredient[];
    onClose: () => void;
}) {
    const [sourceId, setSourceId] = useState('');
    const [targetId, setTargetId] = useState('');
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState('');

    const sorted = useMemo(
        () => [...ingredients].sort((a, b) => a.name.localeCompare(b.name)),
        [ingredients],
    );

    const handleMerge = () => {
        if (!sourceId || !targetId) return;
        setError('');
        startTransition(async () => {
            try {
                await mergeIngredients(sourceId, targetId);
                onClose();
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Fehler beim Zusammenfuehren');
            }
        });
    };

    return (
        <Dialog.Root
            open
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <Dialog.Portal>
                <Dialog.Overlay className={overlayStyle} />
                <Dialog.Content className={dialogContentSmallStyle}>
                    <div
                        className={css({
                            padding: '6',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4',
                        })}
                    >
                        <div
                            className={css({
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                            })}
                        >
                            <div>
                                <Dialog.Title
                                    className={css({
                                        fontSize: 'lg',
                                        fontWeight: '700',
                                        fontFamily: 'heading',
                                        color: 'foreground',
                                    })}
                                >
                                    Zutaten zusammenfuehren
                                </Dialog.Title>
                                <p
                                    className={css({
                                        fontSize: 'sm',
                                        color: 'foreground.muted',
                                        marginTop: '1',
                                    })}
                                >
                                    Die Quellzutat wird in die Zielzutat ueberfuehrt. Alle Rezepte
                                    werden aktualisiert.
                                </p>
                            </div>
                            <Dialog.Close asChild>
                                <button type="button" className={closeButtonStyle}>
                                    <X size={18} />
                                </button>
                            </Dialog.Close>
                        </div>

                        {error && (
                            <div
                                className={css({
                                    padding: '3',
                                    borderRadius: 'lg',
                                    bg: 'error.bg',
                                    color: 'error.text',
                                    fontSize: 'sm',
                                    fontWeight: '500',
                                })}
                            >
                                {error}
                            </div>
                        )}

                        <div>
                            <label className={sectionLabelStyle}>Quelle (wird geloescht)</label>
                            <select
                                value={sourceId}
                                onChange={(e) => setSourceId(e.target.value)}
                                className={inputStyle}
                            >
                                <option value="">Zutat waehlen...</option>
                                {sorted.map((ing) => (
                                    <option
                                        key={ing.id}
                                        value={ing.id}
                                        disabled={ing.id === targetId}
                                    >
                                        {ing.name} ({ing.recipeCount} Rezepte)
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className={sectionLabelStyle}>Ziel (bleibt erhalten)</label>
                            <select
                                value={targetId}
                                onChange={(e) => setTargetId(e.target.value)}
                                className={inputStyle}
                            >
                                <option value="">Zutat waehlen...</option>
                                {sorted.map((ing) => (
                                    <option
                                        key={ing.id}
                                        value={ing.id}
                                        disabled={ing.id === sourceId}
                                    >
                                        {ing.name} ({ing.recipeCount} Rezepte)
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div
                            className={css({
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '2',
                                paddingTop: '2',
                            })}
                        >
                            <Dialog.Close asChild>
                                <button type="button" className={btnSecondary}>
                                    Abbrechen
                                </button>
                            </Dialog.Close>
                            <button
                                type="button"
                                onClick={handleMerge}
                                disabled={
                                    isPending || !sourceId || !targetId || sourceId === targetId
                                }
                                className={btnPrimary}
                            >
                                {isPending ? 'Zusammenfuehren...' : 'Zusammenfuehren'}
                            </button>
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
