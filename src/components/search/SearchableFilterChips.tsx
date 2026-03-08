'use client';

import { AnimatePresence, motion } from 'motion/react';
import { ToggleGroup } from 'radix-ui';
import { useEffect, useMemo, useRef, useState } from 'react';

import { css, cx } from 'styled-system/css';

export type FilterChipItem = {
    name: string;
    count: number;
    selected: boolean;
};

export type SearchableFilterChipsProps = {
    items: FilterChipItem[];
    selectedValues: string[];
    onSelectionChange: (values: string[]) => void;
    placeholder?: string;
    emptyMessage?: string;
    ariaLabel: string;
    variant?: 'default' | 'exclude';
    /** OpenSearch suggest field: 'tags' | 'ingredients'. Enables server-side typeahead. */
    suggestField?: 'tags' | 'ingredients';
};

const chipItemClass = css({
    borderRadius: 'full',
    px: '2.5',
    py: '1',
    fontSize: 'xs',
    border: '1px solid',
    borderColor: 'border.muted',
    background: 'surface',
    color: 'foreground',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '1.5',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'border 150ms ease, box-shadow 150ms ease, background 150ms ease',
    '&[data-state="on"]': {
        borderColor: 'primary',
        background: 'accent.soft',
        color: 'primary',
        boxShadow: '0 8px 16px rgba(224,123,83,0.15)',
    },
});

const chipItemExcludeClass = cx(
    chipItemClass,
    css({
        '&[data-state="on"]': {
            borderColor: 'red.600',
            background: 'red.600',
            color: 'white',
        },
    }),
);

const chipBadgeClass = css({
    fontSize: 'xs',
    background: 'accent.soft',
    borderRadius: 'full',
    px: '2',
    py: '0.5',
});

const chipBadgeMutedClass = css({
    fontSize: 'xs',
    padding: '0.25 0.5',
    borderRadius: 'full',
    background: 'transparent',
    border: '1px solid',
    borderColor: 'border.muted',
    color: 'foreground.muted',
});

const chipZeroClass = css({
    color: 'foreground.muted',
    borderColor: 'border.muted',
    background: 'surface',
});

const searchInputClass = css({
    width: '100%',
    borderRadius: 'lg',
    border: '1px solid',
    borderColor: 'border.muted',
    background: 'surface',
    px: '3',
    py: '2',
    fontSize: 'sm',
    marginBottom: '2',
    '&::placeholder': {
        color: 'foreground.muted',
    },
});

const scrollContainerClass = css({
    maxHeight: '200px',
    overflowY: 'auto',
    scrollbarWidth: 'none',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '2',
    '&::-webkit-scrollbar': {
        display: 'none',
    },
});

type SuggestResult = { name: string; count: number };

