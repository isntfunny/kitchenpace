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
import { ArrowUpDown, Search, Plus, Trash2, Pencil, X, ExternalLink } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useState } from 'react';

import { PALETTE, PALETTE_LABELS, type PaletteColor } from '@app/lib/palette';

import { css } from 'styled-system/css';

import { createCategory, updateCategory, deleteCategory, type CategoryFormData } from './actions';

export type Category = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    color: PaletteColor;
    icon: string | null;
    sortOrder: number;
    recipeCount: number;
};

const INPUT_CLASS = css({
    width: '100%',
    paddingX: '3',
    paddingY: '2',
    borderRadius: 'lg',
    borderWidth: '1px',
    borderColor: 'border.muted',
    background: 'surface.elevated',
    fontSize: 'sm',
    color: 'foreground',
    outline: 'none',
    '&::placeholder': { color: 'foreground.muted' },
});

const LABEL_CLASS = css({
    fontSize: 'xs',
    fontWeight: '500',
    color: 'foreground.muted',
    marginBottom: '1',
    display: 'block',
});

function CategoryDialog({
    category,
    open,
    onClose,
}: {
    category: Category | null;
    open: boolean;
    onClose: () => void;
}) {
    const isEdit = category !== null;
    const [name, setName] = useState(category?.name ?? '');
    const [description, setDescription] = useState(category?.description ?? '');
    const [color, setColor] = useState<PaletteColor>(category?.color ?? 'orange');
    const [icon, setIcon] = useState(category?.icon ?? '');
    const [sortOrder, setSortOrder] = useState(String(category?.sortOrder ?? 0));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        setError('');
        setSaving(true);
        const data: CategoryFormData = {
            name,
            description,
            color,
            icon,
            sortOrder: parseInt(sortOrder, 10) || 0,
        };
        try {
            if (isEdit) {
                await updateCategory(category.id, data);
            } else {
                await createCategory(data);
            }
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay
                    className={css({
                        position: 'fixed',
                        inset: 0,
                        background: 'surface.overlay',
                        zIndex: 50,
                        backdropFilter: 'blur(2px)',
                    })}
                />
                <Dialog.Content
                    className={css({
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 51,
                        background: 'surface.elevated',
                        borderRadius: '2xl',
                        borderWidth: '1px',
                        borderColor: 'border.muted',
                        padding: '6',
                        width: 'min(480px, 95vw)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4',
                        boxShadow: 'shadow.large',
                    })}
                >
                    <div
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        })}
                    >
                        <Dialog.Title
                            className={css({
                                fontSize: 'lg',
                                fontWeight: 'semibold',
                                color: 'foreground',
                            })}
                        >
                            {isEdit ? 'Kategorie bearbeiten' : 'Neue Kategorie'}
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <button
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
                                    _hover: { background: 'surface.elevated' },
                                })}
                            >
                                <X size={14} />
                            </button>
                        </Dialog.Close>
                    </div>

                    <div className={css({ display: 'flex', flexDirection: 'column', gap: '3' })}>
                        <div>
                            <label className={LABEL_CLASS}>Name *</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Kategoriename"
                                className={INPUT_CLASS}
                            />
                        </div>

                        <div>
                            <label className={LABEL_CLASS}>Beschreibung</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Kurze Beschreibung"
                                rows={2}
                                className={css({
                                    width: '100%',
                                    paddingX: '3',
                                    paddingY: '2',
                                    borderRadius: 'lg',
                                    borderWidth: '1px',
                                    borderColor: 'border.muted',
                                    background: 'surface.elevated',
                                    fontSize: 'sm',
                                    color: 'foreground',
                                    outline: 'none',
                                    resize: 'vertical',
                                    fontFamily: 'inherit',
                                    '&::placeholder': { color: 'foreground.muted' },
                                })}
                            />
                        </div>

                        <div
                            className={css({
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '3',
                            })}
                        >
                            <div>
                                <label className={LABEL_CLASS}>Farbe</label>
                                <div
                                    className={css({
                                        display: 'flex',
                                        gap: '2',
                                        alignItems: 'center',
                                    })}
                                >
                                    <span
                                        className={css({
                                            width: '9',
                                            height: '9',
                                            borderRadius: 'md',
                                            border: '1px solid',
                                            borderColor: 'border.muted',
                                            flexShrink: 0,
                                        })}
                                        style={{ background: PALETTE[color] }}
                                    />
                                    <select
                                        value={color}
                                        onChange={(e) => setColor(e.target.value as PaletteColor)}
                                        className={INPUT_CLASS}
                                    >
                                        {(Object.keys(PALETTE) as PaletteColor[]).map((key) => (
                                            <option key={key} value={key}>
                                                {PALETTE_LABELS[key]}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className={LABEL_CLASS}>
                                    Icon-Name{' '}
                                    <a
                                        href="https://lucide.dev/icons/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={css({
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.5',
                                            color: 'primary',
                                            textDecoration: 'none',
                                            _hover: { textDecoration: 'underline' },
                                        })}
                                    >
                                        lucide.dev
                                        <ExternalLink size={10} />
                                    </a>
                                </label>
                                <input
                                    type="text"
                                    value={icon}
                                    onChange={(e) => setIcon(e.target.value)}
                                    placeholder="z.B. UtensilsCrossed"
                                    className={INPUT_CLASS}
                                />
                            </div>
                        </div>

                        <div>
                            <label className={LABEL_CLASS}>Sortierung</label>
                            <input
                                type="number"
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value)}
                                min={0}
                                className={INPUT_CLASS}
                            />
                        </div>

                        {error && (
                            <p className={css({ fontSize: 'sm', color: 'red.600' })}>{error}</p>
                        )}
                    </div>

                    <div className={css({ display: 'flex', justifyContent: 'flex-end', gap: '2' })}>
                        <Dialog.Close asChild>
                            <button
                                className={css({
                                    paddingX: '4',
                                    paddingY: '2',
                                    borderRadius: 'lg',
                                    borderWidth: '1px',
                                    borderColor: 'border.muted',
                                    background: 'surface',
                                    fontSize: 'sm',
                                    cursor: 'pointer',
                                    color: 'foreground.muted',
                                    _hover: { background: 'surface.elevated' },
                                })}
                            >
                                Abbrechen
                            </button>
                        </Dialog.Close>
                        <button
                            onClick={handleSave}
                            disabled={saving || !name.trim()}
                            className={css({
                                paddingX: '4',
                                paddingY: '2',
                                borderRadius: 'lg',
                                background: 'primary',
                                fontSize: 'sm',
                                fontWeight: 'medium',
                                cursor: 'pointer',
                                color: 'white',
                                opacity: saving || !name.trim() ? 0.6 : 1,
                            })}
                        >
                            {saving ? 'Speichern...' : 'Speichern'}
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

