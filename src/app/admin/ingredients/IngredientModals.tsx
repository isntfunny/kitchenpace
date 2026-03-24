'use client';

import { Check, Loader2, Search, X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useEffect, useRef, useState, useTransition } from 'react';

import { css, cx } from 'styled-system/css';

import {
    type IngredientSearchResult,
    createIngredient,
    mergeIngredients,
    searchIngredientsForMerge,
} from './actions';
import {
    btnPrimary,
    btnSecondary,
    closeButtonStyle,
    inputStyleObj,
    overlayStyle,
    sectionLabelStyle,
} from './ingredient-types';

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
// IngredientCombobox — debounced OpenSearch-backed combobox
// ---------------------------------------------------------------------------

const resultItemBase = css({
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '2',
    paddingX: '3',
    paddingY: '2',
    fontSize: 'sm',
    textAlign: 'left',
    border: 'none',
    borderBottomWidth: '1px',
    borderColor: 'border.muted',
    bg: 'transparent',
    color: 'foreground',
    cursor: 'pointer',
    transition: 'background 0.1s',
    _last: { borderBottomWidth: '0' },
    _hover: { bg: { base: 'rgba(0,0,0,0.04)', _dark: 'rgba(255,255,255,0.06)' } },
});

const resultItemDisabled = css({
    color: 'foreground.muted',
    cursor: 'not-allowed',
    opacity: '0.45',
    _hover: {},
});

const resultCountStyle = css({
    fontSize: 'xs',
    color: 'foreground.muted',
    whiteSpace: 'nowrap',
    flexShrink: '0',
});

