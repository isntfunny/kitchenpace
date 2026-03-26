'use client';

import { CollectionTemplate, ModerationStatus } from '@prisma/client';
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
import { ArrowUpDown, Search, Send, Archive, Trash2, Pencil, CheckCircle } from 'lucide-react';
import { useState } from 'react';

import { css } from 'styled-system/css';

import {
    adminPublishCollection,
    adminUnpublishCollection,
    adminDeleteCollection,
    adminApproveCollection,
} from './actions';

type Collection = {
    id: string;
    title: string;
    slug: string;
    published: boolean;
    template: CollectionTemplate;
    viewCount: number;
    moderationStatus: ModerationStatus;
    createdAt: string;
    authorId: string;
    authorName: string;
    recipeCount: number;
};

const TEMPLATE_LABELS: Record<CollectionTemplate, string> = {
    SIDEBAR: 'Sidebar',
    GRID_BELOW: 'Grid Below',
    HERO_PICKS: 'Hero Picks',
    INLINE: 'Inline',
};

type StatusFilter = 'ALL' | 'PUBLISHED' | 'DRAFT' | 'PENDING' | 'REJECTED';

const sortableHeaderClass = css({
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
});

const columns: ColumnDef<Collection>[] = [
    {
        accessorKey: 'title',
        header: ({ column }) => (
            <button
                className={sortableHeaderClass}
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
                Titel
                <ArrowUpDown size={12} />
            </button>
        ),
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
        accessorKey: 'published',
        header: ({ column }) => (
            <button
                className={sortableHeaderClass}
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
                Status
                <ArrowUpDown size={12} />
            </button>
        ),
        cell: ({ row }) => {
            const collection = row.original;
            const isPublished = collection.published;
            const modStatus = collection.moderationStatus;
            const isPending = modStatus === 'PENDING';
            const isRejected = modStatus === 'REJECTED';

            return (
                <div className={css({ display: 'flex', gap: '2', flexWrap: 'wrap' })}>
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
                                : 'rgba(59, 130, 246, 0.15)',
                            color: isPublished ? '#22c55e' : '#3b82f6',
                        }}
                    >
                        {isPublished ? 'Veröffentlicht' : 'Entwurf'}
                    </span>
                    {(isPending || isRejected) && (
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
                                backgroundColor: isPending
                                    ? 'rgba(234, 179, 8, 0.15)'
                                    : 'rgba(239, 68, 68, 0.15)',
                                color: isPending ? '#eab308' : '#ef4444',
                            }}
                        >
                            {isPending ? 'Prüfung ausstehend' : 'Abgelehnt'}
                        </span>
                    )}
                </div>
            );
        },
    },
    {
        accessorKey: 'template',
        header: ({ column }) => (
            <button
                className={sortableHeaderClass}
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
                Template
                <ArrowUpDown size={12} />
            </button>
        ),
        cell: ({ row }) => (
            <span className={css({ fontSize: 'sm' })}>
                {TEMPLATE_LABELS[row.original.template]}
            </span>
        ),
    },
    {
        accessorKey: 'recipeCount',
        header: ({ column }) => (
            <button
                className={sortableHeaderClass}
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
                Rezepte
                <ArrowUpDown size={12} />
            </button>
        ),
        cell: ({ row }) => (
            <span className={css({ fontSize: 'sm' })}>{row.original.recipeCount}</span>
        ),
    },
    {
        accessorKey: 'viewCount',
        header: ({ column }) => (
            <button
                className={sortableHeaderClass}
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
                Aufrufe
                <ArrowUpDown size={12} />
            </button>
        ),
        cell: ({ row }) => (
            <span className={css({ fontSize: 'sm' })}>{row.original.viewCount}</span>
        ),
    },
    {
        accessorKey: 'createdAt',
        header: ({ column }) => (
            <button
                className={sortableHeaderClass}
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
                Erstellt
                <ArrowUpDown size={12} />
            </button>
        ),
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
        cell: ({ row }) => <CollectionActions collection={row.original} />,
    },
];

