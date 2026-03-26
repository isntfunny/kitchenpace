'use client';

import {
    type ColumnDef,
    type SortingState,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { Check, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useMemo, useState, useTransition } from 'react';

import { css } from 'styled-system/css';

import { createCategory, deleteCategory, updateCategory } from './actions';
import { DeleteButton, SimpleTable, SortHeader, TableToolbar } from './ingredient-shared';
import {
    type IngredientCategory,
    btnPrimary,
    btnSecondary,
    closeButtonStyle,
    dialogContentSmallStyle,
    inputStyle,
    inputStyleObj,
    overlayStyle,
} from './ingredient-types';

// ---------------------------------------------------------------------------
// CategoriesSection (collapsible card)
// ---------------------------------------------------------------------------

export function CategoriesSection({ categories }: { categories: IngredientCategory[] }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div
            className={css({
                borderRadius: '2xl',
                borderWidth: '1px',
                borderColor: 'border.muted',
                bg: 'surface',
                overflow: 'hidden',
            })}
        >
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={css({
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4',
                    bg: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'foreground',
                    _hover: { bg: 'surface.muted' },
                })}
            >
                <div className={css({ display: 'flex', alignItems: 'center', gap: '2' })}>
                    <span className={css({ fontSize: 'sm', fontWeight: '600' })}>
                        Zutatenkategorien
                    </span>
                    <span
                        className={css({
                            fontSize: 'xs',
                            paddingX: '2',
                            paddingY: '0.5',
                            borderRadius: 'full',
                            bg: 'accent.soft',
                            color: 'foreground.muted',
                            fontWeight: '600',
                        })}
                    >
                        {categories.length}
                    </span>
                </div>
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {isOpen && <CategoriesTabInner categories={categories} />}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Inner table content
// ---------------------------------------------------------------------------

function CategoriesTabInner({ categories }: { categories: IngredientCategory[] }) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [editingCategory, setEditingCategory] = useState<IngredientCategory | null>(null);
    const [showAdd, setShowAdd] = useState(false);

    const columns = useMemo<ColumnDef<IngredientCategory>[]>(
        () => [
            {
                accessorKey: 'name',
                header: ({ column }) => <SortHeader column={column} label="Name" />,
                cell: ({ row }) => (
                    <span
                        className={css({
                            fontWeight: '600',
                            fontSize: 'sm',
                            color: 'foreground',
                        })}
                    >
                        {row.original.name}
                    </span>
                ),
            },
            {
                accessorKey: 'slug',
                header: 'Slug',
                cell: ({ row }) => (
                    <span
                        className={css({
                            fontSize: 'sm',
                            color: 'foreground.muted',
                            fontFamily: 'mono',
                        })}
                    >
                        {row.original.slug}
                    </span>
                ),
            },
            {
                accessorKey: 'sortOrder',
                header: ({ column }) => <SortHeader column={column} label="Sortierung" />,
                cell: ({ row }) => (
                    <span
                        className={css({
                            fontSize: 'sm',
                            color: 'foreground.muted',
                            fontVariantNumeric: 'tabular-nums',
                        })}
                    >
                        {row.original.sortOrder}
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
                            await deleteCategory(row.original.id);
                        }}
                        disabled={row.original._count.ingredients > 0}
                        title={
                            row.original._count.ingredients > 0
                                ? 'Kategorie hat noch Zutaten'
                                : 'Kategorie loeschen'
                        }
                    />
                ),
                size: 50,
            },
        ],
        [],
    );

    const table = useReactTable({
        data: categories,
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
                searchPlaceholder="Kategorie suchen..."
                filter={globalFilter}
                onFilterChange={setGlobalFilter}
                onAdd={() => setShowAdd(!showAdd)}
            />

            {showAdd && <AddCategoryForm onClose={() => setShowAdd(false)} />}

            <SimpleTable
                table={table}
                columns={columns}
                onRowClick={(row) => setEditingCategory(row)}
                emptyMessage="Keine Kategorien gefunden."
            />

            {/* Edit dialog */}
            <Dialog.Root
                open={!!editingCategory}
                onOpenChange={(open) => {
                    if (!open) setEditingCategory(null);
                }}
            >
                <Dialog.Portal>
                    <Dialog.Overlay className={overlayStyle} />
                    <Dialog.Content className={dialogContentSmallStyle}>
                        {editingCategory && (
                            <CategoryEditPanel
                                category={editingCategory}
                                onClose={() => setEditingCategory(null)}
                            />
                        )}
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </div>
    );
}

