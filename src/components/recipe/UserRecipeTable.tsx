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
import { ArrowUpDown, Search, Edit2, Trash2, Send, Archive } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import type { UserRecipe } from '@app/app/actions/user';
import { Button } from '@app/components/atoms/Button';
import { css } from 'styled-system/css';

type RecipeWithActions = UserRecipe;

const columns: ColumnDef<RecipeWithActions>[] = [
    {
        accessorKey: 'title',
        header: ({ column }) => {
            return (
                <button
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        fontWeight: 600,
                        fontSize: 'sm',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: 'muted',
                        cursor: 'pointer',
                        _hover: { color: 'text' },
                    })}
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Titel
                    <ArrowUpDown size={14} />
                </button>
            );
        },
        cell: ({ row }) => (
            <div className={css({ display: 'flex', flexDirection: 'column', gap: '0.375rem' })}>
                <Link
                    href={`/recipe/${row.original.slug}`}
                    className={css({
                        fontWeight: 600,
                        fontSize: 'base',
                        color: 'text',
                        textDecoration: 'none',
                        _hover: { color: 'primary' },
                    })}
                >
                    {row.original.title}
                </Link>
            </div>
        ),
    },
    {
        accessorKey: 'status',
        header: ({ column }) => {
            return (
                <button
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        fontWeight: 600,
                        fontSize: 'sm',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: 'muted',
                        cursor: 'pointer',
                        _hover: { color: 'text' },
                    })}
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Status
                    <ArrowUpDown size={14} />
                </button>
            );
        },
        cell: ({ row }) => {
            const isPublished = row.original.status === 'PUBLISHED';
            return (
                <span
                    className={css({
                        display: 'inline-flex',
                        alignItems: 'center',
                        paddingX: '0.75rem',
                        paddingY: '0.5rem',
                        borderRadius: 'sm',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: isPublished ? 'green-100' : 'amber-100',
                        color: isPublished ? 'green-800' : 'amber-800',
                    })}
                >
                    {isPublished ? 'Veröffentlicht' : 'Entwurf'}
                </span>
            );
        },
    },
    {
        accessorKey: 'rating',
        header: ({ column }) => {
            return (
                <button
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        fontWeight: 600,
                        fontSize: 'sm',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: 'muted',
                        cursor: 'pointer',
                        _hover: { color: 'text' },
                    })}
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Bewertung
                    <ArrowUpDown size={14} />
                </button>
            );
        },
        cell: ({ row }) => (
            <div className={css({ display: 'flex', flexDirection: 'column', gap: '0.25rem' })}>
                <span className={css({ fontSize: 'sm', fontWeight: 600 })}>
                    {row.original.ratingCount > 0 ? `★ ${row.original.rating.toFixed(1)}` : '—'}
                </span>
                <span className={css({ fontSize: '0.75rem', color: 'muted' })}>
                    {row.original.ratingCount}{' '}
                    {row.original.ratingCount === 1 ? 'Bewertung' : 'Bewertungen'}
                </span>
            </div>
        ),
    },
    {
        accessorKey: 'cookCount',
        header: ({ column }) => {
            return (
                <button
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        fontWeight: 600,
                        fontSize: 'sm',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: 'muted',
                        cursor: 'pointer',
                        _hover: { color: 'text' },
                    })}
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Zubereitet
                    <ArrowUpDown size={14} />
                </button>
            );
        },
        cell: ({ row }) => (
            <span className={css({ fontSize: 'sm', fontWeight: 500 })}>
                {row.original.cookCount} {row.original.cookCount === 1 ? 'mal' : 'mal'}
            </span>
        ),
    },
    {
        accessorKey: 'updatedAt',
        header: ({ column }) => {
            return (
                <button
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        fontWeight: 600,
                        fontSize: 'sm',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: 'muted',
                        cursor: 'pointer',
                        _hover: { color: 'text' },
                    })}
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Aktualisiert
                    <ArrowUpDown size={14} />
                </button>
            );
        },
        cell: ({ row }) => {
            const date = new Date(row.original.updatedAt);
            return (
                <span className={css({ fontSize: 'sm', color: 'muted' })}>
                    {date.toLocaleDateString('de-DE')}
                </span>
            );
        },
    },
    {
        id: 'actions',
        cell: ({ row }) => (
            <RecipeRowActions
                recipeId={row.original.id}
                title={row.original.title}
                status={row.original.status}
            />
        ),
    },
];