function IngredientCombobox({
    label,
    disabledId,
    selected,
    onSelect,
}: {
    label: string;
    disabledId: string;
    selected: IngredientSearchResult | null;
    onSelect: (result: IngredientSearchResult | null) => void;
}) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<IngredientSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

    // Debounced search via server action
    useEffect(() => {
        const trimmed = query.trim();
        if (trimmed.length < 2) {
            setResults([]);
            setIsSearching(false);
            return;
        }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setIsSearching(true);
            try {
                const hits = await searchIngredientsForMerge(trimmed);
                setResults(hits);
            } catch {
                setResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 250);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query]);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const handleSelect = (result: IngredientSearchResult) => {
        if (result.id === disabledId) return;
        onSelect(result);
        setQuery('');
        setOpen(false);
    };

    const handleClear = () => {
        onSelect(null);
        setQuery('');
        inputRef.current?.focus();
    };

    return (
        <div
            ref={containerRef}
            className={css({ display: 'flex', flexDirection: 'column', gap: '2' })}
        >
            <label className={sectionLabelStyle}>{label}</label>

            <div className={css({ position: 'relative' })}>
                <span
                    className={css({
                        position: 'absolute',
                        left: '3',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'foreground.muted',
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'center',
                    })}
                >
                    {isSearching ? (
                        <Loader2
                            size={14}
                            className={css({ animation: 'spin 1s linear infinite' })}
                        />
                    ) : (
                        <Search size={14} />
                    )}
                </span>
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                            setOpen(false);
                            setQuery('');
                        }
                    }}
                    placeholder="Zutat suchen (min. 2 Zeichen)..."
                    autoComplete="off"
                    className={css({
                        width: '100%',
                        paddingLeft: '8',
                        paddingRight: '3',
                        paddingY: '2',
                        borderRadius: 'lg',
                        borderWidth: '1px',
                        borderColor: open ? 'brand.primary' : 'border.muted',
                        bg: 'surface',
                        fontSize: 'sm',
                        color: 'foreground',
                        outline: 'none',
                        transition: 'all 0.15s',
                    })}
                />
            </div>

            {open && query.trim().length >= 2 && (
                <div
                    className={css({
                        borderRadius: 'lg',
                        borderWidth: '1px',
                        borderColor: 'border.muted',
                        bg: 'surface',
                        boxShadow: 'shadow.large',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        zIndex: '52',
                    })}
                >
                    {isSearching ? (
                        <div
                            className={css({
                                padding: '3',
                                fontSize: 'sm',
                                color: 'foreground.muted',
                                textAlign: 'center',
                            })}
                        >
                            Suche...
                        </div>
                    ) : results.length === 0 ? (
                        <div
                            className={css({
                                padding: '3',
                                fontSize: 'sm',
                                color: 'foreground.muted',
                                textAlign: 'center',
                            })}
                        >
                            Keine Treffer
                        </div>
                    ) : (
                        results.map((result) => {
                            const isDisabled = result.id === disabledId;
                            return (
                                <button
                                    key={result.id}
                                    type="button"
                                    disabled={isDisabled}
                                    onClick={() => handleSelect(result)}
                                    className={cx(resultItemBase, isDisabled && resultItemDisabled)}
                                >
                                    <span>{result.name}</span>
                                    <span className={resultCountStyle}>
                                        {result.recipeCount} Rezepte
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>
            )}

            {selected && (
                <div
                    className={css({
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '1.5',
                        paddingX: '2.5',
                        paddingY: '1',
                        borderRadius: 'full',
                        bg: { base: 'rgba(224,123,83,0.10)', _dark: 'rgba(224,123,83,0.16)' },
                        borderWidth: '1px',
                        borderColor: {
                            base: 'rgba(224,123,83,0.25)',
                            _dark: 'rgba(224,123,83,0.30)',
                        },
                        fontSize: 'sm',
                        fontWeight: '500',
                        color: 'foreground',
                        alignSelf: 'flex-start',
                    })}
                >
                    <Check size={12} className={css({ color: 'brand.primary', flexShrink: '0' })} />
                    <span>{selected.name}</span>
                    <span className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                        ({selected.recipeCount} Rezepte)
                    </span>
                    <button
                        type="button"
                        onClick={handleClear}
                        aria-label="Auswahl zuruecksetzen"
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginLeft: '0.5',
                            color: 'foreground.muted',
                            border: 'none',
                            bg: 'transparent',
                            cursor: 'pointer',
                            borderRadius: 'full',
                            padding: '0.5',
                            transition: 'color 0.1s',
                            _hover: { color: 'foreground' },
                        })}
                    >
                        <X size={12} />
                    </button>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// MergeModal
// ---------------------------------------------------------------------------

export function MergeModal({ onClose }: { onClose: () => void }) {
    const [source, setSource] = useState<IngredientSearchResult | null>(null);
    const [target, setTarget] = useState<IngredientSearchResult | null>(null);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState('');

    const handleMerge = () => {
        if (!source || !target) return;
        setError('');
        startTransition(async () => {
            try {
                await mergeIngredients(source.id, target.id);
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
                <Dialog.Content
                    className={css({
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        bg: 'surface',
                        borderRadius: 'xl',
                        width: '90vw',
                        maxWidth: '560px',
                        maxHeight: '85vh',
                        overflowY: 'auto',
                        zIndex: '51',
                        boxShadow: 'shadow.large',
                        animation: 'slideUp 0.2s ease-out',
                        display: 'flex',
                        flexDirection: 'column',
                    })}
                >
                    <div
                        className={css({
                            padding: '6',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '5',
                        })}
                    >
                        {/* Header */}
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

                        <IngredientCombobox
                            label="Quelle (wird geloescht)"
                            disabledId={target?.id ?? ''}
                            selected={source}
                            onSelect={setSource}
                        />

                        {/* Visual arrow between the two pickers */}
                        <div
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3',
                                color: 'foreground.muted',
                                fontSize: 'xs',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                            })}
                        >
                            <div
                                className={css({
                                    flex: '1',
                                    height: '1px',
                                    bg: 'border.muted',
                                })}
                            />
                            wird zusammengefuehrt in
                            <div
                                className={css({
                                    flex: '1',
                                    height: '1px',
                                    bg: 'border.muted',
                                })}
                            />
                        </div>

                        <IngredientCombobox
                            label="Ziel (bleibt erhalten)"
                            disabledId={source?.id ?? ''}
                            selected={target}
                            onSelect={setTarget}
                        />

                        {/* Actions */}
                        <div
                            className={css({
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '2',
                                paddingTop: '1',
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
                                    isPending || !source || !target || source.id === target.id
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
