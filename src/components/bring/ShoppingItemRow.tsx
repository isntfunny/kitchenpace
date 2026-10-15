'use client';

import { Check, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import { useState } from 'react';

import { Button } from '@app/components/atoms/Button';
import type { BringItem } from '@app/lib/bring/types';

import { css } from 'styled-system/css';

import { checkbox, field, label, row, stack } from './styles';

export function ShoppingItemRow({
    item,
    purchased,
    busy,
    onToggle,
    onRemove,
    onEdit,
}: {
    item: BringItem;
    purchased: boolean;
    busy: boolean;
    onToggle: () => void;
    onRemove: () => void;
    onEdit: (value: string, previousSpecification: string) => Promise<boolean>;
}) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(item.specification);
    const [originalSpecification, setOriginalSpecification] = useState(item.specification);
    const name = item.displayName ?? item.name;
    return (
        <li
            className={css({
                borderBottomWidth: '1px',
                borderBottomStyle: 'solid',
                borderColor: 'border',
                _last: { borderBottom: 'none' },
            })}
        >
            <div className={css({ display: 'flex', alignItems: 'center', gap: '2', py: '2' })}>
                <label
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3',
                        flex: 1,
                        minW: 0,
                        minH: '12',
                        cursor: 'pointer',
                        py: '1',
                    })}
                >
                    <input
                        type="checkbox"
                        className={checkbox}
                        checked={purchased}
                        disabled={busy}
                        onChange={onToggle}
                    />
                    <span
                        className={css({
                            minW: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5',
                            overflowWrap: 'anywhere',
                        })}
                    >
                        <span
                            className={css({
                                fontWeight: '500',
                                lineHeight: 'snug',
                                color: purchased ? 'text-muted' : 'text',
                                textDecoration: purchased ? 'line-through' : 'none',
                            })}
                        >
                            {name}
                        </span>
                        {item.specification && (
                            <span
                                className={css({
                                    fontSize: 'sm',
                                    lineHeight: 'snug',
                                    color: 'text-muted',
                                })}
                            >
                                {' '}
                                {item.specification}
                            </span>
                        )}
                    </span>
                </label>
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            aria-label={`Aktionen für ${name}`}
                            style={{ width: 44, height: 44, padding: 10, flexShrink: 0 }}
                        >
                            <MoreHorizontal size={20} aria-hidden />
                        </Button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                        <DropdownMenu.Content
                            align="end"
                            sideOffset={4}
                            onCloseAutoFocus={(event) => {
                                if (editing) event.preventDefault();
                            }}
                            className={css({
                                zIndex: 100,
                                minW: '200px',
                                maxW: 'calc(100vw - 24px)',
                                p: '1',
                                bg: 'surface',
                                color: 'text',
                                border: '1px solid',
                                borderColor: 'border',
                                borderRadius: 'xl',
                                boxShadow: 'shadow.medium',
                                fontFamily: 'body',
                            })}
                        >
                            {!purchased && (
                                <DropdownMenu.Item
                                    className={menuItem}
                                    onSelect={() => {
                                        setValue(item.specification);
                                        setOriginalSpecification(item.specification);
                                        setEditing(true);
                                    }}
                                >
                                    <Pencil size={16} aria-hidden />
                                    Menge bearbeiten
                                </DropdownMenu.Item>
                            )}
                            <DropdownMenu.Item className={menuItem} onSelect={onRemove}>
                                <Trash2 size={16} aria-hidden />
                                Entfernen
                            </DropdownMenu.Item>
                        </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                </DropdownMenu.Root>
            </div>
            {editing && (
                <form
                    className={`${stack} ${css({ pb: '4', pl: '8' })}`}
                    onSubmit={async (event) => {
                        event.preventDefault();
                        if (await onEdit(value, originalSpecification)) setEditing(false);
                    }}
                >
                    <label className={label}>
                        Menge / Details für {name}
                        <input
                            className={field}
                            value={value}
                            autoFocus
                            maxLength={500}
                            disabled={busy}
                            onChange={(event) => setValue(event.target.value)}
                        />
                    </label>
                    <div className={row}>
                        <Button type="submit" size="sm" disabled={busy}>
                            <Check size={16} aria-hidden />
                            Änderung speichern
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => setEditing(false)}
                        >
                            Abbrechen
                        </Button>
                    </div>
                </form>
            )}
        </li>
    );
}

const menuItem = css({
    display: 'flex',
    alignItems: 'center',
    gap: '2',
    px: '3',
    py: '2',
    minH: '11',
    fontSize: 'sm',
    cursor: 'pointer',
    borderRadius: 'md',
    outline: 'none',
    '&[data-highlighted]': { bg: 'accent.soft', color: 'primary' },
});
