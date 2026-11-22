'use client';

import { Minus, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Button, IconButton } from '@app/components/atoms/Button';
import { input } from '@app/components/atoms/recipes';
import { IngredientIcon } from '@app/components/ingredients/IngredientIcon';
import { Sheet } from '@app/components/ui/Sheet';
import {
    itemQuantityLabel,
    originBadges,
    packHint,
    sourceQuantityLabel,
    stepQuantity,
    type QuantityChange,
    type ShoppingItemView,
} from '@app/lib/shopping/list-view';
import { weekdayShort } from '@shared/dates';

import { css, cx } from 'styled-system/css';

const row = css({
    display: 'flex',
    alignItems: 'flex-start',
    gap: '3',
    py: '3',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderColor: 'border.muted',
});
const rowLabel = css({
    w: '20',
    flexShrink: 0,
    color: 'foreground.muted',
    fontSize: 'sm',
    pt: '1',
});
const stepper = css({ display: 'inline-flex', alignItems: 'center', gap: '3' });
const qty = css({ minW: '20', textAlign: 'center', fontWeight: '700', fontSize: 'lg' });
const originList = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5',
    m: '0',
    p: '0',
    listStyle: 'none',
    flex: '1',
});
const dayTag = css({
    display: 'inline-block',
    fontSize: 'xs',
    fontWeight: '700',
    bg: 'accent.soft',
    color: 'primary',
    borderRadius: 'md',
    px: '1.5',
    py: '0.5',
    mr: '2',
});
const note = css({ flex: '1', minH: '16', py: '2', resize: 'vertical' });
const actions = css({ display: 'flex', gap: '2', mt: '4', flexWrap: 'wrap' });

/**
 * Details of one tile: amount stepper, where it comes from, note, remove.
 * Bottom sheet on phones, side panel on desktop.
 */
export function ItemDetail({
    item,
    onClose,
    onQuantity,
    onNote,
    onToggleBought,
    onRemove,
}: {
    item: ShoppingItemView | null;
    onClose: () => void;
    onQuantity: (item: ShoppingItemView, change: QuantityChange) => void;
    onNote: (item: ShoppingItemView, note: string) => void;
    onToggleBought: (item: ShoppingItemView) => void;
    onRemove: (item: ShoppingItemView) => void;
}) {
    const up = item ? stepQuantity(item, 1) : null;
    const down = item ? stepQuantity(item, -1) : null;
    const pack = item ? packHint(item) : null;
    const bought = item?.status !== 'OPEN';

    return (
        <Sheet
            open={!!item}
            onOpenChange={(open) => !open && onClose()}
            placement="side"
            size="sm"
            title={
                item && (
                    <span className={css({ display: 'flex', alignItems: 'center', gap: '3' })}>
                        <span className={css({ display: 'inline-flex', color: 'primary' })}>
                            <IngredientIcon icon={item.icon} size={36} />
                        </span>
                        {item.name}
                    </span>
                )
            }
        >
            {item && (
                <>
                    <div
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3',
                            pb: '3',
                        })}
                    >
                        <span className={rowLabel}>Menge</span>
                        <span className={stepper}>
                            <IconButton
                                aria-label="Weniger"
                                disabled={!down}
                                onClick={() => down && onQuantity(item, down)}
                            >
                                <Minus size={18} aria-hidden="true" />
                            </IconButton>
                            <span className={qty} aria-live="polite">
                                {itemQuantityLabel(item) || '–'}
                            </span>
                            <IconButton
                                aria-label="Mehr"
                                disabled={!up}
                                onClick={() => up && onQuantity(item, up)}
                            >
                                <Plus size={18} aria-hidden="true" />
                            </IconButton>
                        </span>
                    </div>

                    {item.sources.length > 0 && (
                        <div className={row}>
                            <span className={rowLabel}>Für</span>
                            <ul className={originList}>
                                {item.sources.map((source) => {
                                    const [badge] = originBadges([source]);
                                    const share = sourceQuantityLabel(source);
                                    return (
                                        <li key={source.id} className={css({ fontSize: 'sm' })}>
                                            {source.date && (
                                                <span className={dayTag}>
                                                    {weekdayShort(source.date)}
                                                </span>
                                            )}
                                            {source.recipeTitle ??
                                                badge?.title ??
                                                'Manuell hinzugefügt'}
                                            {share && ` · ${share}`}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}

                    {pack && (
                        <div className={row}>
                            <span className={rowLabel}>Packung</span>
                            <span className={css({ fontSize: 'sm' })}>{pack}</span>
                        </div>
                    )}

                    <NoteField key={item.id} item={item} onNote={onNote} />

                    <div className={actions}>
                        <Button
                            type="button"
                            variant="primary"
                            className={css({ flex: '1' })}
                            onClick={() => onToggleBought(item)}
                        >
                            {bought ? 'Zurück auf die Liste' : '✓ Gekauft'}
                        </Button>
                        <Button type="button" variant="danger" onClick={() => onRemove(item)}>
                            <Trash2 size={16} aria-hidden="true" />
                            Entfernen
                        </Button>
                    </div>
                </>
            )}
        </Sheet>
    );
}

/** Remounts per item (key), so the text always starts from the stored note. */
function NoteField({
    item,
    onNote,
}: {
    item: ShoppingItemView;
    onNote: (item: ShoppingItemView, note: string) => void;
}) {
    const [text, setText] = useState(item.note ?? '');
    return (
        <div className={row}>
            <label className={rowLabel} htmlFor="shopping-item-note">
                Notiz
            </label>
            <textarea
                id="shopping-item-note"
                className={cx(input, note)}
                value={text}
                maxLength={500}
                placeholder="z. B. 30 % Fett"
                onChange={(event) => setText(event.target.value)}
                onBlur={() => {
                    if (text.trim() !== (item.note ?? '')) onNote(item, text.trim());
                }}
            />
        </div>
    );
}
