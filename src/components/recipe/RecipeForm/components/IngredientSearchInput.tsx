'use client';

import { useCombobox } from 'downshift';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { searchIngredients } from '@app/components/recipe/actions';
import type { ParsedIngredientInput } from '@app/lib/ingredients/parseIngredientInput';

import { css } from 'styled-system/css';

import { useIngredientSearch } from '../../useIngredientSearch';
import type { IngredientSearchResult } from '../data';

import {
    IngredientAddNewButton,
    IngredientResultItem,
    IngredientSearchDropdown,
} from './IngredientSearchDropdown';

const EMPTY_ITEMS: IngredientSearchResult[] = [];

export interface IngredientSearchInputProps {
    /** Called when user selects an existing ingredient. */
    onSelect: (result: IngredientSearchResult, parsed: ParsedIngredientInput) => void;
    /** Called when user creates a new ingredient (NEU → Enter). Omit to hide NEU/create. */
    onCreateNew?: (name: string, parsed: ParsedIngredientInput) => Promise<void>;
    /** Escape key handler. */
    onEscape?: () => void;
    /** Pre-fill query (for replace popover). */
    initialQuery?: string;
    /** Auto-select text on mount (for replace popover). */
    autoSelect?: boolean;
    /** Visual size variant. */
    size?: 'default' | 'compact';
    placeholder?: string;
    disabled?: boolean;
    'data-tutorial'?: string;
}

export function IngredientSearchInput({
    onSelect,
    onCreateNew,
    onEscape,
    initialQuery = '',
    autoSelect = false,
    size = 'default',
    placeholder,
    disabled = false,
    ...rest
}: IngredientSearchInputProps) {
    const [query, setQuery] = useState(initialQuery);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const search = useIngredientSearch(query);
    const {
        results: searchResults,
        parsed,
        bestMatch,
        matchType,
        isLoading,
        cancelDebounce,
    } = search;

    // Auto-select text on mount
    useEffect(() => {
        if (autoSelect) inputRef.current?.select();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const showDropdown = query.length >= 2;
    const busy = isSubmitting || isLoading;

    // Derived: show NEU badge when search completed with no match
    const showNeuBadge =
        !isLoading && !isSubmitting && query.length >= 2 && matchType === 'none' && !!onCreateNew;

    const finishSubmit = useCallback(() => {
        setIsSubmitting(false);
        setQuery('');
        inputRef.current?.focus();
    }, []);

    const handleSelect = useCallback(
        (result: IngredientSearchResult, overrideParsed?: ParsedIngredientInput) => {
            onSelect(result, overrideParsed ?? parsed);
            finishSubmit();
        },
        [onSelect, parsed, finishSubmit],
    );

    const handleCreateNew = useCallback(
        async (overrideName?: string, overrideParsed?: ParsedIngredientInput) => {
            if (!onCreateNew) return;
            const name = overrideName ?? (parsed.name || query.trim());
            if (!name) return;
            setIsSubmitting(true);
            try {
                await onCreateNew(name, overrideParsed ?? parsed);
            } finally {
                finishSubmit();
            }
        },
        [onCreateNew, parsed, query, finishSubmit],
    );

    // Items for Downshift — only show when dropdown is visible and not busy
    const items = showDropdown && !busy ? searchResults : EMPTY_ITEMS;

    const { getInputProps, getMenuProps, highlightedIndex, setHighlightedIndex } = useCombobox({
        items,
        itemToString: (item) => item?.name ?? '',
        inputValue: query,
        isOpen: showDropdown && !busy && items.length > 0,
        defaultHighlightedIndex: 0,
        onInputValueChange: ({ inputValue, type }) => {
            // Only update query from user typing, not from Downshift's item selection
            if (type === useCombobox.stateChangeTypes.InputChange) {
                setQuery(inputValue ?? '');
            }
        },
        onSelectedItemChange: ({ selectedItem }) => {
            if (selectedItem) {
                handleSelect(selectedItem);
            }
        },
        stateReducer: (state, actionAndChanges) => {
            const { type, changes } = actionAndChanges;

            switch (type) {
                case useCombobox.stateChangeTypes.InputKeyDownEnter:
                    if (state.highlightedIndex < 0 || items.length === 0) {
                        return { ...changes, selectedItem: null, inputValue: state.inputValue };
                    }
                    return changes;

                case useCombobox.stateChangeTypes.InputKeyDownEscape:
                    // Always preserve input value on Escape — closing the dropdown shouldn't wipe the query
                    return { ...changes, inputValue: state.inputValue };

                default:
                    return changes;
            }
        },
    });

    // Custom keydown for Enter (NEU/immediate search) and Escape
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape' && onEscape) {
            e.preventDefault();
            e.stopPropagation();
            onEscape();
            return;
        }

        if (e.key === 'Enter') {
            // If Downshift handled the selection (highlighted item exists), let it through
            if (highlightedIndex >= 0 && items.length > 0) return;

            e.preventDefault();
            if (!query.trim() || isSubmitting || disabled) return;

            // bestMatch from search → select directly
            if (bestMatch) {
                handleSelect(bestMatch);
                return;
            }

            // NEU badge showing → create new (showNeuBadge already implies onCreateNew)
            if (showNeuBadge) {
                void handleCreateNew();
                return;
            }

            // Search still pending → fire immediate search
            setIsSubmitting(true);
            cancelDebounce();
            void searchIngredients(query.trim()).then((fresh) => {
                if (fresh.bestMatch) {
                    handleSelect(fresh.bestMatch, fresh.parsed);
                } else if (onCreateNew) {
                    void handleCreateNew(fresh.parsed.name || undefined, fresh.parsed);
                } else {
                    setIsSubmitting(false);
                }
            });
        }
    };

    const inputProps = getInputProps({
        ref: inputRef,
        onKeyDown: handleKeyDown,
        disabled: disabled || isSubmitting,
        placeholder,
        autoComplete: 'off',
        ...rest,
    });

    const isCompact = size === 'compact';

    return (
        <div className={css({ position: 'relative' })}>
            <input
                {...inputProps}
                className={isCompact ? compactInputClass : defaultInputClass}
                style={{ position: 'relative' }}
            />

            {/* Right-side badge: loading spinner / match dot / NEU badge */}
            {query.length >= 2 && (
                <div className={badgeSlotClass}>
                    {busy ? (
                        <Loader2 size={14} className={spinnerClass} />
                    ) : showNeuBadge ? (
                        <span className={neuBadgeClass}>NEU</span>
                    ) : bestMatch ? (
                        <span className={matchDotClass} title={`Match: ${bestMatch.name}`} />
                    ) : null}
                </div>
            )}

            {/* Dropdown */}
            <div {...getMenuProps()} className={css({ position: 'relative' })}>
                {showDropdown && !busy && (searchResults.length > 0 || query.length >= 2) && (
                    <IngredientSearchDropdown data-tutorial-child="ingredient-search">
                        {searchResults.map((ing, index) => (
                            <IngredientResultItem
                                key={ing.id}
                                result={ing}
                                categoryFallback="Ohne Kategorie"
                                isMatch={ing.id === bestMatch?.id}
                                isHighlighted={highlightedIndex === index}
                                onMouseEnter={() => setHighlightedIndex(index)}
                                onClick={() => handleSelect(ing)}
                            />
                        ))}
                        {matchType === 'none' && onCreateNew && (
                            <IngredientAddNewButton
                                name={parsed.name || query.trim()}
                                onClick={() => void handleCreateNew()}
                            />
                        )}
                    </IngredientSearchDropdown>
                )}
            </div>
        </div>
    );
}

