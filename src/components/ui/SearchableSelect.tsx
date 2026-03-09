'use client';

import debounce from 'lodash/debounce';
import { Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { css } from 'styled-system/css';

interface SearchItem {
    id: string;
    title?: string;
    name?: string;
    imageKey?: string | null;
    rating?: number | null;
    avatar?: string | null;
    recipeCount?: number;
}

interface RenderOptionResult {
    label: string;
    sublabel?: string;
    avatar?: string;
}

interface SearchableSelectProps {
    valueId: string;
    valueLabel: string;
    onSelect: (id: string, label: string) => void;
    searchFn: (query: string) => Promise<SearchItem[]>;
    placeholder?: string;
    renderOption: (item: SearchItem) => RenderOptionResult;
    emptyMessage?: string;
}

export function SearchableSelect({
    valueId,
    valueLabel,
    onSelect,
    searchFn,
    placeholder = 'Suchen...',
    renderOption,
    emptyMessage = 'Keine Ergebnisse',
}: SearchableSelectProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchItem[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const search = useCallback(
        async (q: string) => {
            if (q.length < 2) {
                setResults([]);
                return;
            }
            setIsLoading(true);
            try {
                const items = await searchFn(q);
                setResults(items);
            } finally {
                setIsLoading(false);
            }
        },
        [searchFn],
    );

    const debouncedSearch = useMemo(() => debounce(search, 300), [search]);

    const handleInputChange = (value: string) => {
        setQuery(value);
        setIsOpen(true);
        debouncedSearch(value);
    };

    useEffect(() => {
        return () => debouncedSearch.cancel();
    }, [debouncedSearch]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (item: SearchItem) => {
        const rendered = renderOption(item);
        onSelect(item.id, rendered.label);
        setQuery('');
        setResults([]);
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} className={css({ position: 'relative' })}>
            <div className={css({ position: 'relative' })}>
                <Search
                    size={16}
                    className={css({
                        position: 'absolute',
                        left: '3',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'foreground.muted',
                        pointerEvents: 'none',
                    })}
                />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onFocus={() => {
                        if (results.length > 0) setIsOpen(true);
                    }}
                    placeholder={valueLabel || placeholder}
                    className={css({
                        width: 'full',
                        paddingY: '2',
                        paddingLeft: '9',
                        paddingRight: '3',
                        borderRadius: 'lg',
                        borderWidth: '1px',
                        borderColor: 'border.muted',
                        background: 'surface',
                        fontSize: 'sm',
                        outline: 'none',
                        _focus: { borderColor: 'border.accent' },
                    })}
                />
            </div>

            {isOpen && (
                <div
                    className={css({
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: '0',
                        right: '0',
                        background: 'surface.elevated',
                        borderRadius: 'lg',
                        borderWidth: '1px',
                        borderColor: 'border.muted',
                        boxShadow: 'lg',
                        zIndex: '50',
                        maxHeight: '240px',
                        overflowY: 'auto',
                    })}
                >
                    {isLoading && (
                        <div
                            className={css({
                                padding: '3',
                                textAlign: 'center',
                                fontSize: 'sm',
                                color: 'foreground.muted',
                            })}
                        >
                            Laden...
                        </div>
                    )}
                    {!isLoading && results.length === 0 && query.length >= 2 && (
                        <div
                            className={css({
                                padding: '3',
                                textAlign: 'center',
                                fontSize: 'sm',
                                color: 'foreground.muted',
                            })}
                        >
                            {emptyMessage}
                        </div>
                    )}
                    {!isLoading &&
                        results.map((item) => {
                            const rendered = renderOption(item);
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => handleSelect(item)}
                                    className={css({
                                        width: 'full',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3',
                                        padding: '3',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        background: item.id === valueId ? 'surface' : undefined,
                                        _hover: { background: 'surface' },
                                    })}
                                >
                                    {rendered.avatar && (
                                        <img
                                            src={rendered.avatar}
                                            alt=""
                                            className={css({
                                                width: '8',
                                                height: '8',
                                                borderRadius: 'lg',
                                                objectFit: 'cover',
                                                flexShrink: '0',
                                            })}
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    )}
                                    <div className={css({ minWidth: '0' })}>
                                        <p
                                            className={css({
                                                fontSize: 'sm',
                                                fontWeight: '500',
                                                truncate: true,
                                            })}
                                        >
                                            {rendered.label}
                                        </p>
                                        {rendered.sublabel && (
                                            <p
                                                className={css({
                                                    fontSize: 'xs',
                                                    color: 'foreground.muted',
                                                })}
                                            >
                                                {rendered.sublabel}
                                            </p>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                </div>
            )}
        </div>
    );
}
