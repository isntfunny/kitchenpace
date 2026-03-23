'use client';

import { type ColumnDef, flexRender, type useReactTable } from '@tanstack/react-table';
import { ArrowUpDown, Plus, Search, Trash2, X } from 'lucide-react';
import { useTransition } from 'react';

import { css } from 'styled-system/css';

import { btnPrimary, thStyle } from './ingredient-types';

// ---------------------------------------------------------------------------
// SortHeader
// ---------------------------------------------------------------------------

export function SortHeader({
    column,
    label,
}: {
    column: { toggleSorting: () => void };
    label: string;
}) {
    return (
        <button
            type="button"
            onClick={() => column.toggleSorting()}
            className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '1',
                bg: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: 'xs',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'foreground.muted',
                _hover: { color: 'foreground' },
                transition: 'color 0.15s',
            })}
        >
            {label} <ArrowUpDown size={12} />
        </button>
    );
}

// ---------------------------------------------------------------------------
// TableToolbar
// ---------------------------------------------------------------------------

export function TableToolbar({
    searchPlaceholder,
    filter,
    onFilterChange,
    onAdd,
}: {
    searchPlaceholder: string;
    filter: string;
    onFilterChange: (v: string) => void;
    onAdd: () => void;
}) {
    return (
        <div
            className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '2',
                padding: '4',
                borderBottom: '1px solid',
                borderColor: 'border.muted',
            })}
        >
            <div
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    flex: '1',
                    gap: '2',
                    borderRadius: 'lg',
                    borderWidth: '1px',
                    borderColor: 'border.muted',
                    bg: 'surface.elevated',
                    paddingX: '3',
                    paddingY: '2',
                    transition: 'all 0.15s',
                    _focusWithin: {
                        borderColor: 'brand.primary',
                        boxShadow: {
                            base: '0 0 0 3px rgba(224,123,83,0.12)',
                            _dark: '0 0 0 3px rgba(224,123,83,0.2)',
                        },
                    },
                })}
            >
                <Search size={15} className={css({ color: 'foreground.muted', flexShrink: '0' })} />
                <input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={filter}
                    onChange={(e) => onFilterChange(e.target.value)}
                    className={css({
                        flex: '1',
                        bg: 'transparent',
                        border: 'none',
                        outline: 'none',
                        fontSize: 'sm',
                        color: 'foreground',
                    })}
                />
                {filter && (
                    <button
                        type="button"
                        onClick={() => onFilterChange('')}
                        className={css({
                            bg: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'foreground.muted',
                            display: 'flex',
                            padding: '0.5',
                            borderRadius: 'md',
                            _hover: { color: 'foreground', bg: 'surface.muted' },
                        })}
                    >
                        <X size={14} />
                    </button>
                )}
            </div>
            <button type="button" onClick={onAdd} className={btnPrimary} title="Hinzufuegen">
                <Plus size={14} />
            </button>
        </div>
    );
}

// ---------------------------------------------------------------------------
// SimpleTable
// ---------------------------------------------------------------------------

export function SimpleTable<T>({
    table,
    columns,
    onRowClick,
    emptyMessage,
}: {
    table: ReturnType<typeof useReactTable<T>>;
    columns: ColumnDef<T>[];
    onRowClick: (row: T) => void;
    emptyMessage: string;
}) {
    return (
        <div className={css({ overflowX: 'auto' })}>
            <table className={css({ width: '100%', borderCollapse: 'collapse' })}>
                <thead>
                    {table.getHeaderGroups().map((hg) => (
                        <tr
                            key={hg.id}
                            className={css({
                                borderBottom: '1px solid',
                                borderColor: 'border.muted',
                            })}
                        >
                            {hg.headers.map((header) => (
                                <th key={header.id} className={thStyle}>
                                    {header.isPlaceholder
                                        ? null
                                        : flexRender(
                                              header.column.columnDef.header,
                                              header.getContext(),
                                          )}
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody>
                    {table.getRowModel().rows.map((row, idx) => (
                        <tr
                            key={row.id}
                            onClick={() => onRowClick(row.original)}
                            className={css({
                                borderBottom: '1px solid',
                                borderColor: 'border.muted',
                                cursor: 'pointer',
                                transition: 'background 0.1s ease',
                                bg: idx % 2 === 1 ? 'surface.muted' : 'transparent',
                                _hover: {
                                    bg: {
                                        base: 'rgba(224,123,83,0.06)',
                                        _dark: 'rgba(224,123,83,0.08)',
                                    },
                                },
                            })}
                        >
                            {row.getVisibleCells().map((cell) => (
                                <td
                                    key={cell.id}
                                    className={css({
                                        padding: '3',
                                        paddingX: '4',
                                        verticalAlign: 'middle',
                                    })}
                                >
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </td>
                            ))}
                        </tr>
                    ))}
                    {table.getRowModel().rows.length === 0 && (
                        <tr>
                            <td
                                colSpan={columns.length}
                                className={css({
                                    padding: '12',
                                    textAlign: 'center',
                                    color: 'foreground.muted',
                                    fontSize: 'sm',
                                })}
                            >
                                {emptyMessage}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

// ---------------------------------------------------------------------------
// DeleteButton
// ---------------------------------------------------------------------------

export function DeleteButton({
    onDelete,
    disabled,
    title,
}: {
    onDelete: () => Promise<void>;
    disabled?: boolean;
    title?: string;
}) {
    const [isPending, startTransition] = useTransition();

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (disabled) return;
        if (!confirm('Wirklich loeschen?')) return;
        startTransition(async () => {
            await onDelete();
        });
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={disabled || isPending}
            title={title}
            className={css({
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '8',
                height: '8',
                borderRadius: 'lg',
                border: 'none',
                bg: 'transparent',
                cursor: disabled ? 'not-allowed' : 'pointer',
                color: disabled ? 'foreground.muted' : 'foreground.muted',
                opacity: disabled ? '0.3' : '1',
                transition: 'all 0.15s',
                _hover: disabled
                    ? {}
                    : {
                          bg: 'error.bg',
                          color: 'status.danger',
                      },
            })}
        >
            <Trash2 size={14} />
        </button>
    );
}
