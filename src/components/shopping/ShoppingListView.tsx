'use client';

import { useState } from 'react';

import {
    addManualShoppingItem,
    snoozeShoppingSuggestionTile,
    updateShoppingListItem,
} from '@app/app/shopping-list/actions';
import { groupItems } from '@app/lib/shopping/list-view';
import type { ShoppingPageData } from '@app/lib/shopping/page-data';

import { css } from 'styled-system/css';

import { BringSyncPill } from './BringSyncPill';
import { ItemDetail } from './ItemDetail';
import { QuickAdd } from './QuickAdd';
import { ShoppingPlanWidget } from './ShoppingPlanWidget';
import { BoughtSection, OpenSection, SuggestionSection } from './ShoppingSections';
import { UndoToast } from './UndoToast';
import { useShoppingList } from './useShoppingList';

const layout = css({
    display: 'grid',
    gridTemplateColumns: { base: '1fr', lg: 'minmax(0, 1fr) 360px' },
    gap: { base: '5', lg: '8' },
    alignItems: 'start',
});
const main = css({ minW: 0 });
const stripOnly = css({ display: { base: 'block', lg: 'none' } });
const stripSpace = css({ mb: '4' });
const columnOnly = css({
    display: { base: 'none', lg: 'block' },
    position: 'sticky',
    top: '5',
});
const toolbar = css({
    display: 'flex',
    gap: '3',
    alignItems: 'flex-start',
    mb: '6',
    flexWrap: 'wrap',
});
const pushRight = css({ ml: 'auto' });
const errorBox = css({
    p: '3',
    mb: '4',
    borderRadius: 'lg',
    bg: 'error.bg',
    color: 'error.text',
    fontFamily: 'body',
    fontSize: 'sm',
});

/**
 * The own shopping list (KUC-105): open items as tiles (tap = bought), rhythm
 * suggestions, recently bought, quick add, and the plan column.
 */
export function ShoppingListView({ initial }: { initial: ShoppingPageData }) {
    const list = useShoppingList(initial);
    const { data, write, refresh } = list;
    const [showBought, setShowBought] = useState(true);
    const now = new Date();
    const grouped = groupItems(data.items);
    const detail = data.items.find((item) => item.id === list.detailId) ?? null;

    return (
        <div className={layout}>
            <div className={main}>
                <div className={stripOnly}>
                    <div className={stripSpace}>
                        <ShoppingPlanWidget
                            plan={data.plan}
                            variant="strip"
                            onAdded={() => void refresh()}
                        />
                    </div>
                </div>

                <div className={toolbar}>
                    <QuickAdd onAdd={list.addEntry} />
                    <div className={pushRight}>
                        <BringSyncPill
                            state={data.bringSync}
                            onChange={(bringSync) =>
                                list.setData((current) => ({ ...current, bringSync }))
                            }
                            onSynced={() => void refresh()}
                        />
                    </div>
                </div>

                {list.error && (
                    <p role="alert" className={errorBox}>
                        {list.error}
                    </p>
                )}

                <OpenSection
                    items={grouped.open}
                    onBought={(item) => void list.setBought(item, true)}
                    onDetails={(item) => list.setDetailId(item.id)}
                />
                {data.suggestions.length > 0 && (
                    <SuggestionSection
                        suggestions={data.suggestions}
                        onAdd={(suggestion) =>
                            void write(() =>
                                addManualShoppingItem({
                                    name: suggestion.name,
                                    ingredientId: suggestion.ingredientId ?? null,
                                    kind: 'SUGGESTION',
                                }),
                            )
                        }
                        onDismiss={(suggestion) =>
                            void write(() => snoozeShoppingSuggestionTile(suggestion.itemKey))
                        }
                    />
                )}
                {grouped.boughtTotal > 0 && (
                    <BoughtSection
                        items={grouped.bought}
                        total={grouped.boughtTotal}
                        open={showBought}
                        onToggle={() => setShowBought((value) => !value)}
                        now={now}
                        onBack={(item) => void list.setBought(item, false)}
                    />
                )}
            </div>

            <div className={columnOnly}>
                <ShoppingPlanWidget
                    plan={data.plan}
                    variant="column"
                    onAdded={() => void refresh()}
                />
            </div>

            <ItemDetail
                item={detail}
                onClose={() => list.setDetailId(null)}
                onQuantity={list.changeQuantity}
                onNote={(item, note) =>
                    void write(() => updateShoppingListItem(item.id, { note: note || null }))
                }
                onToggleBought={(item) => {
                    list.setDetailId(null);
                    void list.setBought(item, item.status === 'OPEN');
                }}
                onRemove={(item) => void list.remove(item)}
            />
            <UndoToast toast={list.toast} onClose={() => list.setToast(null)} />
        </div>
    );
}
