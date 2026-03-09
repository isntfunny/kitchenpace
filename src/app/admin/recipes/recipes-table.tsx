'use client';

import { RecipeStatus, Difficulty } from '@prisma/client';
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
import { ArrowUpDown, Search, Archive, Send, Trash2, Flame, GitBranch, Pencil } from 'lucide-react';
import { useState } from 'react';

import { css } from 'styled-system/css';

import { publishRecipe, unpublishRecipe, deleteRecipe } from './actions';

type Recipe = {
    id: string;
    title: string;
    slug: string;
    status: RecipeStatus;
    difficulty: Difficulty;
    rating: number;
    ratingCount: number;
    viewCount: number;
    cookCount: number;
    createdAt: string;
    publishedAt: string | null;
    authorId: string;
    authorName: string;
    commentCount: number;
    isTrending: boolean;
    nodeCount: number;
};

const STATUS_LABELS: Record<RecipeStatus, string> = {
    DRAFT: 'Entwurf',
    PUBLISHED: 'Veröffentlicht',
    ARCHIVED: 'Archiviert',
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
    EASY: 'Einfach',
    MEDIUM: 'Mittel',
    HARD: 'Schwer',
};

const columns: ColumnDef<Recipe>[] = [
    {
        accessorKey: 'title',
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
                    Titel
                    <ArrowUpDown size={12} />
                </button>
            );
        },
        cell: ({ row }) => (
            <div className={css({ display: 'flex', flexDirection: 'column', gap: '0.5' })}>
                <span className={css({ fontWeight: 'medium' })}>{row.original.title}</span>
                <span className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                    von {row.original.authorName}
                </span>
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
                    Status
                    <ArrowUpDown size={12} />
                </button>
            );
        },
        cell: ({ row }) => {
            const recipe = row.original;
            const isPublished = recipe.status === 'PUBLISHED';
            const isArchived = recipe.status === 'ARCHIVED';

            return (
                <div className={css({ display: 'flex', gap: '2' })}>
                    <span
                        className={css({
                            display: 'inline-flex',
                            alignItems: 'center',
                            paddingX: '2',
                            paddingY: '1',
                            borderRadius: 'full',
                            fontSize: 'xs',
                            fontWeight: 'medium',
                        })}
                        style={{
                            backgroundColor: isPublished
                                ? 'rgba(34, 197, 94, 0.15)'
                                : isArchived
                                  ? 'rgba(107, 114, 128, 0.15)'
                                  : 'rgba(59, 130, 246, 0.15)',
                            color: isPublished ? '#22c55e' : isArchived ? '#6b7280' : '#3b82f6',
                        }}
                    >
                        {STATUS_LABELS[recipe.status]}
                    </span>
                </div>
            );
        },
    },
    {
        accessorKey: 'difficulty',
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
                    Schwierigkeit
                    <ArrowUpDown size={12} />
                </button>
            );
        },
        cell: ({ row }) => (
            <span className={css({ fontSize: 'sm' })}>
                {DIFFICULTY_LABELS[row.original.difficulty]}
            </span>
        ),
    },
    {
        accessorKey: 'rating',
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
                    Bewertung
                    <ArrowUpDown size={12} />
                </button>
            );
        },
        cell: ({ row }) => (
            <span className={css({ fontSize: 'sm' })}>
                {row.original.rating > 0
                    ? `${row.original.rating.toFixed(1)} (${row.original.ratingCount})`
                    : '—'}
            </span>
        ),
    },
    {
        accessorKey: 'viewCount',
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
                    Aufrufe
                    <ArrowUpDown size={12} />
                </button>
            );
        },
        cell: ({ row }) => (
            <span className={css({ fontSize: 'sm' })}>{row.original.viewCount}</span>
        ),
    },
    {
        accessorKey: 'nodeCount',
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
                    Nodes
                    <ArrowUpDown size={12} />
                </button>
            );
        },
        cell: ({ row }) => (
            <div
                className={css({ display: 'flex', alignItems: 'center', gap: '1', fontSize: 'sm' })}
            >
                <GitBranch size={14} className={css({ color: 'foreground.muted' })} />
                <span>{row.original.nodeCount}</span>
            </div>
        ),
    },
    {
        accessorKey: 'isTrending',
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
                    Trending
                    <ArrowUpDown size={12} />
                </button>
            );
        },
        cell: ({ row }) => {
            const isTrending = row.original.isTrending;
            return (
                <div className={css({ display: 'flex', alignItems: 'center', gap: '1' })}>
                    {isTrending ? (
                        <span
                            className={css({
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '1',
                                paddingX: '2',
                                paddingY: '1',
                                borderRadius: 'full',
                                fontSize: 'xs',
                                fontWeight: 'medium',
                                backgroundColor: {
                                    base: 'rgba(239, 68, 68, 0.15)',
                                    _dark: 'rgba(239, 68, 68, 0.2)',
                                },
                                color: 'status.error',
                            })}
                        >
                            <Flame size={12} />
                            Trending
                        </span>
                    ) : (
                        <span className={css({ fontSize: 'sm', color: 'foreground.muted' })}>
                            —
                        </span>
                    )}
                </div>
            );
        },
    },
    {
        accessorKey: 'createdAt',
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
                    Erstellt
                    <ArrowUpDown size={12} />
                </button>
            );
        },
        cell: ({ row }) => {
            const date = new Date(row.original.createdAt);
            return (
                <span className={css({ fontSize: 'sm', color: 'foreground.muted' })}>
                    {date.toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                    })}
                </span>
            );
        },
    },
    {
        id: 'actions',
        cell: ({ row }) => {
            const recipe = row.original;
            const isPublished = recipe.status === 'PUBLISHED';
            const isArchived = recipe.status === 'ARCHIVED';

            return (
                <div className={css({ display: 'flex', gap: '2' })}>
                    <a
                        href={`/recipe/${recipe.id}/edit`}
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
                        <Pencil size={14} />
                    </a>
                    {!isPublished && !isArchived && (
                        <form
                            action={async () => {
                                try {
                                    await publishRecipe(recipe.id);
                                } catch (err) {
                                    alert(
                                        err instanceof Error
                                            ? err.message
                                            : 'Fehler beim Veröffentlichen',
                                    );
                                }
                            }}
                        >
                            <button
                                title="Veröffentlichen"
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
                                        background: 'green.50',
                                        borderColor: 'green.200',
                                        color: 'green.600',
                                    },
                                })}
                            >
                                <Send size={14} />
                            </button>
                        </form>
                    )}
                    {isPublished && (
                        <form
                            action={async () => {
                                try {
                                    await unpublishRecipe(recipe.id);
                                } catch (err) {
                                    alert(
                                        err instanceof Error
                                            ? err.message
                                            : 'Fehler beim Zurückziehen',
                                    );
                                }
                            }}
                        >
                            <button
                                title="Zurückziehen"
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
                                        background: 'orange.50',
                                        borderColor: 'orange.200',
                                        color: 'orange.600',
                                    },
                                })}
                            >
                                <Archive size={14} />
                            </button>
                        </form>
                    )}
                    <form
                        action={async () => {
                            if (confirm(`"${recipe.title}" archivieren?`)) {
                                try {
                                    await deleteRecipe(recipe.id);
                                } catch (err) {
                                    alert(
                                        err instanceof Error
                                            ? err.message
                                            : 'Fehler beim Archivieren',
                                    );
                                }
                            }
                        }}
                    >
                        <button
                            title="Archivieren"
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

