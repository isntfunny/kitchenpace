'use client';

import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { css } from 'styled-system/css';

type Option = {
    value: string;
    label: string;
};

interface AutocompleteProps {
    type: 'categories' | 'tags';
    placeholder: string;
    emptyMessage: string;
    selected: Option[];
    multiple?: boolean;
    onChange: (next: Option[]) => void;
}

const inputClass = css({
    w: '100%',
    mt: '1',
    px: '2',
    py: '1',
    pl: '8',
    border: '1px solid',
    borderColor: 'border',
    borderRadius: 'md',
    bg: 'background',
    fontSize: 'sm',
    outline: 'none',
    _focus: { borderColor: 'accent' },
});

export function FilterAutocomplete({
    type,
    placeholder,
    emptyMessage,
    selected,
    multiple = false,
    onChange,
}: AutocompleteProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Option[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedValues = useMemo(() => new Set(selected.map((item) => item.value)), [selected]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current?.contains(event.target as Node)) return;
            setIsOpen(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const trimmed = query.trim();
        if (trimmed.length < 1) {
            setResults([]);
            return;
        }

        const controller = new AbortController();
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams({ type, q: trimmed });
                const response = await fetch(`/api/collections/filter-options?${params}`, {
                    signal: controller.signal,
                });
                if (!response.ok) throw new Error('Filter option search failed');
                const data = (await response.json()) as { results?: Option[] };
                setResults(data.results ?? []);
            } catch (error) {
                if ((error as Error).name !== 'AbortError') {
                    setResults([]);
                }
            } finally {
                setLoading(false);
            }
        }, 200);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [query, type]);

    const visibleResults = results.filter((item) => !selectedValues.has(item.value));

    const handleSelect = (option: Option) => {
        onChange(multiple ? [...selected, option] : [option]);
        setQuery('');
        setResults([]);
        setIsOpen(false);
    };

    const handleRemove = (value: string) => {
        onChange(selected.filter((item) => item.value !== value));
    };

    return (
        <div ref={containerRef} className={css({ position: 'relative' })}>
            {selected.length > 0 && (
                <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '2', mb: '2' })}>
                    {selected.map((option) => (
                        <span
                            key={option.value}
                            className={css({
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '1',
                                px: '2',
                                py: '1',
                                borderRadius: 'full',
                                bg: 'accent.soft',
                                color: 'text',
                                fontSize: 'xs',
                            })}
                        >
                            {option.label}
                            <button
                                type="button"
                                onClick={() => handleRemove(option.value)}
                                className={css({
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: 'foreground.muted',
                                    _hover: { color: 'text' },
                                })}
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            <div className={css({ position: 'relative' })}>
                <span
                    className={css({
                        position: 'absolute',
                        left: '2.5',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'foreground.muted',
                        pointerEvents: 'none',
                    })}
                >
                    <Search size={14} />
                </span>
                <input
                    type="text"
                    value={query}
                    onFocus={() => setIsOpen(true)}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setIsOpen(true);
                    }}
                    placeholder={placeholder}
                    className={inputClass}
                />
            </div>

            {isOpen && query.trim().length >= 1 && (
                <div
                    className={css({
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: 'calc(100% + 4px)',
                        maxH: '220px',
                        overflowY: 'auto',
                        border: '1px solid',
                        borderColor: 'border',
                        borderRadius: 'lg',
                        bg: 'surface.elevated',
                        boxShadow: 'sm',
                        zIndex: 50,
                    })}
                >
                    {loading && (
                        <p className={css({ p: '3', fontSize: 'xs', color: 'foreground.muted' })}>
                            Suche…
                        </p>
                    )}
                    {!loading && visibleResults.length === 0 && (
                        <p className={css({ p: '3', fontSize: 'xs', color: 'foreground.muted' })}>
                            {emptyMessage}
                        </p>
                    )}
                    {!loading &&
                        visibleResults.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onMouseDown={(event) => {
                                    event.preventDefault();
                                    handleSelect(option);
                                }}
                                className={css({
                                    display: 'block',
                                    w: '100%',
                                    p: '2',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    _hover: { bg: 'accent.soft' },
                                })}
                            >
                                <div className={css({ fontSize: 'sm', color: 'text' })}>
                                    {option.label}
                                </div>
                            </button>
                        ))}
                </div>
            )}
        </div>
    );
}
