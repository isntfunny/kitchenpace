'use client';

import { ToggleGroup } from 'radix-ui';
import { useMemo, useState } from 'react';

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
};

const chipItemClass = css({
    borderRadius: 'full',
    px: '3',
    py: '2',
    minHeight: '44px',
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
    display: 'flex',
    flexWrap: 'wrap',
    gap: '2',
    '&::-webkit-scrollbar': {
        width: '6px',
    },
    '&::-webkit-scrollbar-track': {
        background: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
        background: 'light',
        borderRadius: 'full',
    },
});

export function SearchableFilterChips({
    items,
    selectedValues,
    onSelectionChange,
    placeholder = 'Suchen...',
    emptyMessage = 'Keine Ergebnisse gefunden.',
    ariaLabel,
    variant = 'default',
}: SearchableFilterChipsProps) {
    const [query, setQuery] = useState('');

    const filteredItems = useMemo(() => {
        let filtered = items;
        if (query.trim()) {
            const normalizedQuery = query.toLowerCase().trim();
            filtered = items.filter((item) => item.name.toLowerCase().includes(normalizedQuery));
        }
        return filtered.sort((a, b) => {
            if (a.selected && !b.selected) return -1;
            if (!a.selected && b.selected) return 1;
            return b.count - a.count;
        });
    }, [items, query]);

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
            {filteredItems.length === 0 ? (
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
                        {filteredItems.map((item) => {
                            const isZeroCount = item.count === 0 && !item.selected;
                            const badgeClass = isZeroCount ? chipBadgeMutedClass : chipBadgeClass;
                            return (
                                <ToggleGroup.Item
                                    key={item.name}
                                    value={item.name}
                                    className={cx(itemClass, isZeroCount && chipZeroClass)}
                                >
                                    <span>{item.name}</span>
                                    <span className={badgeClass}>{item.count}</span>
                                </ToggleGroup.Item>
                            );
                        })}
                    </ToggleGroup.Root>
                </div>
            )}
        </div>
    );
}
