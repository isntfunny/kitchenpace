'use client';

import { Role } from '@prisma/client';
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
import { ArrowUpDown, Search, Shield, Key } from 'lucide-react';
import { useState } from 'react';

import { css } from 'styled-system/css';

import { updateUserRole, toggleUserActive, sendPasswordReset } from './actions';

type User = {
    id: string;
    name: string;
    email: string;
    role: Role;
    isActive: boolean;
    createdAt: string;
    recipeCount: number;
};

const columns: ColumnDef<User>[] = [
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
            <div className={css({ display: 'flex', flexDirection: 'column', gap: '0.5' })}>
                <span className={css({ fontWeight: 'medium' })}>{row.original.name}</span>
                <span className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                    {row.original.email}
                </span>
            </div>
        ),
    },
    {
        accessorKey: 'role',
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
                    Rolle
                    <ArrowUpDown size={12} />
                </button>
            );
        },
        cell: ({ row }) => {
            const user = row.original;
            const isAdmin = user.role === 'ADMIN';

            return (
                <form
                    action={async () => {
                        const newRole = isAdmin ? Role.USER : Role.ADMIN;
                        await updateUserRole(user.id, newRole);
                    }}
                >
                    <button
                        className={css({
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '1',
                            paddingX: '2',
                            paddingY: '1',
                            borderRadius: 'full',
                            fontSize: 'xs',
                            fontWeight: 'medium',
                            cursor: 'pointer',
                            border: 'none',
                            transition: 'all 0.2s',
                        })}
                        style={{
                            backgroundColor: isAdmin
                                ? 'rgba(59, 130, 246, 0.15)'
                                : 'rgba(107, 114, 128, 0.15)',
                            color: isAdmin ? '#3b82f6' : '#6b7280',
                        }}
                    >
                        {isAdmin ? <Shield size={12} /> : null}
                        {isAdmin ? 'Admin' : 'Benutzer'}
                    </button>
                </form>
            );
        },
    },
    {
        accessorKey: 'isActive',
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
            const user = row.original;
            const isActive = user.isActive;

            return (
                <form
                    action={async () => {
                        await toggleUserActive(user.id, !isActive);
                    }}
                >
                    <button
                        className={css({
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '1',
                            paddingX: '2',
                            paddingY: '1',
                            borderRadius: 'full',
                            fontSize: 'xs',
                            fontWeight: 'medium',
                            cursor: 'pointer',
                            border: 'none',
                            transition: 'all 0.2s',
                        })}
                        style={{
                            backgroundColor: isActive
                                ? 'rgba(34, 197, 94, 0.15)'
                                : 'rgba(239, 68, 68, 0.15)',
                            color: isActive ? '#22c55e' : '#ef4444',
                        }}
                    >
                        {isActive ? 'Aktiv' : 'Inaktiv'}
                    </button>
                </form>
            );
        },
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
            const user = row.original;

            return (
                <div className={css({ display: 'flex', gap: '2' })}>
                    <form
                        action={async () => {
                            await sendPasswordReset(user.id);
                        }}
                    >
                        <button
                            title="Passwort zurücksetzen"
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
                                    background: 'surface.elevated',
                                    color: 'foreground',
                                },
                            })}
                        >
                            <Key size={14} />
                        </button>
                    </form>
                </div>
            );
        },
    },
];

export function AccountsTable({ users }: { users: User[] }) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');

    const table = useReactTable({
        data: users,
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
                        maxWidth: '400px',
                    })}
                >
                    <Search size={16} className={css({ color: 'foreground.muted' })} />
                    <input
                        type="text"
                        placeholder="Benutzer suchen..."
                        value={globalFilter}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                        className={css({
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            fontSize: 'sm',
                            color: 'foreground',
                            width: '100%',
                            '&::placeholder': {
                                color: 'foreground.muted',
                            },
                        })}
                    />
                </div>
                <span className={css({ fontSize: 'sm', color: 'foreground.muted' })}>
                    {table.getFilteredRowModel().rows.length} von {users.length} Benutzern
                </span>
            </div>

            <div
                className={css({
                    overflowX: 'auto',
                })}
            >
                <table
                    className={css({
                        width: '100%',
                        borderCollapse: 'collapse',
                    })}
                >
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
                                    Keine Benutzer gefunden.
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
                                        _hover: {
                                            background: 'surface',
                                        },
                                    })}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td
                                            key={cell.id}
                                            className={css({
                                                padding: '3',
                                                paddingLeft: '4',
                                            })}
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