// ---------------------------------------------------------------------------
// CategoryEditPanel
// ---------------------------------------------------------------------------

function CategoryEditPanel({
    category,
    onClose,
}: {
    category: IngredientCategory;
    onClose: () => void;
}) {
    const [name, setName] = useState(category.name);
    const [sortOrder, setSortOrder] = useState(category.sortOrder);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState('');

    const handleSave = () => {
        setError('');
        startTransition(async () => {
            try {
                await updateCategory(category.id, { name: name.trim(), sortOrder });
                onClose();
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Fehler');
            }
        });
    };

    return (
        <div className={css({ padding: '6', display: 'flex', flexDirection: 'column', gap: '4' })}>
            <div
                className={css({
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                })}
            >
                <div>
                    <Dialog.Title
                        className={css({
                            fontSize: 'lg',
                            fontWeight: '700',
                            fontFamily: 'heading',
                            color: 'foreground',
                        })}
                    >
                        Kategorie bearbeiten
                    </Dialog.Title>
                    <p
                        className={css({
                            fontSize: 'sm',
                            color: 'foreground.muted',
                            marginTop: '0.5',
                        })}
                    >
                        {category.name}
                    </p>
                </div>
                <Dialog.Close asChild>
                    <button type="button" className={closeButtonStyle}>
                        <X size={18} />
                    </button>
                </Dialog.Close>
            </div>

            <div className={css({ display: 'grid', gridTemplateColumns: '1fr auto', gap: '3' })}>
                <div>
                    <label
                        className={css({
                            fontSize: 'xs',
                            color: 'foreground.muted',
                            display: 'block',
                            marginBottom: '1',
                            fontWeight: '500',
                        })}
                    >
                        Name
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={inputStyle}
                    />
                </div>
                <div>
                    <label
                        className={css({
                            fontSize: 'xs',
                            color: 'foreground.muted',
                            display: 'block',
                            marginBottom: '1',
                            fontWeight: '500',
                        })}
                    >
                        Sortierung
                    </label>
                    <input
                        type="number"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                        className={inputStyle}
                        style={{ width: 100 }}
                    />
                </div>
            </div>

            {error && (
                <div
                    className={css({
                        padding: '3',
                        borderRadius: 'lg',
                        bg: 'error.bg',
                        color: 'error.text',
                        fontSize: 'sm',
                        fontWeight: '500',
                    })}
                >
                    {error}
                </div>
            )}

            <div
                className={css({
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '2',
                    paddingTop: '2',
                    borderTop: '1px solid',
                    borderColor: 'border.muted',
                })}
            >
                <button type="button" onClick={onClose} className={btnSecondary}>
                    Abbrechen
                </button>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={isPending || !name.trim()}
                    className={btnPrimary}
                >
                    {isPending ? 'Speichern...' : 'Speichern'}
                </button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// AddCategoryForm
// ---------------------------------------------------------------------------

function AddCategoryForm({ onClose }: { onClose: () => void }) {
    const [name, setName] = useState('');
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (!name.trim()) return;
        setError('');
        startTransition(async () => {
            try {
                await createCategory({ name: name.trim() });
                onClose();
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Fehler');
            }
        });
    };

    return (
        <div
            className={css({
                padding: '4',
                borderBottom: '1px solid',
                borderColor: 'border.muted',
                bg: { base: 'rgba(224,123,83,0.04)', _dark: 'rgba(224,123,83,0.06)' },
                display: 'flex',
                alignItems: 'center',
                gap: '3',
            })}
        >
            <div
                className={css({
                    width: '3px',
                    height: '24px',
                    borderRadius: 'full',
                    bg: 'brand.primary',
                    flexShrink: '0',
                })}
            />
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSubmit();
                    }
                    if (e.key === 'Escape') onClose();
                }}
                placeholder="Neuer Kategoriename..."
                autoFocus
                className={css({ flex: '1', ...inputStyleObj })}
            />
            {error && (
                <span className={css({ fontSize: 'xs', color: 'error.text', fontWeight: '500' })}>
                    {error}
                </span>
            )}
            <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || !name.trim()}
                className={btnPrimary}
            >
                <Check size={14} />
            </button>
            <button type="button" onClick={onClose} className={btnSecondary}>
                <X size={14} />
            </button>
        </div>
    );
}
