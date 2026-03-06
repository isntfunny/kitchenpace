'use client';

import {
    type Column,
    type ColumnDef,
    type SortingState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { ArrowUpDown, Search } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { css } from 'styled-system/css';

import { reassignRecipe } from './actions';

export interface ImportRunRow {
    id: string;
    createdAt: string;
    status: 'SUCCESS' | 'FALLBACK' | 'FAILED';
    sourceType: string;
    sourceUrl: string | null;
    model: string | null;
    inputTokens: number | null;
    cachedInputTokens: number | null;
    outputTokens: number | null;
    estimatedCostUsd: number | null;
    errorType: string | null;
    errorMessage: string | null;
    userName: string;
    userId: string;
    recipeId: string | null;
    recipeTitle: string | null;
    recipeStatus: string | null;
    recipeSlug: string | null;
}

interface User {
    id: string;
    name: string;
}

function StatusBadge({ status }: { status: ImportRunRow['status'] }) {
    const styles: Record<string, string> = {
        SUCCESS: css({ display: 'inline-flex', alignItems: 'center', px: '0.75rem', py: '0.5rem', borderRadius: 'sm', fontSize: '0.75rem', fontWeight: 600, background: 'green-100', color: 'green-800' }),
        FALLBACK: css({ display: 'inline-flex', alignItems: 'center', px: '0.75rem', py: '0.5rem', borderRadius: 'sm', fontSize: '0.75rem', fontWeight: 600, background: 'amber-100', color: 'amber-800' }),
        FAILED: css({ display: 'inline-flex', alignItems: 'center', px: '0.75rem', py: '0.5rem', borderRadius: 'sm', fontSize: '0.75rem', fontWeight: 600, background: 'red-100', color: 'red-800' }),
    };
    const labels: Record<string, string> = { SUCCESS: 'Erfolg', FALLBACK: 'Fallback', FAILED: 'Fehler' };
    return <span className={styles[status]}>{labels[status]}</span>;
}

function formatCost(usd: number | null) {
    if (usd == null) return '—';
    if (usd < 0.001) return `$${(usd * 1000).toFixed(2)}m`;
    return `$${usd.toFixed(4)}`;
}

function formatTokens(n: number | null) {
    if (n == null) return '—';
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleString('de-DE', {
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit',
    });
}

function SortHeader({ label, column }: { label: string; column: Column<ImportRunRow> }) {
    return (
        <button
            className={css({ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600, fontSize: 'sm', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'muted', cursor: 'pointer', _hover: { color: 'text' } })}
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
            {label}
            <ArrowUpDown size={14} />
        </button>
    );
}

function ReassignCell({ run, users }: { run: ImportRunRow; users: User[] }) {
    const [open, setOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!run.recipeId) {
        return <span className={css({ color: 'muted', fontSize: 'sm' })}>—</span>;
    }

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className={css({ fontSize: '0.75rem', color: 'muted', borderWidth: '1px', borderColor: 'border', borderRadius: 'md', paddingX: '0.75rem', paddingY: '0.5rem', cursor: 'pointer', background: 'surface.card', _hover: { color: 'text', borderColor: 'muted' } })}
            >
                Zuweisen
            </button>
        );
    }

    async function handleReassign() {
        if (!selectedUserId || !run.recipeId) return;
        setLoading(true);
        setError('');
        try {
            await reassignRecipe(run.recipeId, selectedUserId);
            setOpen(false);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Fehler');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '160px' })}>
            <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className={css({ fontSize: '0.75rem', borderWidth: '1px', borderColor: 'border', borderRadius: 'md', paddingX: '0.75rem', paddingY: '0.5rem', background: 'surface.card', color: 'text', outline: 'none', cursor: 'pointer' })}
            >
                <option value="">Benutzer wählen…</option>
                {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                ))}
            </select>
            <div className={css({ display: 'flex', gap: '0.5rem' })}>
                <button
                    disabled={!selectedUserId || loading}
                    onClick={handleReassign}
                    className={css({ fontSize: '0.75rem', background: 'primary', color: 'white', borderRadius: 'md', paddingX: '0.75rem', paddingY: '0.5rem', cursor: 'pointer', fontWeight: 500, _disabled: { opacity: 0.5, cursor: 'not-allowed' }, _hover: { background: 'primary' } })}
                >
                    {loading ? '…' : 'Speichern'}
                </button>
                <button
                    onClick={() => setOpen(false)}
                    className={css({ fontSize: '0.75rem', color: 'muted', borderWidth: '1px', borderColor: 'border', borderRadius: 'md', paddingX: '0.75rem', paddingY: '0.5rem', cursor: 'pointer', background: 'surface.card' })}
                >
                    Abbrechen
                </button>
            </div>
            {error && <span className={css({ fontSize: '0.75rem', color: 'red.600' })}>{error}</span>}
        </div>
    );
}

