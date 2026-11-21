'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';

import {
    addManualShoppingItem,
    deleteShoppingListItem,
    getShoppingPageData,
    setShoppingItemChecked,
    snoozeShoppingSuggestionTile,
    updateShoppingListItem,
} from '@app/app/shopping-list/actions';
import { ingredientIdFromKey } from '@app/lib/shopping/item-key';
import {
    groupItems,
    type QuantityChange,
    type ShoppingItemView,
} from '@app/lib/shopping/list-view';
import type { ShoppingPageData } from '@app/lib/shopping/page-data';
import { BASE_UNIT_LABEL } from '@app/lib/shopping/quantity';

import { css, cx } from 'styled-system/css';

import { ItemDetail } from './ItemDetail';
import { QuickAdd, type QuickAddEntry } from './QuickAdd';
import { ShoppingPlanWidget } from './ShoppingPlanWidget';
import { ShoppingTile } from './ShoppingTile';
import { UndoToast, type UndoToastState } from './UndoToast';

const layout = css({
    display: 'grid',
    gridTemplateColumns: { base: '1fr', lg: 'minmax(0, 1fr) 360px' },
    gap: { base: '5', lg: '8' },
    alignItems: 'start',
});
const stripOnly = css({ display: { base: 'block', lg: 'none' } });
const columnOnly = css({
    display: { base: 'none', lg: 'block' },
    position: 'sticky',
    top: '5',
});
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
const toolbar = css({
    display: 'flex',
    gap: '3',
    alignItems: 'flex-start',
    mb: '6',
    flexWrap: 'wrap',
});
const errorBox = css({
    p: '3',
    mb: '4',
    borderRadius: 'lg',
    bg: 'error.bg',
    color: 'error.text',
    fontFamily: 'body',
    fontSize: 'sm',
});

/** Fallback to the open list when an item is gone from the server state. */
const withItem = (
    data: ShoppingPageData,
    id: string,
    patch: Partial<ShoppingItemView>,
): ShoppingPageData => ({
    ...data,
    items: data.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
});

/**
 * The own shopping list (KUC-105): open items as tiles (tap = bought), rhythm
 * suggestions, recently bought, quick add, and the plan column.
 */