export function SearchableFilterChips({
    items,
    selectedValues,
    onSelectionChange,
    placeholder = 'Suchen...',
    emptyMessage = 'Keine Ergebnisse gefunden.',
    ariaLabel,
    variant = 'default',
    suggestField,
}: SearchableFilterChipsProps) {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<SuggestResult[]>([]);
    const [, setSuggestLoading] = useState(false);
    /** The query string that the current suggestions correspond to */
    const [suggestionsForQuery, setSuggestionsForQuery] = useState('');
    const abortRef = useRef<AbortController | null>(null);

    // Debounced OpenSearch typeahead
    useEffect(() => {
        if (!suggestField) return;
        const trimmed = query.trim();
        if (trimmed.length < 2) {
            setSuggestions([]);
            setSuggestionsForQuery(trimmed);
            return;
        }

        setSuggestLoading(true);
        const controller = new AbortController();
        abortRef.current?.abort();
        abortRef.current = controller;

        const timer = setTimeout(async () => {
            try {
                const params = new URLSearchParams({ q: trimmed, field: suggestField });
                const res = await fetch(`/api/recipes/suggest?${params}`, {
                    signal: controller.signal,
                });
                if (!res.ok) throw new Error();
                const json = await res.json();
                setSuggestions(json.results ?? []);
                setSuggestionsForQuery(trimmed);
            } catch (err) {
                if ((err as Error).name !== 'AbortError') {
                    setSuggestions([]);
                    setSuggestionsForQuery(trimmed);
                }
            } finally {
                setSuggestLoading(false);
            }
        }, 300);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [query, suggestField]);

    const filteredItems = useMemo(() => {
        const trimmed = query.trim();
        let filtered = items;

        if (trimmed) {
            const normalizedQuery = trimmed.toLowerCase();
            // Client-side filter existing items
            filtered = items.filter((item) => item.name.toLowerCase().includes(normalizedQuery));

            // Merge in server suggestions that aren't already in filtered items
            if (suggestField && suggestions.length > 0) {
                const existingNames = new Set(filtered.map((item) => item.name.toLowerCase()));
                const newSuggestions = suggestions
                    .filter((s) => !existingNames.has(s.name.toLowerCase()))
                    .map((s) => ({
                        name: s.name,
                        count: s.count,
                        selected: selectedValues.includes(s.name),
                    }));
                filtered = [...filtered, ...newSuggestions];
            }
        }

        return filtered.sort((a, b) => {
            if (a.selected && !b.selected) return -1;
            if (!a.selected && b.selected) return 1;
            return b.count - a.count;
        });
    }, [items, query, suggestions, suggestField, selectedValues]);

    // Hold previous chip list while server suggestions are pending to avoid double-jump.
    // "Pending" = query ≥2 chars and suggestions don't match current query yet.
    const trimmedQuery = query.trim();
    const suggestPending =
        !!suggestField && trimmedQuery.length >= 2 && suggestionsForQuery !== trimmedQuery;
    const stableItemsRef = useRef(filteredItems);
    if (!suggestPending) {
        stableItemsRef.current = filteredItems;
    }
    const displayItems = suggestPending ? stableItemsRef.current : filteredItems;

    const handleToggle = (value: string[]) => {
        onSelectionChange(value);
    };

    const itemClass = variant === 'exclude' ? chipItemExcludeClass : chipItemClass;

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '2' })}>
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                className={searchInputClass}
            />
            {suggestPending && (
                <p className={css({ fontSize: 'xs', color: 'foreground.muted' })}>Suche...</p>
            )}
            {displayItems.length === 0 && !suggestPending ? (
                <p className={css({ fontSize: 'xs', color: 'text-muted' })}>{emptyMessage}</p>
            ) : (
                <div className={scrollContainerClass}>
                    <ToggleGroup.Root
                        type="multiple"
                        className={css({
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '2',
                            width: '100%',
                        })}
                        aria-label={ariaLabel}
                        value={selectedValues}
                        onValueChange={handleToggle}
                    >
                        <AnimatePresence mode="popLayout">
                            {displayItems.map((item) => {
                                const isZeroCount = item.count === 0 && !item.selected;
                                const isLoadingCount = item.count === -1;
                                const badgeClass = isZeroCount ? chipBadgeMutedClass : chipBadgeClass;
                                return (
                                    <motion.div
                                        key={item.name}
                                        layout="position"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        transition={{
                                            layout: { type: 'spring', damping: 25, stiffness: 280 },
                                            opacity: { duration: 0.15 },
                                            scale: { duration: 0.15 },
                                        }}
                                    >
                                        <ToggleGroup.Item
                                            value={item.name}
                                            className={cx(itemClass, isZeroCount && chipZeroClass)}
                                        >
                                            <span>{item.name}</span>
                                            <span className={badgeClass}>
                                                {isLoadingCount ? '-' : item.count}
                                            </span>
                                        </ToggleGroup.Item>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </ToggleGroup.Root>
                </div>
            )}
        </div>
    );
}