export function RecipesTable({ recipes }: { recipes: Recipe[] }) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<RecipeStatus | 'ALL'>('ALL');

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
                pageSize: 20,
            },
        },
    });

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
                        maxWidth: '300px',
                    })}
                >
                    <Search size={16} className={css({ color: 'foreground.muted' })} />
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
                            color: 'foreground',
                            width: '100%',
                            '&::placeholder': { color: 'foreground.muted' },
                        })}
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as RecipeStatus | 'ALL')}
                    className={css({
                        paddingX: '3',
                        paddingY: '2',
                        borderRadius: 'lg',
                        borderWidth: '1px',
                        borderColor: 'border.muted',
                        background: 'surface',
                        fontSize: 'sm',
                        color: 'foreground',
                        outline: 'none',
                        cursor: 'pointer',
                    })}
                >
                    <option value="ALL">Alle Status</option>
                    <option value="DRAFT">Entwurf</option>
                    <option value="PUBLISHED">Veröffentlicht</option>
                    <option value="ARCHIVED">Archiviert</option>
                </select>
            </div>

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
                                    Keine Rezepte gefunden.
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map((row) => (
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
                            ))
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
                <span className={css({ fontSize: 'sm', color: 'foreground.muted' })}>
                    {table.getFilteredRowModel().rows.length} von {filteredRecipes.length} Rezepten
                </span>
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
            </div>
        </div>
    );
}
