'use client';

import { X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';

import { css } from 'styled-system/css';

import { searchTags, searchIngredients } from './actions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FilterCriteriaFormProps {
    allCategories: { id: string; name: string; slug: string; color: string }[];
    selectedCategoryIds: string[];
    selectedTags: { id: string; name: string }[];
    selectedIngredients: { id: string; name: string }[];
    maxTotalTime: number | null;
    onCategoriesChange: (ids: string[]) => void;
    onTagsChange: (tags: { id: string; name: string }[]) => void;
    onIngredientsChange: (ingredients: { id: string; name: string }[]) => void;
    onMaxTimeChange: (time: number | null) => void;
}

// ---------------------------------------------------------------------------
// Shared search dropdown hook
// ---------------------------------------------------------------------------

function useSearchDropdown(
    searchFn: (query: string) => Promise<{ id: string; name: string }[]>,
    selected: { id: string; name: string }[],
) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<{ id: string; name: string }[]>([]);
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const selectedIds = useMemo(() => new Set(selected.map((s) => s.id)), [selected]);

    const handleQueryChange = useCallback(
        (value: string) => {
            setQuery(value);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (value.length < 1) {
                setResults([]);
                setOpen(false);
                return;
            }
            debounceRef.current = setTimeout(() => {
                startTransition(async () => {
                    const res = await searchFn(value);
                    setResults(res.filter((r) => !selectedIds.has(r.id)));
                    setOpen(true);
                });
            }, 300);
        },
        [searchFn, selectedIds],
    );

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    return { query, setQuery, results, open, setOpen, isPending, handleQueryChange };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SearchDropdown({
    label,
    placeholder,
    selected,
    searchFn,
    onChange,
}: {
    label: string;
    placeholder: string;
    selected: { id: string; name: string }[];
    searchFn: (query: string) => Promise<{ id: string; name: string }[]>;
    onChange: (items: { id: string; name: string }[]) => void;
}) {
    const { query, setQuery, results, open, setOpen, handleQueryChange } = useSearchDropdown(
        searchFn,
        selected,
    );
    const containerRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        function onClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, [setOpen]);

    const addItem = (item: { id: string; name: string }) => {
        onChange([...selected, item]);
        setQuery('');
        setOpen(false);
    };

    const removeItem = (id: string) => {
        onChange(selected.filter((s) => s.id !== id));
    };

    return (
        <div>
            <label className={labelStyle}>{label}</label>

            {/* Selected pills */}
            {selected.length > 0 && (
                <div className={pillContainerStyle}>
                    {selected.map((item) => (
                        <span key={item.id} className={pillStyle}>
                            {item.name}
                            <button
                                type="button"
                                onClick={() => removeItem(item.id)}
                                className={pillRemoveStyle}
                                aria-label={`${item.name} entfernen`}
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* Search input + dropdown */}
            <div ref={containerRef} className={css({ position: 'relative' })}>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => handleQueryChange(e.target.value)}
                    onFocus={() => {
                        if (results.length > 0) setOpen(true);
                    }}
                    placeholder={placeholder}
                    className={inputStyle}
                />
                {open && results.length > 0 && (
                    <ul className={dropdownStyle}>
                        {results.map((item) => (
                            <li key={item.id}>
                                <button
                                    type="button"
                                    onClick={() => addItem(item)}
                                    className={dropdownItemStyle}
                                >
                                    {item.name}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function FilterCriteriaForm({
    allCategories,
    selectedCategoryIds,
    selectedTags,
    selectedIngredients,
    maxTotalTime,
    onCategoriesChange,
    onTagsChange,
    onIngredientsChange,
    onMaxTimeChange,
}: FilterCriteriaFormProps) {
    const noTimeLimit = maxTotalTime === null;

    const toggleCategory = (id: string) => {
        if (selectedCategoryIds.includes(id)) {
            onCategoriesChange(selectedCategoryIds.filter((c) => c !== id));
        } else {
            onCategoriesChange([...selectedCategoryIds, id]);
        }
    };

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '5' })}>
            {/* 1. Categories */}
            <div>
                <label className={labelStyle}>Kategorien</label>
                <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '2' })}>
                    {allCategories.map((cat) => {
                        const isActive = selectedCategoryIds.includes(cat.id);
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => toggleCategory(cat.id)}
                                className={css({
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    paddingX: '3',
                                    paddingY: '1.5',
                                    borderRadius: 'full',
                                    borderWidth: '1px',
                                    borderColor: isActive ? 'accent' : 'border.muted',
                                    background: isActive ? 'accent.soft' : 'transparent',
                                    color: isActive ? 'accent' : 'foreground.muted',
                                    fontSize: 'sm',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    _hover: {
                                        borderColor: isActive ? 'accent' : 'border',
                                        background: isActive ? 'accent.soft' : 'surface.elevated',
                                    },
                                })}
                            >
                                {cat.name}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 2. Tags */}
            <SearchDropdown
                label="Tags"
                placeholder="Tag suchen..."
                selected={selectedTags}
                searchFn={searchTags}
                onChange={onTagsChange}
            />

            {/* 3. Ingredients */}
            <SearchDropdown
                label="Zutaten"
                placeholder="Zutat suchen..."
                selected={selectedIngredients}
                searchFn={searchIngredients}
                onChange={onIngredientsChange}
            />

            {/* 4. Max Total Time */}
            <div>
                <label className={labelStyle}>Max. Zubereitungszeit</label>
                <div className={css({ display: 'flex', alignItems: 'center', gap: '3' })}>
                    <input
                        type="number"
                        min={0}
                        value={noTimeLimit ? '' : maxTotalTime}
                        disabled={noTimeLimit}
                        onChange={(e) => {
                            const val = e.target.value;
                            onMaxTimeChange(val === '' ? null : parseInt(val, 10));
                        }}
                        placeholder="Min."
                        className={css({
                            width: '100px',
                            paddingX: '3',
                            paddingY: '2',
                            borderRadius: 'lg',
                            borderWidth: '1px',
                            borderColor: 'border.muted',
                            background: 'surface',
                            color: 'foreground',
                            fontSize: 'sm',
                            opacity: noTimeLimit ? '0.5' : '1',
                            _focus: {
                                outline: 'none',
                                borderColor: 'accent',
                            },
                        })}
                    />
                    <label
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2',
                            fontSize: 'sm',
                            color: 'foreground.muted',
                            cursor: 'pointer',
                            userSelect: 'none',
                        })}
                    >
                        <input
                            type="checkbox"
                            checked={noTimeLimit}
                            onChange={(e) => {
                                onMaxTimeChange(e.target.checked ? null : 30);
                            }}
                            className={css({
                                width: '4',
                                height: '4',
                                accentColor: 'accent',
                                cursor: 'pointer',
                            })}
                        />
                        Keine Begrenzung
                    </label>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const labelStyle = css({
    display: 'block',
    fontSize: 'sm',
    fontWeight: '600',
    color: 'foreground.muted',
    marginBottom: '2',
});

const pillContainerStyle = css({
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1.5',
    marginBottom: '2',
});

const pillStyle = css({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '1',
    paddingX: '2.5',
    paddingY: '1',
    borderRadius: 'full',
    background: 'accent.soft',
    color: 'accent',
    fontSize: 'xs',
    fontWeight: '500',
});

const pillRemoveStyle = css({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.5',
    borderRadius: 'full',
    cursor: 'pointer',
    color: 'accent',
    opacity: '0.7',
    _hover: { opacity: '1' },
});

const inputStyle = css({
    width: '100%',
    paddingX: '3',
    paddingY: '2',
    borderRadius: 'lg',
    borderWidth: '1px',
    borderColor: 'border.muted',
    background: 'surface',
    color: 'foreground',
    fontSize: 'sm',
    _focus: {
        outline: 'none',
        borderColor: 'accent',
    },
    _placeholder: {
        color: 'foreground.muted',
        opacity: '0.6',
    },
});

const dropdownStyle = css({
    position: 'absolute',
    top: '100%',
    left: '0',
    right: '0',
    marginTop: '1',
    background: 'surface.elevated',
    borderWidth: '1px',
    borderColor: 'border.muted',
    borderRadius: 'lg',
    maxHeight: '200px',
    overflowY: 'auto',
    zIndex: '50',
    boxShadow: 'lg',
    listStyle: 'none',
    padding: '1',
});

const dropdownItemStyle = css({
    display: 'block',
    width: '100%',
    textAlign: 'left',
    paddingX: '3',
    paddingY: '2',
    borderRadius: 'md',
    fontSize: 'sm',
    color: 'foreground',
    cursor: 'pointer',
    _hover: {
        background: 'accent.soft',
        color: 'accent',
    },
});
