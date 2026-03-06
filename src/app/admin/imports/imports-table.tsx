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
import { ArrowUpDown, Search, X } from 'lucide-react';
import Link from 'next/link';
import { Dialog } from 'radix-ui';
import { useState } from 'react';
import { JsonView, allExpanded, defaultStyles } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';

import { css } from 'styled-system/css';

export interface ImportRunRow {
    id: string;
    createdAt: string;
    status: 'SUCCESS' | 'FALLBACK' | 'FAILED';
    sourceType: string;
    sourceUrl: string | null;
    markdownLength: number | null;
    model: string | null;
    inputTokens: number | null;
    cachedInputTokens: number | null;
    outputTokens: number | null;
    estimatedCostUsd: number | null;
    errorType: string | null;
    errorMessage: string | null;
    rawApiResponse: unknown;
    userName: string;
    userId: string;
    recipeId: string | null;
    recipeTitle: string | null;
    recipeStatus: string | null;
    recipeSlug: string | null;
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

function formatDateLong(iso: string) {
    return new Date(iso).toLocaleString('de-DE', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
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

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '0.25rem' })}>
            <span className={css({ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'muted', fontWeight: 600 })}>{label}</span>
            <div className={css({ fontSize: 'sm', color: 'text' })}>{children}</div>
        </div>
    );
}

