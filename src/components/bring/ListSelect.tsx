'use client';

import { useId } from 'react';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@app/components/features/Select';
import type { BringList } from '@app/lib/bring/types';

import { label } from './styles';

export function ListSelect({
    label: caption,
    lists,
    value,
    onValueChange,
    disabled,
    required,
}: {
    label: string;
    lists: BringList[];
    value: string;
    onValueChange: (value: string) => void;
    disabled?: boolean;
    required?: boolean;
}) {
    const id = useId();
    return (
        <div className={label}>
            <label htmlFor={id}>{caption}</label>
            <Select
                value={value}
                onValueChange={onValueChange}
                disabled={disabled}
                required={required}
            >
                <SelectTrigger id={id} style={{ width: '100%', minHeight: 44 }}>
                    <SelectValue
                        placeholder="Bitte Liste auswählen"
                        style={{ minWidth: 0, overflowWrap: 'anywhere', textAlign: 'left' }}
                    />
                </SelectTrigger>
                <SelectContent
                    position="popper"
                    sideOffset={6}
                    style={{
                        zIndex: 72,
                        maxHeight: 'var(--radix-select-content-available-height)',
                        overflowY: 'auto',
                        width: 'var(--radix-select-trigger-width)',
                        maxWidth: 'var(--radix-select-content-available-width)',
                    }}
                >
                    {lists.map((list) => (
                        <SelectItem
                            key={list.listUuid}
                            value={list.listUuid}
                            style={{
                                minHeight: 44,
                                whiteSpace: 'normal',
                                overflowWrap: 'anywhere',
                            }}
                        >
                            {list.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
