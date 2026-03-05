'use client';

import {
    type ColumnDef,
    type SortingState,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    flexRender,
} from '@tanstack/react-table';
import { ArrowUpDown, Search, Plus, Trash2, X, Check } from 'lucide-react';
import { useState } from 'react';

import { css } from 'styled-system/css';

import { createTag, deleteTag, updateTag } from './actions';

type Tag = {
    id: string;
    name: string;
    slug: string;
    recipeCount: number;
};

function EditableTagRow({ tag, onCancel }: { tag: Tag; onCancel: () => void }) {
    const [name, setName] = useState(tag.name);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        setError('');
        setSaving(true);
        try {
            await updateTag(tag.id, { name });
            onCancel();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <tr
                className={css({
                    background: 'surface',
                    borderBottomWidth: '1px',
                    borderColor: error ? 'red.200' : 'border.muted',
                })}
            >
                <td className={css({ padding: '3', paddingLeft: '4' })}>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={css({
                            width: '100%',
                            paddingX: '2',
                            paddingY: '1',
                            borderRadius: 'md',
                            borderWidth: '1px',
                            borderColor: error ? 'red.300' : 'border.muted',
                            background: 'surface.elevated',
                            fontSize: 'sm',
                            color: 'foreground',
                            outline: 'none',
                        })}
                    />
                </td>
                <td className={css({ padding: '3', fontSize: 'sm', color: 'foreground.muted' })}>
                    —
                </td>
                <td className={css({ padding: '3', fontSize: 'sm', color: 'foreground.muted' })}>
                    {tag.recipeCount}
                </td>
                <td className={css({ padding: '3' })}>
                    <div className={css({ display: 'flex', gap: '1' })}>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            title="Speichern"
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '7',
                                height: '7',
                                borderRadius: 'md',
                                border: '1px solid',
                                borderColor: 'green.500',
                                background: 'green.50',
                                cursor: 'pointer',
                                color: 'green.600',
                                transition: 'all 0.2s',
                                opacity: saving ? 0.7 : 1,
                            })}
                        >
                            <Check size={14} />
                        </button>
                        <button
                            onClick={onCancel}
                            title="Abbrechen"
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '7',
                                height: '7',
                                borderRadius: 'md',
                                border: '1px solid',
                                borderColor: 'border.muted',
                                background: 'surface',
                                cursor: 'pointer',
                                color: 'foreground.muted',
                                transition: 'all 0.2s',
                                _hover: { background: 'surface.elevated' },
                            })}
                        >
                            <X size={14} />
                        </button>
                    </div>
                </td>
            </tr>
            {error && (
                <tr>
                    <td colSpan={4} className={css({ padding: '2', paddingLeft: '4' })}>
                        <div className={css({ fontSize: 'xs', color: 'red.600' })}>{error}</div>
                    </td>
                </tr>
            )}
        </>
    );
}

