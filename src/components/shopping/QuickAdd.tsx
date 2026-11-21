'use client';

import { Plus } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import { searchShoppingIngredients } from '@app/app/shopping-list/actions';

import { css, cx } from 'styled-system/css';

interface Hit {
    id: string;
    name: string;
}

export interface QuickAddEntry {
    name: string;
    ingredientId: string | null;
    amount: string | null;
    unit: string | null;
}

const form = css({ position: 'relative', flex: '1', minW: 0 });
const inputRow = css({
    display: 'flex',
    alignItems: 'center',
    gap: '2',
    px: '4',
    minH: '12',
    bg: 'surface',
    color: 'foreground',
    border: '1px solid',
    borderColor: 'border',
    borderRadius: 'xl',
    transition: 'border-color 150ms ease',
    _focusWithin: { borderColor: 'primary', boxShadow: '0 0 0 3px rgba(224, 123, 83, 0.18)' },
});
const input = css({
    flex: '1',
    minW: 0,
    bg: 'transparent',
    border: 'none',
    outline: 'none',
    fontFamily: 'body',
    fontSize: 'md',
    color: 'foreground',
    _placeholder: { color: 'foreground.muted' },
});
const list = css({
    position: 'absolute',
    zIndex: '20',
    left: '0',
    right: '0',
    top: 'calc(100% + 6px)',
    m: '0',
    p: '1',
    listStyle: 'none',
    bg: 'surface.elevated',
    border: '1px solid',
    borderColor: 'border',
    borderRadius: 'xl',
    boxShadow: 'shadow.medium',
});
const option = css({
    display: 'flex',
    alignItems: 'center',
    gap: '2',
    px: '3',
    py: '2.5',
    borderRadius: 'lg',
    cursor: 'pointer',
    fontFamily: 'body',
    fontSize: 'sm',
    color: 'foreground',
});
const optionActive = css({ bg: 'accent.soft' });
const optionHint = css({ color: 'foreground.muted', fontSize: 'xs', ml: 'auto' });

/**
 * "Was brauchst du?": catalogue ingredients as you type, otherwise the text is
 * added as a free-text item (household items such as Spülmittel).
 */
export function QuickAdd({
    onAdd,
    disabled,
}: {
    onAdd: (entry: QuickAddEntry) => Promise<boolean> | boolean;
    disabled?: boolean;
}) {
    const [text, setText] = useState('');
    const [hits, setHits] = useState<Hit[]>([]);
    const [parsed, setParsed] = useState<{ amount: string | null; unit: string | null }>({
        amount: null,
        unit: null,
    });
    const [active, setActive] = useState(0);
    const [open, setOpen] = useState(false);
    const [error, setError] = useState('');
    const requestId = useRef(0);
    const listId = useId();
    const trimmed = text.trim();

    useEffect(() => {
        if (trimmed.length < 2) return;
        const current = ++requestId.current;
        const timer = setTimeout(async () => {
            const result = await searchShoppingIngredients(trimmed);
            if (current !== requestId.current) return;
            if (result.ok) {
                setHits(result.data.results);
                setParsed({ amount: result.data.amount, unit: result.data.unit });
                setActive(0);
            }
        }, 200);
        return () => clearTimeout(timer);
    }, [trimmed]);

    const shownHits = trimmed.length < 2 ? [] : hits;
    // The last option adds exactly what was typed
    const optionCount = shownHits.length + (trimmed ? 1 : 0);

    const submit = async (index: number) => {
        if (!trimmed) return;
        const hit = shownHits[index];
        const entry: QuickAddEntry = hit
            ? { name: hit.name, ingredientId: hit.id, amount: parsed.amount, unit: parsed.unit }
            : { name: trimmed, ingredientId: null, amount: null, unit: null };
        setError('');
        const ok = await onAdd(entry);
        if (ok) {
            setText('');
            setHits([]);
            setOpen(false);
        } else {
            setError('Das hat nicht geklappt. Bitte versuche es erneut.');
        }
    };

    return (
        <div className={form}>
            <div className={inputRow}>
                <Plus size={18} aria-hidden="true" />
                <input
                    type="text"
                    role="combobox"
                    aria-expanded={open && optionCount > 0}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-activedescendant={
                        open && optionCount > 0 ? `${listId}-${active}` : undefined
                    }
                    aria-label="Artikel hinzufügen"
                    placeholder="Was brauchst du? Zutat oder Freitext"
                    autoComplete="off"
                    maxLength={200}
                    disabled={disabled}
                    className={input}
                    value={text}
                    onChange={(event) => {
                        setText(event.target.value);
                        setOpen(true);
                        setError('');
                    }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 120)}
                    onKeyDown={(event) => {
                        if (event.key === 'ArrowDown') {
                            event.preventDefault();
                            setOpen(true);
                            setActive((i) => Math.min(i + 1, optionCount - 1));
                        } else if (event.key === 'ArrowUp') {
                            event.preventDefault();
                            setActive((i) => Math.max(i - 1, 0));
                        } else if (event.key === 'Enter') {
                            event.preventDefault();
                            void submit(Math.min(active, optionCount - 1));
                        } else if (event.key === 'Escape') {
                            setOpen(false);
                        }
                    }}
                />
            </div>
            {error && (
                <p role="alert" className={css({ color: 'error.text', fontSize: 'sm', mt: '1' })}>
                    {error}
                </p>
            )}
            {open && optionCount > 0 && (
                <ul id={listId} role="listbox" className={list}>
                    {shownHits.map((hit, index) => (
                        <li
                            key={hit.id}
                            id={`${listId}-${index}`}
                            role="option"
                            aria-selected={index === active}
                            className={cx(option, index === active && optionActive)}
                            onMouseDown={(event) => {
                                event.preventDefault();
                                void submit(index);
                            }}
                            onMouseEnter={() => setActive(index)}
                        >
                            {hit.name}
                            {parsed.amount && index === 0 && (
                                <span className={optionHint}>
                                    {[parsed.amount, parsed.unit].filter(Boolean).join(' ')}
                                </span>
                            )}
                        </li>
                    ))}
                    <li
                        id={`${listId}-${shownHits.length}`}
                        role="option"
                        aria-selected={active === shownHits.length}
                        className={cx(option, active === shownHits.length && optionActive)}
                        onMouseDown={(event) => {
                            event.preventDefault();
                            void submit(shownHits.length);
                        }}
                        onMouseEnter={() => setActive(shownHits.length)}
                    >
                        „{trimmed}“ als Freitext hinzufügen
                    </li>
                </ul>
            )}
        </div>
    );
}