function RecipeRowActions({
    recipeId,
    title,
    status,
}: {
    recipeId: string;
    title: string;
    status: string;
}) {
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const isPublished = status === 'PUBLISHED';

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const res = await fetch('/api/recipes/bulk-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipeIds: [recipeId] }),
            });
            if (res.ok) {
                window.location.reload();
            }
        } finally {
            setIsDeleting(false);
        }
    };

    const handlePublish = async () => {
        setIsUpdating(true);
        try {
            const res = await fetch('/api/recipes/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipeId }),
            });
            if (res.ok) {
                window.location.reload();
            }
        } finally {
            setIsUpdating(false);
        }
    };

    const handleUnpublish = async () => {
        setIsUpdating(true);
        try {
            const res = await fetch('/api/recipes/unpublish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipeId }),
            });
            if (res.ok) {
                window.location.reload();
            }
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className={css({ display: 'flex', gap: '0.75rem' })}>
            <Link
                href={`/recipe/${recipeId}/edit`}
                className={css({
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '2.5rem',
                    height: '2.5rem',
                    borderRadius: 'md',
                    background: 'surface.card',
                    color: 'muted',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                    _hover: {
                        background: 'primary',
                        color: 'white',
                    },
                })}
                title="Bearbeiten"
            >
                <Edit2 size={18} />
            </Link>

            {!isPublished && (
                <button
                    onClick={handlePublish}
                    disabled={isUpdating}
                    className={css({
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '2.5rem',
                        height: '2.5rem',
                        borderRadius: 'md',
                        background: 'surface.card',
                        color: 'muted',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        opacity: isUpdating ? 0.5 : 1,
                        pointerEvents: isUpdating ? 'none' : 'auto',
                        _hover: {
                            background: 'green.100',
                            color: 'green.600',
                        },
                    })}
                    title="Veröffentlichen"
                >
                    <Send size={18} />
                </button>
            )}

            {isPublished && (
                <button
                    onClick={handleUnpublish}
                    disabled={isUpdating}
                    className={css({
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '2.5rem',
                        height: '2.5rem',
                        borderRadius: 'md',
                        background: 'surface.card',
                        color: 'muted',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        opacity: isUpdating ? 0.5 : 1,
                        pointerEvents: isUpdating ? 'none' : 'auto',
                        _hover: {
                            background: 'amber.100',
                            color: 'amber.600',
                        },
                    })}
                    title="Zurückziehen"
                >
                    <Archive size={18} />
                </button>
            )}

            <button
                onClick={() => setDeleteConfirm(true)}
                disabled={isDeleting || isUpdating}
                className={css({
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '2.5rem',
                    height: '2.5rem',
                    borderRadius: 'md',
                    background: 'surface.card',
                    color: 'muted',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    opacity: isDeleting || isUpdating ? 0.5 : 1,
                    pointerEvents: isDeleting || isUpdating ? 'none' : 'auto',
                    _hover: {
                        background: 'red.100',
                        color: 'red.600',
                    },
                })}
                title="Löschen"
            >
                <Trash2 size={18} />
            </button>

            {deleteConfirm && (
                <div
                    className={css({
                        position: 'fixed',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0, 0, 0, 0.5)',
                        zIndex: 50,
                    })}
                    onClick={() => !isDeleting && setDeleteConfirm(false)}
                >
                    <div
                        className={css({
                            background: 'surface.elevated',
                            borderRadius: 'lg',
                            padding: '2rem',
                            maxWidth: '400px',
                            width: '90%',
                            boxShadow: 'shadow.lg',
                        })}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3
                            className={css({
                                fontSize: '1.25rem',
                                fontWeight: 700,
                                marginBottom: '1rem',
                                color: 'red.600',
                            })}
                        >
                            Rezept löschen?
                        </h3>
                        <p
                            className={css({
                                color: 'muted',
                                marginBottom: '1.5rem',
                                lineHeight: 1.6,
                            })}
                        >
                            "{title}" wird endgültig gelöscht und kann nicht wiederhergestellt
                            werden.
                        </p>
                        <div
                            className={css({
                                display: 'flex',
                                gap: '0.75rem',
                                justifyContent: 'flex-end',
                            })}
                        >
                            <Button
                                variant="secondary"
                                onClick={() => setDeleteConfirm(false)}
                                disabled={isDeleting}
                            >
                                Abbrechen
                            </Button>
                            <Button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className={css({
                                    background: 'red.600',
                                    _hover: { background: 'red.700' },
                                })}
                            >
                                {isDeleting ? 'Wird gelöscht...' : 'Löschen'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export function UserRecipeTable({ recipes }: { recipes: UserRecipe[] }) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'PUBLISHED'>('ALL');

    const filteredRecipes =
        statusFilter === 'ALL' ? recipes : recipes.filter((r) => r.status === statusFilter);

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data: filteredRecipes,
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
                pageSize: 10,
            },
        },
    });

    return (
        <div
            className={css({
                borderRadius: 'lg',
                borderWidth: '1px',
                borderColor: 'border',
                background: 'surface.elevated',
                overflow: 'hidden',
            })}
        >
            {/* Header */}
            <div
                className={css({
                    padding: '1.5rem',
                    borderBottomWidth: '1px',
                    borderColor: 'border',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1.5rem',
                    flexWrap: 'wrap',
                })}
            >
                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        background: 'surface.card',
                        borderRadius: 'md',
                        borderWidth: '1px',
                        borderColor: 'border',
                        paddingX: '1rem',
                        paddingY: '0.75rem',
                        flex: '1',
                        maxWidth: '350px',
                    })}
                >
                    <Search size={18} className={css({ color: 'muted', flexShrink: 0 })} />
                    <input
                        type="text"
                        placeholder="Rezepte suchen..."
                        value={globalFilter}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                        className={css({
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            fontSize: 'sm',
                            color: 'text',
                            width: '100%',
                            '&::placeholder': { color: 'muted' },
                        })}
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) =>
                        setStatusFilter(e.target.value as 'ALL' | 'DRAFT' | 'PUBLISHED')
                    }
                    className={css({
                        paddingX: '1rem',
                        paddingY: '0.75rem',
                        borderRadius: 'md',
                        borderWidth: '1px',
                        borderColor: 'border',
                        background: 'surface.card',
                        fontSize: 'sm',
                        color: 'text',
                        outline: 'none',
                        cursor: 'pointer',
                    })}
                >
                    <option value="ALL">Alle Status</option>
                    <option value="DRAFT">Entwürfe</option>
                    <option value="PUBLISHED">Veröffentlicht</option>
                </select>
            </div>

            {/* Table */}
            <div className={css({ overflowX: 'auto' })}>
                <table className={css({ width: '100%', borderCollapse: 'collapse' })}>
                    <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr
                                key={headerGroup.id}
                                className={css({
                                    borderBottomWidth: '1px',
                                    borderColor: 'border',
                                })}
                            >
                                {headerGroup.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        className={css({
                                            padding: '1.25rem 1.5rem',
                                            textAlign: 'left',
                                            background: 'surface.card',
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
                                        padding: '3rem 1.5rem',
                                        textAlign: 'center',
                                        color: 'muted',
                                    })}
                                >
                                    <p className={css({ marginBottom: '0.5rem' })}>
                                        Keine Rezepte gefunden
                                    </p>
                                    <Link
                                        href="/recipe/create"
                                        className={css({
                                            color: 'primary',
                                            textDecoration: 'underline',
                                            fontSize: 'sm',
                                        })}
                                    >
                                        Erstes Rezept erstellen
                                    </Link>
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <tr
                                    key={row.id}
                                    className={css({
                                        borderBottomWidth: '1px',
                                        borderColor: 'border',
                                        transition: 'background 0.2s',
                                        _hover: { background: 'surface.card' },
                                    })}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td
                                            key={cell.id}
                                            className={css({ padding: '1.25rem 1.5rem' })}
                                        >
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext(),
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div
                className={css({
                    padding: '1.5rem',
                    borderTopWidth: '1px',
                    borderColor: 'border',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1.5rem',
                    flexWrap: 'wrap',
                })}
            >
                <span className={css({ fontSize: 'sm', color: 'muted' })}>
                    {table.getFilteredRowModel().rows.length} von {filteredRecipes.length} Rezepten
                </span>
                <div className={css({ display: 'flex', gap: '0.75rem' })}>
                    <button
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className={css({
                            paddingX: '1rem',
                            paddingY: '0.625rem',
                            borderRadius: 'md',
                            borderWidth: '1px',
                            borderColor: 'border',
                            background: 'surface.card',
                            fontSize: 'sm',
                            fontWeight: 500,
                            cursor: 'pointer',
                            opacity: table.getCanPreviousPage() ? 1 : 0.5,
                            pointerEvents: table.getCanPreviousPage() ? 'auto' : 'none',
                        })}
                    >
                        ← Zurück
                    </button>
                    <span className={css({ fontSize: 'sm', color: 'muted', alignSelf: 'center' })}>
                        Seite {table.getState().pagination.pageIndex + 1} von {table.getPageCount()}
                    </span>
                    <button
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className={css({
                            paddingX: '1rem',
                            paddingY: '0.625rem',
                            borderRadius: 'md',
                            borderWidth: '1px',
                            borderColor: 'border',
                            background: 'surface.card',
                            fontSize: 'sm',
                            fontWeight: 500,
                            cursor: 'pointer',
                            opacity: table.getCanNextPage() ? 1 : 0.5,
                            pointerEvents: table.getCanNextPage() ? 'auto' : 'none',
                        })}
                    >
                        Weiter →
                    </button>
                </div>
            </div>
        </div>
    );
}