const getColumns = (onEdit: (id: string) => void): ColumnDef<Tag>[] => [
    {
        accessorKey: 'name',
        header: ({ column }) => {
            return (
                <button
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1',
                        fontWeight: 'semibold',
                        fontSize: 'xs',
                        textTransform: 'uppercase',
                        letterSpacing: '0.3em',
                        color: 'foreground.muted',
                        cursor: 'pointer',
                        _hover: { color: 'foreground' },
                    })}
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Name
                    <ArrowUpDown size={12} />
                </button>
            );
        },
        cell: ({ row }) => (
            <span className={css({ fontWeight: 'medium' })}>{row.original.name}</span>
        ),
    },
    {
        accessorKey: 'slug',
        header: () => (
            <span
                className={css({
                    fontWeight: 'semibold',
                    fontSize: 'xs',
                    textTransform: 'uppercase',
                    letterSpacing: '0.3em',
                    color: 'foreground.muted',
                })}
            >
                Slug
            </span>
        ),
        cell: ({ row }) => (
            <span className={css({ fontSize: 'sm', color: 'foreground.muted' })}>
                {row.original.slug}
            </span>
        ),
    },
    {
        accessorKey: 'recipeCount',
        header: ({ column }) => {
            return (
                <button
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1',
                        fontWeight: 'semibold',
                        fontSize: 'xs',
                        textTransform: 'uppercase',
                        letterSpacing: '0.3em',
                        color: 'foreground.muted',
                        cursor: 'pointer',
                        _hover: { color: 'foreground' },
                    })}
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Rezepte
                    <ArrowUpDown size={12} />
                </button>
            );
        },
        cell: ({ row }) => (
            <span className={css({ fontSize: 'sm' })}>{row.original.recipeCount}</span>
        ),
    },
    {
        id: 'actions',
        cell: ({ row }) => {
            const tag = row.original;

            return (
                <div className={css({ display: 'flex', gap: '2' })}>
                    <button
                        onClick={() => onEdit(tag.id)}
                        title="Bearbeiten"
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '8',
                            height: '8',
                            borderRadius: 'lg',
                            border: '1px solid',
                            borderColor: 'border.muted',
                            background: 'surface',
                            cursor: 'pointer',
                            color: 'foreground.muted',
                            transition: 'all 0.2s',
                            _hover: {
                                background: 'blue.50',
                                borderColor: 'blue.200',
                                color: 'blue.600',
                            },
                        })}
                    >
                        <X size={12} style={{ transform: 'rotate(45deg)' }} />
                    </button>
                    <form
                        action={async () => {
                            if (confirm(`"${tag.name}" wirklich löschen?`)) {
                                try {
                                    await deleteTag(tag.id);
                                } catch (err) {
                                    alert(
                                        err instanceof Error ? err.message : 'Fehler beim Löschen',
                                    );
                                }
                            }
                        }}
                    >
                        <button
                            type="submit"
                            title="Löschen"
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '8',
                                height: '8',
                                borderRadius: 'lg',
                                border: '1px solid',
                                borderColor: 'border.muted',
                                background: 'surface',
                                cursor: 'pointer',
                                color: 'foreground.muted',
                                transition: 'all 0.2s',
                                _hover: {
                                    background: 'red.50',
                                    borderColor: 'red.200',
                                    color: 'red.600',
                                },
                            })}
                        >
                            <Trash2 size={14} />
                        </button>
                    </form>
                </div>
            );
        },
    },
];