const getColumns = (onEdit: (cat: Category) => void): ColumnDef<Category>[] => [
    {
        accessorKey: 'name',
        header: ({ column }) => (
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
        ),
        cell: ({ row }) => {
            const cat = row.original;
            return (
                <div className={css({ display: 'flex', alignItems: 'center', gap: '2' })}>
                    {cat.color && (
                        <span
                            style={{ background: PALETTE[cat.color] }}
                            className={css({
                                width: '3',
                                height: '3',
                                borderRadius: 'full',
                                flexShrink: 0,
                                display: 'inline-block',
                            })}
                        />
                    )}
                    <span className={css({ fontWeight: 'medium' })}>{cat.name}</span>
                </div>
            );
        },
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
        accessorKey: 'icon',
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
                Icon
            </span>
        ),
        cell: ({ row }) => (
            <span className={css({ fontSize: 'sm', color: 'foreground.muted' })}>
                {row.original.icon ?? '—'}
            </span>
        ),
    },
    {
        accessorKey: 'sortOrder',
        header: ({ column }) => (
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
                Reihenfolge
                <ArrowUpDown size={12} />
            </button>
        ),
        cell: ({ row }) => (
            <span className={css({ fontSize: 'sm' })}>{row.original.sortOrder}</span>
        ),
    },
    {
        accessorKey: 'recipeCount',
        header: ({ column }) => (
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
        ),
        cell: ({ row }) => (
            <span className={css({ fontSize: 'sm' })}>{row.original.recipeCount}</span>
        ),
    },
    {
        id: 'actions',
        cell: ({ row }) => {
            const cat = row.original;
            return (
                <div className={css({ display: 'flex', gap: '2' })}>
                    <button
                        onClick={() => onEdit(cat)}
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
                        <Pencil size={13} />
                    </button>
                    <form
                        action={async () => {
                            if (confirm(`"${cat.name}" wirklich löschen?`)) {
                                try {
                                    await deleteCategory(cat.id);
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

export function CategoriesTable({ categories }: { categories: Category[] }) {
    const [sorting, setSorting] = useState<SortingState>([{ id: 'sortOrder', desc: false }]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    const columns = getColumns((cat) => {
        setEditingCategory(cat);
        setDialogOpen(true);
    });

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data: categories,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        state: { sorting, globalFilter },
        initialState: { pagination: { pageSize: 20 } },
    });

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setEditingCategory(null);
    };

    return (
        <>
            <CategoryDialog
                key={editingCategory?.id ?? 'new'}
                category={editingCategory}
                open={dialogOpen}
                onClose={handleCloseDialog}
            />

            <div
                className={css({
                    borderRadius: '2xl',
                    borderWidth: '1px',
                    borderColor: 'border.muted',
                    background: 'surface.elevated',
                    overflow: 'hidden',
                })}
            >
                {/* Toolbar */}
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
                            placeholder="Kategorien suchen..."
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
                        onClick={() => {
                            setEditingCategory(null);
                            setDialogOpen(true);
                        }}
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
                        Neu erstellen
                    </button>
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
                                        Keine Kategorien gefunden.
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
                                            cursor: 'pointer',
                                            _hover: { background: 'surface' },
                                        })}
                                        onClick={() => {
                                            setEditingCategory(row.original);
                                            setDialogOpen(true);
                                        }}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <td
                                                key={cell.id}
                                                className={css({ padding: '3', paddingLeft: '4' })}
                                                onClick={
                                                    cell.column.id === 'actions'
                                                        ? (e) => e.stopPropagation()
                                                        : undefined
                                                }
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

                {/* Pagination */}
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
        </>
    );
}
