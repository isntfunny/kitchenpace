'use client';

import {
    type SortingState,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    useReactTable,
    flexRender,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { GitMerge, Plus, Search, X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useRef, useState, useMemo } from 'react';

import { css } from 'styled-system/css';

import { getIngredientColumns } from './ingredient-columns';
import {
    type Ingredient,
    type IngredientCategory,
    type Unit,
    btnPrimary,
    btnSecondary,
    dialogContentStyle,
    overlayStyle,
    thStyle,
} from './ingredient-types';
import { AddIngredientForm, IngredientEditPanel, MergeModal } from './IngredientModals';

// ===========================================================================
// INGREDIENTS TAB
// ===========================================================================

export function IngredientsTab({
    ingredients,
    allCategories,
    allUnits,
}: {
    ingredients: Ingredient[];
    allCategories: IngredientCategory[];
    allUnits: Unit[];
}) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
    const [showAdd, setShowAdd] = useState(false);
    const [showMerge, setShowMerge] = useState(false);

    const columns = useMemo(() => getIngredientColumns(), []);

    const table = useReactTable({
        data: ingredients,
        columns,
        state: { sorting, globalFilter },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        globalFilterFn: (row, _columnId, filterValue: string) => {
            const val = filterValue.toLowerCase();
            return (
                row.original.name.toLowerCase().includes(val) ||
                row.original.aliases.some((a) => a.toLowerCase().includes(val))
            );
        },
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    });

    const { rows } = table.getRowModel();
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const rowVirtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => tableContainerRef.current,
        estimateSize: () => 52,
        overscan: 20,
    });

    return (
        <div>
            {/* Toolbar */}
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
                        border: '1px solid',
                        borderColor: 'border',
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
                    <Search
                        size={15}
                        className={css({ color: 'foreground.muted', flexShrink: '0' })}
                    />
                    <input
                        type="text"
                        placeholder="Zutat suchen..."
                        value={globalFilter}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                        className={css({
                            flex: '1',
                            bg: 'transparent',
                            border: 'none',
                            outline: 'none',
                            fontSize: 'sm',
                            color: 'foreground',
                        })}
                    />
                    {globalFilter && (
                        <button
                            type="button"
                            onClick={() => setGlobalFilter('')}
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
                <button
                    type="button"
                    onClick={() => setShowMerge(true)}
                    className={btnSecondary}
                    title="Zutaten zusammenfuehren"
                >
                    <GitMerge size={14} />
                </button>
                <button
                    type="button"
                    onClick={() => setShowAdd(!showAdd)}
                    className={btnPrimary}
                    title="Neue Zutat"
                >
                    <Plus size={14} />
                </button>
            </div>

            {/* Add form */}
            {showAdd && <AddIngredientForm onClose={() => setShowAdd(false)} />}

            {/* Merge modal */}
            {showMerge && (
                <MergeModal ingredients={ingredients} onClose={() => setShowMerge(false)} />
            )}

            {/* Virtualized table */}
            <div
                ref={tableContainerRef}
                className={css({ overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' })}
            >
                <table className={css({ width: '100%', borderCollapse: 'collapse' })}>
                    <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr
                                key={headerGroup.id}
                                className={css({
                                    borderBottom: '1px solid',
                                    borderColor: 'border.muted',
                                })}
                            >
                                {headerGroup.headers.map((header) => (
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
                        {rows.length === 0 ? (
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
                                    Keine Zutaten gefunden.
                                </td>
                            </tr>
                        ) : (
                            <>
                                {rowVirtualizer.getVirtualItems().length > 0 && (
                                    <tr
                                        style={{
                                            height: rowVirtualizer.getVirtualItems()[0].start,
                                        }}
                                    />
                                )}
                                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                    const row = rows[virtualRow.index];
                                    return (
                                        <tr
                                            key={row.id}
                                            data-index={virtualRow.index}
                                            ref={rowVirtualizer.measureElement}
                                            onClick={() => setEditingIngredient(row.original)}
                                            className={css({
                                                borderBottom: '1px solid',
                                                borderColor: 'border.muted',
                                                cursor: 'pointer',
                                                transition: 'background 0.1s ease',
                                                bg: row.original.needsReview
                                                    ? {
                                                          base: 'rgba(245,158,11,0.06)',
                                                          _dark: 'rgba(245,158,11,0.08)',
                                                      }
                                                    : virtualRow.index % 2 === 1
                                                      ? 'surface.muted'
                                                      : 'transparent',
                                                borderLeft: row.original.needsReview
                                                    ? '3px solid'
                                                    : '3px solid transparent',
                                                borderLeftColor: row.original.needsReview
                                                    ? 'status.warning'
                                                    : 'transparent',
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
                                                    {flexRender(
                                                        cell.column.columnDef.cell,
                                                        cell.getContext(),
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                                {rowVirtualizer.getVirtualItems().length > 0 && (
                                    <tr
                                        style={{
                                            height:
                                                rowVirtualizer.getTotalSize() -
                                                (rowVirtualizer.getVirtualItems().at(-1)?.end ?? 0),
                                        }}
                                    />
                                )}
                            </>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Row count */}
            <div
                className={css({
                    padding: '3',
                    paddingX: '4',
                    borderTop: '1px solid',
                    borderColor: 'border.muted',
                    display: 'flex',
                    justifyContent: 'center',
                })}
            >
                <span className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                    {rows.length} Zutaten
                </span>
            </div>

            {/* Edit dialog */}
            <Dialog.Root
                open={!!editingIngredient}
                onOpenChange={(open) => {
                    if (!open) setEditingIngredient(null);
                }}
            >
                <Dialog.Portal>
                    <Dialog.Overlay className={overlayStyle} />
                    <Dialog.Content className={dialogContentStyle}>
                        {editingIngredient && (
                            <IngredientEditPanel
                                ingredient={editingIngredient}
                                allCategories={allCategories}
                                allUnits={allUnits}
                                onClose={() => setEditingIngredient(null)}
                            />
                        )}
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </div>
    );
}