/* ── Styles ─────────────────────────────────────────────── */

const defaultInputClass = css({
    width: '100%',
    padding: '3',
    borderRadius: 'xl',
    border: '1px solid',
    borderColor: { base: 'rgba(224,123,83,0.4)', _dark: 'rgba(224,123,83,0.45)' },
    fontSize: 'md',
    outline: 'none',
    bg: { base: 'white', _dark: 'surface' },
    color: 'text',
    _focus: {
        borderColor: 'palette.orange',
        boxShadow: {
            base: '0 0 0 3px rgba(224,123,83,0.15)',
            _dark: '0 0 0 3px rgba(224,123,83,0.2)',
        },
    },
    _disabled: {
        opacity: '0.6',
        cursor: 'wait',
    },
});

const compactInputClass = css({
    width: '100%',
    py: '1',
    px: '2',
    fontSize: 'sm',
    fontWeight: '500',
    borderRadius: 'md',
    border: '1px solid',
    borderColor: 'palette.orange',
    outline: 'none',
    bg: { base: 'white', _dark: 'rgba(255,255,255,0.06)' },
    color: 'text',
    _focus: {
        boxShadow: {
            base: '0 0 0 2px rgba(224,123,83,0.15)',
            _dark: '0 0 0 2px rgba(224,123,83,0.2)',
        },
    },
});

const badgeSlotClass = css({
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: '5',
    display: 'flex',
    alignItems: 'center',
});

const neuBadgeClass = css({
    fontSize: '9px',
    fontWeight: '700',
    px: '2',
    py: '0.5',
    borderRadius: 'md',
    color: 'white',
    bg: 'palette.orange',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    lineHeight: '1',
    pointerEvents: 'none',
});

const matchDotClass = css({
    width: '8px',
    height: '8px',
    borderRadius: 'full',
    bg: 'palette.orange',
    pointerEvents: 'none',
});

const spinnerClass = css({
    color: 'text.muted',
    animation: 'spin 1s linear infinite',
});
