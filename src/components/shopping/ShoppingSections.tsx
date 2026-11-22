'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import type { ShoppingItemView } from '@app/lib/shopping/list-view';
import type { ShoppingPageData } from '@app/lib/shopping/page-data';

import { css } from 'styled-system/css';

import { ShoppingTile } from './ShoppingTile';

const section = css({ mb: '8' });
const sectionHead = css({
    display: 'flex',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    columnGap: '3',
    rowGap: '1',
    mb: '3',
});
const sectionTitle = css({ fontFamily: 'heading', fontSize: 'xl', fontWeight: '700', m: '0' });
const hint = css({ color: 'foreground.muted', fontSize: 'sm', fontFamily: 'body' });
const tiles = css({
    display: 'grid',
    gridTemplateColumns: {
        base: 'repeat(auto-fill, minmax(100px, 1fr))',
        md: 'repeat(auto-fill, minmax(112px, 1fr))',
    },
    gap: '3',
    m: '0',
    p: '0',
    listStyle: 'none',
});
const empty = css({
    p: '8',
    textAlign: 'center',
    color: 'foreground.muted',
    fontFamily: 'body',
    bg: 'surface',
    border: '1px dashed',
    borderColor: 'border',
    borderRadius: '2xl',
});
const emptyLink = css({ color: 'primary', fontWeight: '600' });
const foldButton = css({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2',
    bg: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'foreground',
    fontFamily: 'heading',
    fontSize: 'xl',
    fontWeight: '700',
    whiteSpace: 'nowrap',
    p: '0',
    _focusVisible: { outline: '2px solid', outlineColor: 'primary', outlineOffset: '3px' },
});

/** A list section: title (or own head element) with hint, then its tiles. */
function TileSection({
    id,
    title,
    hintText,
    children,
}: {
    id: string;
    /** Heading text, or an element carrying `id` itself (the fold button) */
    title: ReactNode;
    hintText: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className={section} aria-labelledby={id}>
            <div className={sectionHead}>
                {typeof title === 'string' ? (
                    <h2 id={id} className={sectionTitle}>
                        {title}
                    </h2>
                ) : (
                    title
                )}
                <span className={hint}>{hintText}</span>
            </div>
            {children}
        </section>
    );
}

/** "Offen": items still to buy; a tap marks one bought, a long press opens details. */
export function OpenSection({
    items,
    onBought,
    onDetails,
}: {
    items: ShoppingItemView[];
    onBought: (item: ShoppingItemView) => void;
    onDetails: (item: ShoppingItemView) => void;
}) {
    return (
        <TileSection
            id="shopping-open"
            title="Offen"
            hintText="Antippen = gekauft · lange drücken = Details"
        >
            {items.length === 0 ? (
                <p className={empty}>
                    Nichts mehr zu besorgen. Füge oben etwas hinzu oder setze Zutaten aus einem{' '}
                    <Link href="/recipes" className={emptyLink}>
                        Rezept
                    </Link>{' '}
                    auf die Liste.
                </p>
            ) : (
                <ul className={tiles} role="list">
                    {items.map((item) => (
                        <ShoppingTile
                            key={item.id}
                            variant="open"
                            item={item}
                            onActivate={() => onBought(item)}
                            onDetails={() => onDetails(item)}
                        />
                    ))}
                </ul>
            )}
        </TileSection>
    );
}

type Suggestion = ShoppingPageData['suggestions'][number];

/** "Vorschläge" from the shopping rhythm: a tap adds one, "×" snoozes it. */
export function SuggestionSection({
    suggestions,
    onAdd,
    onDismiss,
}: {
    suggestions: Suggestion[];
    onAdd: (suggestion: Suggestion) => void;
    onDismiss: (suggestion: Suggestion) => void;
}) {
    return (
        <TileSection
            id="shopping-suggestions"
            title="Vorschläge"
            hintText="aus deinem Einkaufsverlauf"
        >
            <ul className={tiles} role="list">
                {suggestions.map((suggestion) => (
                    <ShoppingTile
                        key={suggestion.itemKey}
                        variant="suggestion"
                        name={suggestion.name}
                        icon={suggestion.icon}
                        quantityText={suggestion.reason}
                        onActivate={() => onAdd(suggestion)}
                        onDismiss={() => onDismiss(suggestion)}
                    />
                ))}
            </ul>
        </TileSection>
    );
}

/** "Zuletzt gekauft", foldable; a tap puts an item back on the list. */
export function BoughtSection({
    items,
    total,
    open,
    onToggle,
    now,
    onBack,
}: {
    items: ShoppingItemView[];
    total: number;
    open: boolean;
    onToggle: () => void;
    now: Date;
    onBack: (item: ShoppingItemView) => void;
}) {
    const Icon = open ? ChevronDown : ChevronRight;
    return (
        <TileSection
            id="shopping-bought"
            title={
                <button
                    type="button"
                    id="shopping-bought"
                    className={foldButton}
                    aria-expanded={open}
                    onClick={onToggle}
                >
                    <Icon size={20} aria-hidden="true" />
                    Zuletzt gekauft
                </button>
            }
            hintText={`${total} · antippen holt zurück`}
        >
            {open && (
                <ul className={tiles} role="list">
                    {items.map((item) => (
                        <ShoppingTile
                            key={item.id}
                            variant="done"
                            item={item}
                            now={now}
                            onActivate={() => onBack(item)}
                        />
                    ))}
                </ul>
            )}
        </TileSection>
    );
}
