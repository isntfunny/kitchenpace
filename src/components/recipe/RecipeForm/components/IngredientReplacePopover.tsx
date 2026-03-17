'use client';

import { css } from 'styled-system/css';

import type { IngredientSearchResult } from '../data';

import { IngredientSearchInput } from './IngredientSearchInput';

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
    return (
        <div className={wrapperClass}>
            <IngredientSearchInput
                initialQuery={currentName}
                autoSelect
                size="compact"
                onSelect={(result) => onReplace(result)}
                onEscape={onCancel}
                placeholder="Zutat ersetzen…"
            />
        </div>
    );
}

const wrapperClass = css({
    position: 'relative',
    flex: '1',
    minWidth: 0,
});
