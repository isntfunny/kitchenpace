'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
    addManualShoppingItem,
    deleteShoppingListItem,
    getShoppingPageData,
    setShoppingItemChecked,
    updateShoppingListItem,
} from '@app/app/shopping-list/actions';
import type { QuantityChange, ShoppingItemView } from '@app/lib/shopping/list-view';
import type { ShoppingPageData } from '@app/lib/shopping/page-data';
import { BASE_UNIT_LABEL } from '@app/lib/shopping/quantity';
import { ingredientIdFromKey } from '@shared/shopping/item-key';

import type { QuickAddEntry } from './QuickAdd';
import type { UndoToastState } from './UndoToast';

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
 * State and writes of the shopping list page: optimistic changes, undo toast, error,
 * and reloading while the Bring! sync is on.
 */
export function useShoppingList(initial: ShoppingPageData) {
    const [data, setData] = useState(initial);
    const [detailId, setDetailId] = useState<string | null>(null);
    const [toast, setToast] = useState<UndoToastState | null>(null);
    const [error, setError] = useState('');
    const toastId = useRef(0);

    const notify = useCallback((message: string, onUndo?: () => void) => {
        toastId.current += 1;
        setToast({ id: toastId.current, message, onUndo });
    }, []);

    const refresh = useCallback(async () => {
        const result = await getShoppingPageData();
        if (result.ok) setData(result.data as unknown as ShoppingPageData);
        else setError(result.error);
    }, []);

    // With the Bring! sync on, changes made there arrive while the page is open
    const syncing = data.bringSync.enabled && data.bringSync.status !== 'AUTH_FAILED';
    useEffect(() => {
        if (!syncing) return;
        const reload = () => {
            if (document.visibilityState === 'visible') void refresh();
        };
        const timer = window.setInterval(reload, 60_000);
        document.addEventListener('visibilitychange', reload);
        return () => {
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', reload);
        };
    }, [syncing, refresh]);

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

    return {
        data,
        setData,
        detailId,
        setDetailId,
        toast,
        setToast,
        error,
        refresh,
        write,
        setBought,
        remove,
        changeQuantity,
        addEntry,
    };
}