function buildColumns(users: User[]): ColumnDef<ImportRunRow>[] {
    return [
        {
            accessorKey: 'createdAt',
            header: ({ column }) => <SortHeader label="Datum" column={column} />,
            cell: ({ row }) => (
                <span className={css({ fontSize: 'sm', color: 'muted', whiteSpace: 'nowrap' })}>
                    {formatDate(row.original.createdAt)}
                </span>
            ),
        },
        {
            accessorKey: 'status',
            header: ({ column }) => <SortHeader label="Status" column={column} />,
            cell: ({ row }) => (
                <div className={css({ display: 'flex', flexDirection: 'column', gap: '0.375rem' })}>
                    <StatusBadge status={row.original.status} />
                    {row.original.errorType && (
                        <span
                            className={css({ fontSize: '0.75rem', color: 'muted' })}
                            title={row.original.errorMessage ?? ''}
                        >
                            {row.original.errorType}
                        </span>
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'userName',
            header: ({ column }) => <SortHeader label="Benutzer" column={column} />,
            cell: ({ row }) => (
                <Link
                    href={`/admin/users/${row.original.userId}`}
                    className={css({ fontSize: 'base', fontWeight: 600, color: 'text', textDecoration: 'none', _hover: { color: 'primary' } })}
                >
                    {row.original.userName}
                </Link>
            ),
        },
        {
            accessorKey: 'sourceUrl',
            header: ({ column }) => <SortHeader label="Quelle" column={column} />,
            cell: ({ row }) =>
                row.original.sourceUrl ? (
                    <a
                        href={row.original.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={css({ color: 'muted', fontSize: 'sm', textDecoration: 'underline', _hover: { color: 'text' }, display: 'block', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}
                        title={row.original.sourceUrl}
                    >
                        {(() => { try { return new URL(row.original.sourceUrl!).hostname; } catch { return row.original.sourceUrl; } })()}
                    </a>
                ) : (
                    <span className={css({ color: 'muted', fontSize: 'sm' })}>Text</span>
                ),
        },
        {
            accessorKey: 'model',
            header: ({ column }) => <SortHeader label="Modell" column={column} />,
            cell: ({ row }) => (
                <span className={css({ fontSize: 'sm', color: 'muted', whiteSpace: 'nowrap' })}>
                    {row.original.model ?? '—'}
                </span>
            ),
        },
        {
            accessorKey: 'inputTokens',
            header: ({ column }) => <SortHeader label="Tokens in/cached/out" column={column} />,
            cell: ({ row }) => (
                <span className={css({ fontSize: 'sm', color: 'muted', whiteSpace: 'nowrap' })}>
                    {formatTokens(row.original.inputTokens)} /{' '}
                    <span className={css({ color: 'green.600', fontWeight: 500 })}>{formatTokens(row.original.cachedInputTokens)}</span> /{' '}
                    {formatTokens(row.original.outputTokens)}
                </span>
            ),
        },
        {
            accessorKey: 'estimatedCostUsd',
            header: ({ column }) => <SortHeader label="Kosten" column={column} />,
            cell: ({ row }) => (
                <span className={css({ fontSize: 'sm', fontWeight: 600, color: 'text' })}>
                    {formatCost(row.original.estimatedCostUsd)}
                </span>
            ),
        },
        {
            accessorKey: 'recipeTitle',
            header: ({ column }) => <SortHeader label="Rezept" column={column} />,
            cell: ({ row }) =>
                row.original.recipeId && row.original.recipeSlug ? (
                    <div className={css({ display: 'flex', flexDirection: 'column', gap: '0.375rem' })}>
                        <Link
                            href={`/recipe/${row.original.recipeSlug}`}
                            target="_blank"
                            className={css({ fontSize: 'base', fontWeight: 600, color: 'text', textDecoration: 'none', _hover: { color: 'primary' }, maxWidth: '200px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}
                            title={row.original.recipeTitle ?? ''}
                        >
                            {row.original.recipeTitle ?? row.original.recipeId}
                        </Link>
                        <span
                            className={css({
                                display: 'inline-flex', alignItems: 'center', paddingX: '0.75rem', paddingY: '0.5rem',
                                borderRadius: 'sm', fontSize: '0.75rem', fontWeight: 600,
                                background: row.original.recipeStatus === 'PUBLISHED' ? 'green-100' : 'amber-100',
                                color: row.original.recipeStatus === 'PUBLISHED' ? 'green-800' : 'amber-800',
                            })}
                        >
                            {row.original.recipeStatus === 'PUBLISHED' ? 'Veröffentlicht' : row.original.recipeStatus === 'ARCHIVED' ? 'Archiviert' : 'Entwurf'}
                        </span>
                    </div>
                ) : (
                    <span className={css({ color: 'muted', fontSize: 'sm' })}>—</span>
                ),
        },
        {
            id: 'reassign',
            header: ({ column }) => <SortHeader label="Zuweisen" column={column as Parameters<typeof SortHeader>[0]['column']} />,
            cell: ({ row }) => <ReassignCell run={row.original} users={users} />,
        },
    ];
}

export function ImportsTable({ runs, users }: { runs: ImportRunRow[]; users: User[] }) {
    const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'FALLBACK' | 'FAILED'>('ALL');

    const filtered = statusFilter === 'ALL' ? runs : runs.filter((r) => r.status === statusFilter);

    const columns = buildColumns(users);

    const table = useReactTable({
        data: filtered,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        state: { sorting, globalFilter },
        initialState: { pagination: { pageSize: 25 } },
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
            {/* Toolbar */}
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
                        placeholder="Import-Läufe suchen…"
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
                    onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
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
                    <option value="SUCCESS">Erfolg</option>
                    <option value="FALLBACK">Fallback</option>
                    <option value="FAILED">Fehler</option>
                </select>
            </div>

            {/* Table */}
            <div className={css({ overflowX: 'auto' })}>
                <table className={css({ width: '100%', borderCollapse: 'collapse' })}>
                    <thead>
                        {table.getHeaderGroups().map((hg) => (
                            <tr key={hg.id} className={css({ borderBottomWidth: '1px', borderColor: 'border' })}>
                                {hg.headers.map((h) => (
                                    <th key={h.id} className={css({ padding: '1.25rem 1.5rem', textAlign: 'left', background: 'surface.card' })}>
                                        {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
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
                                    className={css({ padding: '3rem 1.5rem', textAlign: 'center', color: 'muted' })}
                                >
                                    Keine Import-Läufe gefunden.
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
                                        <td key={cell.id} className={css({ padding: '1.25rem 1.5rem', verticalAlign: 'top' })}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer / Pagination */}
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
                    {table.getFilteredRowModel().rows.length} von {filtered.length} Einträgen
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