function ImportDetailDialog({ run, open, onClose }: { run: ImportRunRow; open: boolean; onClose: () => void }) {
    return (
        <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay
                    className={css({
                        position: 'fixed', inset: 0,
                        background: 'rgba(0,0,0,0.55)',
                        zIndex: 50,
                    })}
                />
                <Dialog.Content
                    className={css({
                        position: 'fixed', top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 51,
                        background: 'surface.elevated',
                        borderRadius: 'xl',
                        borderWidth: '1px',
                        borderColor: 'border',
                        width: '90vw',
                        maxWidth: '860px',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                    })}
                >
                    {/* Header */}
                    <div className={css({
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '1.25rem 1.5rem',
                        borderBottomWidth: '1px', borderColor: 'border',
                        flexShrink: 0,
                    })}>
                        <div className={css({ display: 'flex', alignItems: 'center', gap: '1rem' })}>
                            <StatusBadge status={run.status} />
                            <span className={css({ fontSize: 'sm', color: 'muted', fontFamily: 'mono' })}>{run.id}</span>
                        </div>
                        <Dialog.Close asChild>
                            <button className={css({
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: '2rem', height: '2rem', borderRadius: 'md',
                                color: 'muted', cursor: 'pointer',
                                _hover: { background: 'surface.card', color: 'text' },
                            })}>
                                <X size={16} />
                            </button>
                        </Dialog.Close>
                    </div>

                    {/* Body */}
                    <div className={css({ overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' })}>
                        {/* Meta grid */}
                        <div className={css({ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' })}>
                            <DetailField label="Datum">{formatDateLong(run.createdAt)}</DetailField>
                            <DetailField label="Benutzer">{run.userName}</DetailField>
                            <DetailField label="Quellentyp">{run.sourceType}</DetailField>
                            <DetailField label="Modell">{run.model ?? '—'}</DetailField>
                            <DetailField label="Kosten">{formatCost(run.estimatedCostUsd)}</DetailField>
                            <DetailField label="Markdown-Länge">{run.markdownLength != null ? `${run.markdownLength.toLocaleString('de-DE')} Zeichen` : '—'}</DetailField>
                        </div>

                        {/* Tokens */}
                        <div className={css({ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' })}>
                            <DetailField label="Input-Tokens">{formatTokens(run.inputTokens)}</DetailField>
                            <DetailField label="Cached-Tokens">
                                <span className={css({ color: 'green.600', fontWeight: 500 })}>{formatTokens(run.cachedInputTokens)}</span>
                            </DetailField>
                            <DetailField label="Output-Tokens">{formatTokens(run.outputTokens)}</DetailField>
                        </div>

                        {/* Source URL */}
                        {run.sourceUrl && (
                            <DetailField label="Quell-URL">
                                <a
                                    href={run.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={css({ color: 'primary', textDecoration: 'underline', wordBreak: 'break-all' })}
                                >
                                    {run.sourceUrl}
                                </a>
                            </DetailField>
                        )}

                        {/* Recipe */}
                        {run.recipeId && (
                            <DetailField label="Erstelltes Rezept">
                                <div className={css({ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' })}>
                                    <Link
                                        href={run.recipeSlug ? `/recipe/${run.recipeSlug}` : `/recipe/${run.recipeId}/edit`}
                                        target="_blank"
                                        className={css({ color: 'primary', textDecoration: 'underline', fontWeight: 600 })}
                                    >
                                        {run.recipeTitle ?? run.recipeId}
                                    </Link>
                                    <span className={css({
                                        display: 'inline-flex', alignItems: 'center', paddingX: '0.75rem', paddingY: '0.25rem',
                                        borderRadius: 'sm', fontSize: '0.75rem', fontWeight: 600,
                                        background: run.recipeStatus === 'PUBLISHED' ? 'green-100' : 'amber-100',
                                        color: run.recipeStatus === 'PUBLISHED' ? 'green-800' : 'amber-800',
                                    })}>
                                        {run.recipeStatus === 'PUBLISHED' ? 'Veröffentlicht' : run.recipeStatus === 'ARCHIVED' ? 'Archiviert' : 'Entwurf'}
                                    </span>
                                    <Link
                                        href={`/recipe/${run.recipeId}/edit`}
                                        target="_blank"
                                        className={css({ fontSize: 'xs', color: 'muted', textDecoration: 'underline', _hover: { color: 'text' } })}
                                    >
                                        Bearbeiten →
                                    </Link>
                                </div>
                            </DetailField>
                        )}

                        {/* Error */}
                        {(run.errorType || run.errorMessage) && (
                            <div className={css({ borderRadius: 'md', borderWidth: '1px', borderColor: 'red.200', background: 'red-50', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' })}>
                                <span className={css({ fontSize: '0.75rem', fontWeight: 700, color: 'red.700', textTransform: 'uppercase', letterSpacing: '0.05em' })}>Fehler</span>
                                {run.errorType && <span className={css({ fontSize: 'sm', fontWeight: 600, color: 'red.800', fontFamily: 'mono' })}>{run.errorType}</span>}
                                {run.errorMessage && <span className={css({ fontSize: 'sm', color: 'red.700' })}>{run.errorMessage}</span>}
                            </div>
                        )}

                        {/* Raw API Response */}
                        <div>
                            <span className={css({ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'muted', fontWeight: 600 })}>
                                Raw API Response
                            </span>
                            <div className={css({
                                marginTop: '0.5rem',
                                borderRadius: 'md',
                                borderWidth: '1px',
                                borderColor: 'border',
                                overflow: 'auto',
                                maxHeight: '400px',
                                fontSize: '0.8rem',
                                fontFamily: 'mono',
                                '& .json-view': { background: 'surface.card !important', padding: '1rem' },
                            })}>
                                {run.rawApiResponse != null ? (
                                    <JsonView
                                        data={run.rawApiResponse as object}
                                        shouldExpandNode={allExpanded}
                                        style={defaultStyles}
                                    />
                                ) : (
                                    <div className={css({ padding: '1rem', color: 'muted', fontSize: 'sm' })}>Keine Daten vorhanden</div>
                                )}
                            </div>
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

function buildColumns(): ColumnDef<ImportRunRow>[] {
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
                    onClick={(e) => e.stopPropagation()}
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
                        onClick={(e) => e.stopPropagation()}
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
                row.original.recipeId ? (
                    <div
                        className={css({ display: 'flex', flexDirection: 'column', gap: '0.375rem' })}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Link
                            href={row.original.recipeSlug ? `/recipe/${row.original.recipeSlug}` : `/recipe/${row.original.recipeId}/edit`}
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
    ];
}

const columns = buildColumns();

export function ImportsTable({ runs }: { runs: ImportRunRow[] }) {
    const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'FALLBACK' | 'FAILED'>('ALL');
    const [selectedRun, setSelectedRun] = useState<ImportRunRow | null>(null);

    const filtered = statusFilter === 'ALL' ? runs : runs.filter((r) => r.status === statusFilter);

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
        <>
            {selectedRun && (
                <ImportDetailDialog
                    run={selectedRun}
                    open={!!selectedRun}
                    onClose={() => setSelectedRun(null)}
                />
            )}

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
                                        onClick={() => setSelectedRun(row.original)}
                                        className={css({
                                            borderBottomWidth: '1px',
                                            borderColor: 'border',
                                            transition: 'background 0.15s',
                                            cursor: 'pointer',
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
        </>
    );
}
