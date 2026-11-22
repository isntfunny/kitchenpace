'use client';

import { Minus, Plus, Trash2, X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useState } from 'react';

import { IngredientIcon } from '@app/components/ingredients/IngredientIcon';
import {
    itemQuantityLabel,
    originBadges,
    packHint,
    sourceQuantityLabel,
    stepQuantity,
    weekdayShort,
    type QuantityChange,
    type ShoppingItemView,
} from '@app/lib/shopping/list-view';

import { css } from 'styled-system/css';

const overlay = css({
    position: 'fixed',
    inset: '0',
    zIndex: '50',
    bg: 'rgba(0, 0, 0, 0.45)',
});
// Bottom sheet on phones, side panel from md
const content = css({
    position: 'fixed',
    zIndex: '51',
    bg: 'surface.elevated',
    color: 'foreground',
    fontFamily: 'body',
    p: '5',
    overflowY: 'auto',
    boxShadow: 'shadow.medium',
    borderTopRadius: { base: '2xl', md: 'none' },
    left: { base: '0', md: 'auto' },
    right: '0',
    bottom: { base: '0', md: 'auto' },
    top: { base: 'auto', md: '0' },
    width: { base: '100%', md: '380px' },
    maxH: { base: '85vh', md: '100vh' },
    height: { base: 'auto', md: '100vh' },
    _focusVisible: { outline: 'none' },
});
const head = css({ display: 'flex', alignItems: 'center', gap: '3', mb: '4' });
const title = css({ fontFamily: 'heading', fontSize: 'xl', fontWeight: '700', flex: '1', minW: 0 });
const iconButton = css({
    w: '10',
    h: '10',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'full',
    border: '1px solid',
    borderColor: 'border',
    bg: 'surface',
    color: 'foreground',
    cursor: 'pointer',
    _hover: { borderColor: 'primary', color: 'primary' },
    _disabled: { opacity: 0.4, cursor: 'not-allowed' },
    _focusVisible: { outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' },
});
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
const note = css({
    flex: '1',
    minH: '16',
    p: '2',
    bg: 'surface',
    color: 'foreground',
    border: '1px solid',
    borderColor: 'border',
    borderRadius: 'lg',
    fontFamily: 'body',
    fontSize: 'sm',
    resize: 'vertical',
    _focusVisible: { outline: '2px solid', outlineColor: 'primary' },
});
const actions = css({ display: 'flex', gap: '2', mt: '4', flexWrap: 'wrap' });
const primary = css({
    flex: '1',
    minH: '11',
    px: '4',
    bg: 'primary',
    color: 'white',
    border: 'none',
    borderRadius: 'lg',
    fontWeight: '600',
    fontFamily: 'body',
    cursor: 'pointer',
    _hover: { bg: 'button.primary-hover' },
});
const danger = css({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '1.5',
    minH: '11',
    px: '4',
    bg: 'transparent',
    color: 'status.danger',
    border: '1px solid',
    borderColor: 'border',
    borderRadius: 'lg',
    fontWeight: '600',
    fontFamily: 'body',
    cursor: 'pointer',
    _hover: { borderColor: 'status.danger' },
});

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
        <Dialog.Root open={!!item} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className={overlay} />
                <Dialog.Content className={content} aria-describedby={undefined}>
                    {item && (
                        <>
                            <div className={head}>
                                <span className={css({ display: 'inline-flex', color: 'primary' })}>
                                    <IngredientIcon icon={item.icon} size={36} />
                                </span>
                                <Dialog.Title className={title}>{item.name}</Dialog.Title>
                                <Dialog.Close className={iconButton} aria-label="Schließen">
                                    <X size={18} aria-hidden="true" />
                                </Dialog.Close>
                            </div>

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
                                    <button
                                        type="button"
                                        className={iconButton}
                                        aria-label="Weniger"
                                        disabled={!down}
                                        onClick={() => down && onQuantity(item, down)}
                                    >
                                        <Minus size={18} aria-hidden="true" />
                                    </button>
                                    <span className={qty} aria-live="polite">
                                        {itemQuantityLabel(item) || '–'}
                                    </span>
                                    <button
                                        type="button"
                                        className={iconButton}
                                        aria-label="Mehr"
                                        disabled={!up}
                                        onClick={() => up && onQuantity(item, up)}
                                    >
                                        <Plus size={18} aria-hidden="true" />
                                    </button>
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
                                                <li
                                                    key={source.id}
                                                    className={css({ fontSize: 'sm' })}
                                                >
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
                                <button
                                    type="button"
                                    className={primary}
                                    onClick={() => onToggleBought(item)}
                                >
                                    {bought ? 'Zurück auf die Liste' : '✓ Gekauft'}
                                </button>
                                <button
                                    type="button"
                                    className={danger}
                                    onClick={() => onRemove(item)}
                                >
                                    <Trash2 size={16} aria-hidden="true" />
                                    Entfernen
                                </button>
                            </div>
                        </>
                    )}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
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
                className={note}
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
