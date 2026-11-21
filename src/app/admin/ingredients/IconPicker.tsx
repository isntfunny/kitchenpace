'use client';

import { useMemo, useState } from 'react';

import { IngredientIcon } from '@app/components/ingredients/IngredientIcon';
import { ICON_NAMES } from '@shared/ingredient-icons/names';

import { css, cx } from 'styled-system/css';

import { inputStyle } from './ingredient-types';

const gridStyle = css({
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))',
    gap: '1',
    maxHeight: '180px',
    overflowY: 'auto',
    padding: '1',
    borderRadius: 'lg',
    borderWidth: '1px',
    borderColor: 'border.muted',
    bg: 'surface',
});

const cellStyle = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '44px',
    borderRadius: 'md',
    borderWidth: '1px',
    borderColor: 'transparent',
    bg: 'transparent',
    color: 'foreground',
    cursor: 'pointer',
    _hover: { bg: 'surface.muted' },
});

const cellSelectedStyle = css({
    borderColor: 'brand.primary',
    bg: 'accent.soft',
    color: 'brand.primary',
});

/**
 * Picks an icon from the allowed list (preview + search by name). `null` means
 * "none chosen": the ingredient shows `fallback` (its category's icon).
 */
export function IconPicker({
    value,
    onChange,
    fallback,
}: {
    value: string | null;
    onChange: (icon: string | null) => void;
    /** Icon shown while none is chosen, e.g. the category icon */
    fallback?: string;
}) {
    const [query, setQuery] = useState('');
    const names = useMemo(() => {
        const q = query.trim().toLowerCase().replace(/\s+/g, '-');
        return q ? ICON_NAMES.filter((name) => name.includes(q)) : [...ICON_NAMES];
    }, [query]);

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '2' })}>
            <div className={css({ display: 'flex', alignItems: 'center', gap: '3' })}>
                <span
                    className={css({
                        display: 'inline-flex',
                        padding: '2',
                        borderRadius: 'lg',
                        bg: 'accent.soft',
                        color: 'foreground',
                    })}
                >
                    <IngredientIcon icon={value ?? fallback} size={32} />
                </span>
                <div className={css({ fontSize: 'sm', color: 'foreground.muted', flex: '1' })}>
                    {value ? (
                        <code>{value}</code>
                    ) : (
                        <>Kein eigenes Icon – es gilt das Icon der Kategorie</>
                    )}
                </div>
                {value && (
                    <button
                        type="button"
                        onClick={() => onChange(null)}
                        className={css({
                            fontSize: 'xs',
                            color: 'foreground.muted',
                            textDecoration: 'underline',
                            bg: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                        })}
                    >
                        Zurücksetzen
                    </button>
                )}
            </div>
            <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Icon suchen (z. B. milk, cheese)…"
                aria-label="Icon suchen"
                className={inputStyle}
            />
            <div className={gridStyle} role="listbox" aria-label="Erlaubte Icons">
                {names.map((name) => (
                    <button
                        key={name}
                        type="button"
                        role="option"
                        aria-selected={name === value}
                        title={name}
                        onClick={() => onChange(name)}
                        className={cx(cellStyle, name === value && cellSelectedStyle)}
                    >
                        <IngredientIcon icon={name} size={26} />
                    </button>
                ))}
                {names.length === 0 && (
                    <span
                        className={css({ fontSize: 'sm', color: 'foreground.muted', padding: '2' })}
                    >
                        Kein Icon gefunden.
                    </span>
                )}
            </div>
        </div>
    );
}
