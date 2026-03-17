'use client';

import { PALETTE } from '@app/lib/palette';

import { css } from 'styled-system/css';

import type { IngredientSearchResult } from '../data';

/** Shared dropdown container for ingredient search results. */
export function IngredientSearchDropdown({
    children,
    onMouseDown,
    ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={dropdownClass}
            onMouseDown={(e) => {
                e.preventDefault();
                onMouseDown?.(e);
            }}
            {...rest}
        >
            {children}
        </div>
    );
}

/** A single ingredient search result row. */
export function IngredientResultItem({
    result,
    onClick,
    categoryFallback = '',
    isMatch = false,
}: {
    result: IngredientSearchResult;
    onClick: () => void;
    categoryFallback?: string;
    isMatch?: boolean;
}) {
    return (
        <button type="button" onClick={onClick} className={resultBtnClass}>
            <span className={css({ display: 'flex', alignItems: 'center', gap: '1.5' })}>
                {isMatch && <span className={matchDotClass} />}
                <span className={css({ fontWeight: '500' })}>
                    {result.name}
                    {result.matchedAlias && (
                        <span className={css({ fontWeight: '400', color: 'text.muted' })}>
                            {' '}
                            ({result.matchedAlias})
                        </span>
                    )}
                </span>
            </span>
            <span className={css({ color: 'text.muted', fontSize: 'xs', ml: '2' })}>
                {result.categories?.[0] || categoryFallback}
            </span>
        </button>
    );
}

/** "Add new" button at the bottom of the dropdown. */
export function IngredientAddNewButton({ name, onClick }: { name: string; onClick: () => void }) {
    return (
        <button type="button" onClick={onClick} className={addNewBtnClass}>
            <span className={css({ color: PALETTE.orange, fontWeight: '700', mr: '1' })}>+</span>
            <span>&ldquo;{name}&rdquo; hinzufügen</span>
        </button>
    );
}

/* ── Styles ── */

const dropdownClass = css({
    position: 'absolute',
    top: '100%',
    left: '0',
    right: '0',
    bg: { base: 'white', _dark: 'surface' },
    borderRadius: 'xl',
    boxShadow: { base: 'lg', _dark: '0 10px 25px rgba(0,0,0,0.4)' },
    zIndex: '10',
    maxH: '200px',
    overflowY: 'auto',
    border: { base: 'none', _dark: '1px solid rgba(224,123,83,0.15)' },
});

const resultBtnClass = css({
    width: '100%',
    px: '3',
    py: '2.5',
    textAlign: 'left',
    bg: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'text',
    fontSize: 'sm',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    _hover: { bg: { base: 'rgba(224,123,83,0.1)', _dark: 'rgba(224,123,83,0.15)' } },
});

const matchDotClass = css({
    width: '6px',
    height: '6px',
    borderRadius: 'full',
    bg: 'palette.orange',
    flexShrink: '0',
});

const addNewBtnClass = css({
    width: '100%',
    padding: '3',
    textAlign: 'left',
    bg: 'transparent',
    border: 'none',
    borderTop: {
        base: '1px dashed rgba(224,123,83,0.25)',
        _dark: '1px dashed rgba(224,123,83,0.2)',
    },
    cursor: 'pointer',
    color: 'text.muted',
    fontSize: 'sm',
    display: 'flex',
    alignItems: 'center',
    _hover: {
        bg: { base: 'rgba(224,123,83,0.06)', _dark: 'rgba(224,123,83,0.1)' },
        color: 'text',
    },
});