export function TagsTable({ tags }: { tags: Tag[] }) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);

    const columns = getColumns((id) => setEditingId(id));

    const table = useReactTable({
        data: tags,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        state: {
            sorting,
            globalFilter,
        },
        initialState: {
            pagination: {
                pageSize: 20,
            },
        },
    });

    const handleAddTag = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;

        await createTag({ name: newName });
        setNewName('');
        setIsAdding(false);
    };

    return (
        <div
            className={css({
                borderRadius: '2xl',
                borderWidth: '1px',
                borderColor: 'border.muted',
                background: 'surface.elevated',
                overflow: 'hidden',
            })}
        >
            <div
                className={css({
                    padding: '4',
                    borderBottomWidth: '1px',
                    borderColor: 'border.muted',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '4',
                    flexWrap: 'wrap',
                })}
            >
                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2',
                        background: 'surface',
                        borderRadius: 'lg',
                        borderWidth: '1px',
                        borderColor: 'border.muted',
                        paddingX: '3',
                        paddingY: '2',
                        flex: '1',
                        maxWidth: '400px',
                    })}
                >
                    <Search size={16} className={css({ color: 'foreground.muted' })} />
                    <input
                        type="text"
                        placeholder="Tags suchen..."
                        value={globalFilter}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                        className={css({
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            fontSize: 'sm',
                            color: 'foreground',
                            width: '100%',
                            '&::placeholder': { color: 'foreground.muted' },
                        })}
                    />
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2',
                        paddingX: '3',
                        paddingY: '2',
                        borderRadius: 'lg',
                        borderWidth: '1px',
                        borderColor: 'border',
                        background: 'surface',
                        fontSize: 'sm',
                        fontWeight: 'medium',
                        cursor: 'pointer',
                        color: 'foreground',
                        transition: 'all 0.2s',
                        _hover: { background: 'surface.elevated' },
                    })}
                >
                    <Plus size={16} />
                    Hinzufügen
                </button>
            </div>

            {isAdding && (
                <form
                    onSubmit={handleAddTag}
                    className={css({
                        padding: '4',
                        borderBottomWidth: '1px',
                        borderColor: 'border.muted',
                        background: 'surface',
                        display: 'flex',
                        gap: '3',
                        alignItems: 'flex-end',
                    })}
                >
                    <div className={css({ display: 'flex', flexDirection: 'column', gap: '1' })}>
                        <label className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                            Name
                        </label>
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Tag-Name"
                            className={css({
                                paddingX: '3',
                                paddingY: '2',
                                borderRadius: 'lg',
                                borderWidth: '1px',
                                borderColor: 'border.muted',
                                background: 'surface.elevated',
                                fontSize: 'sm',
                                color: 'foreground',
                                outline: 'none',
                                width: '200px',
                            })}
                        />
                    </div>
                    <button
                        type="submit"
                        className={css({
                            paddingX: '4',
                            paddingY: '2',
                            borderRadius: 'lg',
                            borderWidth: '1px',
                            borderColor: 'border',
                            background: 'primary',
                            fontSize: 'sm',
                            fontWeight: 'medium',
                            cursor: 'pointer',
                            color: 'white',
                        })}
                    >
                        Speichern
                    </button>
                </form>
            )}

            <div className={css({ overflowX: 'auto' })}>
                <table className={css({ width: '100%', borderCollapse: 'collapse' })}>
                    <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr
                                key={headerGroup.id}
                                className={css({
                                    borderBottomWidth: '1px',
                                    borderColor: 'border.muted',
                                })}
                            >
                                {headerGroup.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        className={css({
                                            padding: '3',
                                            paddingLeft: '4',
                                            textAlign: 'left',
                                        })}
                                    >
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
                        {table.getRowModel().rows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className={css({
                                        padding: '8',
                                        textAlign: 'center',
                                        color: 'foreground.muted',
                                    })}
                                >
                                    Keine Tags gefunden.
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map((row) =>
                                editingId === row.original.id ? (
                                    <EditableTagRow
                                        key={row.id}
                                        tag={row.original}
                                        onCancel={() => setEditingId(null)}
                                    />
                                ) : (
                                    <tr
                                        key={row.id}
                                        className={css({
                                            borderBottomWidth: '1px',
                                            borderColor: 'border.muted',
                                            transition: 'background 0.2s',
                                            _hover: { background: 'surface' },
                                        })}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <td
                                                key={cell.id}
                                                className={css({ padding: '3', paddingLeft: '4' })}
                                            >
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext(),
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ),
                            )
                        )}
                    </tbody>
                </table>
            </div>

            <div
                className={css({
                    padding: '4',
                    borderTopWidth: '1px',
                    borderColor: 'border.muted',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '4',
                    flexWrap: 'wrap',
                })}
            >
                <div className={css({ display: 'flex', gap: '2' })}>
                    <button
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className={css({
                            paddingX: '3',
                            paddingY: '2',
                            borderRadius: 'lg',
                            borderWidth: '1px',
                            borderColor: 'border.muted',
                            background: 'surface',
                            fontSize: 'sm',
                            cursor: 'pointer',
                            opacity: table.getCanPreviousPage() ? 1 : 0.5,
                            pointerEvents: table.getCanPreviousPage() ? 'auto' : 'none',
                        })}
                    >
                        Zurück
                    </button>
                    <button
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className={css({
                            paddingX: '3',
                            paddingY: '2',
                            borderRadius: 'lg',
                            borderWidth: '1px',
                            borderColor: 'border.muted',
                            background: 'surface',
                            fontSize: 'sm',
                            cursor: 'pointer',
                            opacity: table.getCanNextPage() ? 1 : 0.5,
                            pointerEvents: table.getCanNextPage() ? 'auto' : 'none',
                        })}
                    >
                        Weiter
                    </button>
                </div>
                <span className={css({ fontSize: 'sm', color: 'foreground.muted' })}>
                    Seite {table.getState().pagination.pageIndex + 1} von {table.getPageCount()}
                </span>
            </div>
        </div>
    );
}