export function ShoppingListView({ initial }: { initial: ShoppingPageData }) {
    const [data, setData] = useState(initial);
    const [detailId, setDetailId] = useState<string | null>(null);
    const [toast, setToast] = useState<UndoToastState | null>(null);
    const [error, setError] = useState('');
    const [showBought, setShowBought] = useState(true);
    const toastId = useRef(0);
    const now = new Date();

    const grouped = groupItems(data.items);
    const detail = data.items.find((item) => item.id === detailId) ?? null;

    const notify = useCallback((message: string, onUndo?: () => void) => {
        toastId.current += 1;
        setToast({ id: toastId.current, message, onUndo });
    }, []);

    const refresh = useCallback(async () => {
        const result = await getShoppingPageData();
        if (result.ok) setData(result.data as unknown as ShoppingPageData);
        else setError(result.error);
    }, []);

    /** Runs a write; on failure shows the error and restores the server state. */
    const write = useCallback(
        async (work: () => Promise<{ ok: boolean; error?: string }>) => {
            setError('');
            const result = await work();
            if (!result.ok) setError(result.error ?? 'Das hat nicht geklappt.');
            await refresh();
            return result.ok;
        },
        [refresh],
    );

    const setBought = useCallback(
        async (item: ShoppingItemView, bought: boolean) => {
            setData((current) =>
                withItem(current, item.id, {
                    status: bought ? 'PURCHASED' : 'OPEN',
                    statusChangedAt: new Date().toISOString(),
                }),
            );
            const ok = await write(() => setShoppingItemChecked(item.id, bought));
            if (ok && bought) {
                notify(
                    `${item.name} gekauft`,
                    () => void write(() => setShoppingItemChecked(item.id, false)),
                );
            }
        },
        [notify, write],
    );

    const remove = useCallback(
        async (item: ShoppingItemView) => {
            setDetailId(null);
            setData((current) => ({
                ...current,
                items: current.items.filter((i) => i.id !== item.id),
            }));
            const ok = await write(() => deleteShoppingListItem(item.id));
            if (!ok) return;
            notify(
                `${item.name} entfernt`,
                () =>
                    void write(() =>
                        addManualShoppingItem({
                            name: item.name,
                            ingredientId: ingredientIdFromKey(item.itemKey),
                            amount: item.quantity !== null ? String(item.quantity) : null,
                            unit: item.baseUnit ? BASE_UNIT_LABEL[item.baseUnit] : null,
                        }),
                    ),
            );
        },
        [notify, write],
    );

    const changeQuantity = useCallback(
        (item: ShoppingItemView, change: QuantityChange) => {
            setData((current) =>
                withItem(current, item.id, { ...change, quantityText: item.quantityText }),
            );
            void write(() => updateShoppingListItem(item.id, { ...change }));
        },
        [write],
    );

    const addEntry = useCallback(
        async (entry: QuickAddEntry) => {
            const ok = await write(() => addManualShoppingItem(entry));
            if (ok) notify(`${entry.name} steht auf der Liste`);
            return ok;
        },
        [notify, write],
    );

    return (
        <div className={layout}>
            <div className={css({ minW: 0 })}>
                <div className={stripOnly}>
                    <div className={css({ mb: '4' })}>
                        <ShoppingPlanWidget
                            plan={data.plan}
                            variant="strip"
                            onAdded={() => void refresh()}
                        />
                    </div>
                </div>

                <div className={toolbar}>
                    <QuickAdd onAdd={addEntry} />
                </div>

                {error && (
                    <p role="alert" className={errorBox}>
                        {error}
                    </p>
                )}

                <section className={section} aria-labelledby="shopping-open">
                    <div className={sectionHead}>
                        <h2 id="shopping-open" className={sectionTitle}>
                            Offen
                        </h2>
                        <span className={hint}>Antippen = gekauft · lange drücken = Details</span>
                    </div>
                    {grouped.open.length === 0 ? (
                        <p className={empty}>
                            Nichts mehr zu besorgen. Füge oben etwas hinzu oder setze Zutaten aus
                            einem{' '}
                            <Link
                                href="/recipes"
                                className={css({ color: 'primary', fontWeight: '600' })}
                            >
                                Rezept
                            </Link>{' '}
                            auf die Liste.
                        </p>
                    ) : (
                        <ul className={tiles} role="list">
                            {grouped.open.map((item) => (
                                <ShoppingTile
                                    key={item.id}
                                    variant="open"
                                    item={item}
                                    onActivate={() => void setBought(item, true)}
                                    onDetails={() => setDetailId(item.id)}
                                />
                            ))}
                        </ul>
                    )}
                </section>

                {data.suggestions.length > 0 && (
                    <section className={section} aria-labelledby="shopping-suggestions">
                        <div className={sectionHead}>
                            <h2 id="shopping-suggestions" className={sectionTitle}>
                                Vorschläge
                            </h2>
                            <span className={hint}>aus deinem Einkaufsverlauf</span>
                        </div>
                        <ul className={tiles} role="list">
                            {data.suggestions.map((suggestion) => (
                                <ShoppingTile
                                    key={suggestion.itemKey}
                                    variant="suggestion"
                                    name={suggestion.name}
                                    icon={suggestion.icon}
                                    quantityText={suggestion.reason}
                                    onActivate={() =>
                                        void write(() =>
                                            addManualShoppingItem({
                                                name: suggestion.name,
                                                ingredientId: suggestion.ingredientId ?? null,
                                                kind: 'SUGGESTION',
                                            }),
                                        )
                                    }
                                    onDismiss={() =>
                                        void write(() =>
                                            snoozeShoppingSuggestionTile(suggestion.itemKey),
                                        )
                                    }
                                />
                            ))}
                        </ul>
                    </section>
                )}

                {grouped.boughtTotal > 0 && (
                    <section className={section} aria-labelledby="shopping-bought">
                        <div className={sectionHead}>
                            <button
                                type="button"
                                id="shopping-bought"
                                className={foldButton}
                                aria-expanded={showBought}
                                onClick={() => setShowBought((value) => !value)}
                            >
                                {showBought ? (
                                    <ChevronDown size={20} aria-hidden="true" />
                                ) : (
                                    <ChevronRight size={20} aria-hidden="true" />
                                )}
                                Zuletzt gekauft
                            </button>
                            <span className={hint}>
                                {grouped.boughtTotal} · antippen holt zurück
                            </span>
                        </div>
                        {showBought && (
                            <ul className={tiles} role="list">
                                {grouped.bought.map((item) => (
                                    <ShoppingTile
                                        key={item.id}
                                        variant="done"
                                        item={item}
                                        now={now}
                                        onActivate={() => void setBought(item, false)}
                                    />
                                ))}
                            </ul>
                        )}
                    </section>
                )}
            </div>

            <div className={cx(columnOnly)}>
                <ShoppingPlanWidget
                    plan={data.plan}
                    variant="column"
                    onAdded={() => void refresh()}
                />
            </div>

            <ItemDetail
                item={detail}
                onClose={() => setDetailId(null)}
                onQuantity={changeQuantity}
                onNote={(item, note) =>
                    void write(() => updateShoppingListItem(item.id, { note: note || null }))
                }
                onToggleBought={(item) => {
                    setDetailId(null);
                    void setBought(item, item.status === 'OPEN');
                }}
                onRemove={(item) => void remove(item)}
            />
            <UndoToast toast={toast} onClose={() => setToast(null)} />
        </div>
    );
}
