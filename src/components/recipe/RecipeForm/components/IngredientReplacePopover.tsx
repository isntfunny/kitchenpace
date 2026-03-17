'use client';

import { useEffect, useRef, useState } from 'react';

import { css } from 'styled-system/css';

import { useIngredientSearch } from '../../useIngredientSearch';
import type { IngredientSearchResult } from '../data';

import { IngredientResultItem, IngredientSearchDropdown } from './IngredientSearchDropdown';

interface IngredientReplacePopoverProps {
    currentName: string;
    onReplace: (replacement: IngredientSearchResult) => void;
    onCancel: () => void;
}

export function IngredientReplacePopover({
    currentName,
    onReplace,
    onCancel,
}: IngredientReplacePopoverProps) {
    const [query, setQuery] = useState(currentName);
    const inputRef = useRef<HTMLInputElement>(null);
    const { results } = useIngredientSearch(query);

    useEffect(() => {
        inputRef.current?.select();
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
        }
    };

    return (
        <div className={wrapperClass}>
            <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Zutat ersetzen…"
                className={inputClass}
                autoComplete="off"
            />
            {query.length >= 2 && results.length > 0 && (
                <IngredientSearchDropdown>
                    {results.map((r) => (
                        <IngredientResultItem key={r.id} result={r} onClick={() => onReplace(r)} />
                    ))}
                </IngredientSearchDropdown>
            )}
        </div>
    );
}

const wrapperClass = css({
    position: 'relative',
    flex: '1',
    minWidth: 0,
});

const inputClass = css({
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
