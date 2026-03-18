'use client';

import {
    type ColumnDef,
    type SortingState,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { Dialog } from 'radix-ui';
import { useMemo, useState } from 'react';

import { css } from 'styled-system/css';

import { deleteUnit } from './actions';
import { DeleteButton, SimpleTable, SortHeader, TableToolbar } from './ingredient-shared';
import { type Unit, dialogContentSmallStyle, overlayStyle } from './ingredient-types';
import { AddUnitForm, UnitEditPanel } from './UnitForms';

// ---------------------------------------------------------------------------
// UnitsTab
// ---------------------------------------------------------------------------

export function UnitsTab({ units }: { units: Unit[] }) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
    const [showAdd, setShowAdd] = useState(false);

    const columns = useMemo<ColumnDef<Unit>[]>(
        () => [
            {
                accessorKey: 'shortName',
                header: ({ column }) => <SortHeader column={column} label="Kurzname" />,
                cell: ({ row }) => (
                    <span
                        className={css({
                            fontWeight: '600',
                            fontSize: 'sm',
                            color: 'foreground',
                        })}
                    >
                        {row.original.shortName}
                    </span>
                ),
            },
            {
                accessorKey: 'longName',
                header: 'Langname',
                cell: ({ row }) => (
                    <span className={css({ fontSize: 'sm', color: 'foreground' })}>
                        {row.original.longName}
                    </span>
                ),
            },
            {
                accessorKey: 'gramsDefault',
                header: ({ column }) => <SortHeader column={column} label="Gramm (Standard)" />,
                cell: ({ row }) => (
                    <span
                        className={css({
                            fontSize: 'sm',
                            color: 'foreground.muted',
                            fontVariantNumeric: 'tabular-nums',
                        })}
                    >
                        {row.original.gramsDefault != null ? `${row.original.gramsDefault}g` : '-'}
                    </span>
                ),
            },
            {
                id: 'ingredientCount',
                header: 'Zutaten',
                accessorFn: (row) => row._count.ingredients,
                cell: ({ row }) => (
                    <span
                        className={css({
                            fontSize: 'sm',
                            color: 'foreground.muted',
                            fontVariantNumeric: 'tabular-nums',
                        })}
                    >
                        {row.original._count.ingredients}
                    </span>
                ),
            },
            {
                id: 'actions',
                header: '',
                cell: ({ row }) => (
                    <DeleteButton
                        onDelete={async () => {
                            await deleteUnit(row.original.id);
                        }}
                        disabled={row.original._count.ingredients > 0}
                        title={
                            row.original._count.ingredients > 0
                                ? 'Einheit wird noch verwendet'
                                : 'Einheit loeschen'
                        }
                    />
                ),
                size: 50,
            },
        ],
        [],
    );

    const table = useReactTable({
        data: units,
        columns,
        state: { sorting, globalFilter },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    });

    return (
        <div>
            <TableToolbar
                searchPlaceholder="Einheit suchen..."
                filter={globalFilter}
                onFilterChange={setGlobalFilter}
                onAdd={() => setShowAdd(!showAdd)}
            />

            {showAdd && <AddUnitForm onClose={() => setShowAdd(false)} />}

            <SimpleTable
                table={table}
                columns={columns}
                onRowClick={(row) => setEditingUnit(row)}
                emptyMessage="Keine Einheiten gefunden."
            />

            {/* Edit dialog */}
            <Dialog.Root
                open={!!editingUnit}
                onOpenChange={(open) => {
                    if (!open) setEditingUnit(null);
                }}
            >
                <Dialog.Portal>
                    <Dialog.Overlay className={overlayStyle} />
                    <Dialog.Content className={dialogContentSmallStyle}>
                        {editingUnit && (
                            <UnitEditPanel
                                unit={editingUnit}
                                onClose={() => setEditingUnit(null)}
                            />
                        )}
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </div>
    );
}