const actionBtnClass = (hoverBg: string, hoverBorder: string, hoverColor: string) =>
    css({
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
            background: hoverBg,
            borderColor: hoverBorder,
            color: hoverColor,
        },
    });

function CollectionActions({ collection }: { collection: Collection }) {
    const isPublished = collection.published;
    const isPending = collection.moderationStatus === 'PENDING';

    return (
        <div className={css({ display: 'flex', gap: '2' })}>
            <a
                href={`/collection/${collection.slug}/edit`}
                title="Bearbeiten"
                className={actionBtnClass('blue.50', 'blue.200', 'blue.600')}
            >
                <Pencil size={14} />
            </a>
            {!isPublished && (
                <form
                    action={async () => {
                        try {
                            await adminPublishCollection(collection.id);
                        } catch (err) {
                            alert(
                                err instanceof Error ? err.message : 'Fehler beim Veröffentlichen',
                            );
                        }
                    }}
                >
                    <button
                        title="Veröffentlichen"
                        className={actionBtnClass('green.50', 'green.200', 'green.600')}
                    >
                        <Send size={14} />
                    </button>
                </form>
            )}
            {isPublished && (
                <form
                    action={async () => {
                        try {
                            await adminUnpublishCollection(collection.id);
                        } catch (err) {
                            alert(err instanceof Error ? err.message : 'Fehler beim Zurückziehen');
                        }
                    }}
                >
                    <button
                        title="Zurückziehen"
                        className={actionBtnClass('orange.50', 'orange.200', 'orange.600')}
                    >
                        <Archive size={14} />
                    </button>
                </form>
            )}
            {isPending && (
                <form
                    action={async () => {
                        try {
                            await adminApproveCollection(collection.id);
                        } catch (err) {
                            alert(err instanceof Error ? err.message : 'Fehler beim Genehmigen');
                        }
                    }}
                >
                    <button
                        title="Genehmigen"
                        className={actionBtnClass('green.50', 'green.200', 'green.600')}
                    >
                        <CheckCircle size={14} />
                    </button>
                </form>
            )}
            <form
                action={async () => {
                    if (confirm(`"${collection.title}" löschen?`)) {
                        try {
                            await adminDeleteCollection(collection.id);
                        } catch (err) {
                            alert(err instanceof Error ? err.message : 'Fehler beim Löschen');
                        }
                    }
                }}
            >
                <button title="Löschen" className={actionBtnClass('red.50', 'red.200', 'red.600')}>
                    <Trash2 size={14} />
                </button>
            </form>
        </div>
    );
}

export function CollectionsTable({ collections }: { collections: Collection[] }) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

    const filteredCollections = (() => {
        if (statusFilter === 'ALL') return collections;
        if (statusFilter === 'PUBLISHED') return collections.filter((c) => c.published);
        if (statusFilter === 'DRAFT') return collections.filter((c) => !c.published);
        if (statusFilter === 'PENDING')
            return collections.filter((c) => c.moderationStatus === 'PENDING');
        if (statusFilter === 'REJECTED')
            return collections.filter((c) => c.moderationStatus === 'REJECTED');
        return collections;
    })();

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data: filteredCollections,
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
                        placeholder="Sammlungen suchen..."
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
                    onChange={(e) => {
                        setStatusFilter(e.target.value as StatusFilter);
                        table.resetPageIndex();
                    }}
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
                    <option value="PUBLISHED">Veröffentlicht</option>
                    <option value="DRAFT">Entwurf</option>
                    <option value="PENDING">Prüfung ausstehend</option>
                    <option value="REJECTED">Abgelehnt</option>
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
                                    Keine Sammlungen gefunden.
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
                    {table.getFilteredRowModel().rows.length} von {filteredCollections.length}{' '}
                    Sammlungen
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
