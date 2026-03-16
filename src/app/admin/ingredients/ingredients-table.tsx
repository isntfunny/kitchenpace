'use client';

import {
    type ColumnDef,
    type SortingState,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    useReactTable,
    flexRender,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowUpDown, Search, Plus, Trash2, GitMerge, X, Check } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useRef, useState, useMemo, useTransition } from 'react';

import { css } from 'styled-system/css';

import {
    createIngredient,
    updateIngredient,
    updateIngredientUnits,
    deleteIngredient,
    mergeIngredients,
    createCategory,
    updateCategory,
    deleteCategory,
    createUnit,
    updateUnit,
    deleteUnit,
} from './actions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Ingredient = {
    id: string;
    name: string;
    slug: string;
    pluralName: string | null;
    categories: Array<{ id: string; name: string; slug: string }>;
    ingredientUnits: Array<{
        grams: number | null;
        unit: { id: string; shortName: string; longName: string };
    }>;
    aliases: string[];
    needsReview: boolean;
    energyKcal: number | null;
    protein: number | null;
    fat: number | null;
    carbs: number | null;
    fiber: number | null;
    sugar: number | null;
    sodium: number | null;
    saturatedFat: number | null;
    recipeCount: number;
};

type IngredientCategory = {
    id: string;
    name: string;
    slug: string;
    sortOrder: number;
    _count: { ingredients: number };
};

type Unit = {
    id: string;
    shortName: string;
    longName: string;
    gramsDefault: number | null;
    _count: { ingredients: number };
};

type TabId = 'ingredients' | 'categories' | 'units';

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const overlayStyle = css({
    position: 'fixed',
    inset: '0',
    bg: 'surface.overlay',
    zIndex: '50',
    animation: 'fadeIn 0.15s ease-out',
});

const dialogBaseStyle = {
    position: 'fixed' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    bg: 'surface',
    borderRadius: 'xl',
    width: '90vw',
    zIndex: '51',
    boxShadow: 'shadow.large',
    animation: 'slideUp 0.2s ease-out',
    display: 'flex',
    flexDirection: 'column' as const,
};

const dialogContentStyle = css({
    ...dialogBaseStyle,
    maxWidth: '680px',
    maxHeight: '85vh',
});

const dialogContentSmallStyle = css({
    ...dialogBaseStyle,
    maxWidth: '420px',
    maxHeight: '85vh',
});

const inputStyle = css({
    width: '100%',
    paddingX: '3',
    paddingY: '2',
    borderRadius: 'lg',
    border: '1px solid',
    borderColor: 'border',
    bg: 'surface.elevated',
    fontSize: 'sm',
    color: 'foreground',
    outline: 'none',
    transition: 'all 0.15s',
    _focus: {
        borderColor: 'brand.primary',
        boxShadow: {
            base: '0 0 0 3px rgba(224,123,83,0.12)',
            _dark: '0 0 0 3px rgba(224,123,83,0.2)',
        },
    },
});

const inputSmallStyle = css({
    width: '100%',
    paddingX: '2.5',
    paddingY: '1.5',
    borderRadius: 'lg',
    border: '1px solid',
    borderColor: 'border',
    bg: 'surface.elevated',
    fontSize: 'sm',
    color: 'foreground',
    outline: 'none',
    transition: 'all 0.15s',
    _focus: {
        borderColor: 'brand.primary',
        boxShadow: {
            base: '0 0 0 3px rgba(224,123,83,0.12)',
            _dark: '0 0 0 3px rgba(224,123,83,0.2)',
        },
    },
});

const btnPrimary = css({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1.5',
    paddingX: '4',
    paddingY: '2',
    borderRadius: 'lg',
    bg: 'brand.primary',
    color: 'white',
    fontSize: 'sm',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s',
    _hover: { bg: 'button.primary-hover' },
    _disabled: { opacity: '0.5', cursor: 'not-allowed' },
});

const btnSecondary = css({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1.5',
    paddingX: '4',
    paddingY: '2',
    borderRadius: 'lg',
    bg: 'transparent',
    color: 'foreground',
    fontSize: 'sm',
    fontWeight: '500',
    border: '1px solid',
    borderColor: 'border',
    cursor: 'pointer',
    transition: 'all 0.15s',
    _hover: { bg: 'button.secondary-hover' },
});

const btnDanger = css({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1.5',
    paddingX: '3',
    paddingY: '2',
    borderRadius: 'lg',
    bg: 'transparent',
    color: 'status.danger',
    fontSize: 'sm',
    fontWeight: '600',
    border: '1px solid',
    borderColor: 'status.danger',
    cursor: 'pointer',
    transition: 'all 0.15s',
    _hover: {
        bg: 'error.bg',
    },
    _disabled: { opacity: '0.5', cursor: 'not-allowed' },
});

const pillStyle = css({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '1',
    paddingX: '2',
    paddingY: '0.5',
    borderRadius: 'full',
    fontSize: 'xs',
    fontWeight: '500',
    bg: 'accent.soft',
    color: 'foreground',
    whiteSpace: 'nowrap',
});

const tagStyle = css({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '1',
    paddingX: '2.5',
    paddingY: '1',
    borderRadius: 'full',
    fontSize: 'xs',
    bg: 'surface.elevated',
    border: '1px solid',
    borderColor: 'border',
    color: 'foreground',
});

const sectionLabelStyle = css({
    fontSize: 'xs',
    fontWeight: '700',
    color: 'foreground.muted',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '2.5',
});

const thStyle = css({
    padding: '3',
    paddingX: '4',
    textAlign: 'left',
    fontSize: 'xs',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'foreground.muted',
    bg: 'surface',
    position: 'sticky',
    top: '0',
    zIndex: '1',
});

const closeButtonStyle = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '8',
    height: '8',
    borderRadius: 'lg',
    border: 'none',
    bg: 'transparent',
    cursor: 'pointer',
    color: 'foreground.muted',
    transition: 'all 0.15s',
    _hover: {
        bg: 'button.secondary-hover',
        color: 'foreground',
    },
});

const inputStyleObj = {
    paddingX: '3',
    paddingY: '2',
    borderRadius: 'lg',
    border: '1px solid',
    borderColor: 'border',
    bg: 'surface.elevated',
    fontSize: 'sm',
    color: 'foreground',
    outline: 'none',
} as const;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface IngredientsTableProps {
    ingredients: Ingredient[];
    categories: IngredientCategory[];
    units: Unit[];
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function IngredientsTable({ ingredients, categories, units }: IngredientsTableProps) {
    const [activeTab, setActiveTab] = useState<TabId>('ingredients');

    const tabs: Array<{ id: TabId; label: string; count: number }> = [
        { id: 'ingredients', label: 'Zutaten', count: ingredients.length },
        { id: 'categories', label: 'Kategorien', count: categories.length },
        { id: 'units', label: 'Einheiten', count: units.length },
    ];

    return (
        <div
            className={css({
                borderRadius: '2xl',
                border: '1px solid',
                borderColor: 'border',
                bg: 'surface',
                overflow: 'hidden',
                boxShadow: 'shadow.small',
            })}
        >
            {/* Tab bar */}
            <div
                className={css({
                    display: 'flex',
                    borderBottom: '1px solid',
                    borderColor: 'border.muted',
                    paddingX: '2',
                    bg: 'surface',
                })}
            >
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={css({
                            position: 'relative',
                            paddingX: '5',
                            paddingY: '3.5',
                            fontSize: 'sm',
                            fontWeight: activeTab === tab.id ? '600' : '500',
                            bg: 'transparent',
                            border: 'none',
                            borderBottom: '2px solid',
                            borderBottomColor:
                                activeTab === tab.id ? 'brand.primary' : 'transparent',
                            color: activeTab === tab.id ? 'foreground' : 'foreground.muted',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            _hover: { color: 'foreground' },
                        })}
                    >
                        {tab.label}
                        <span
                            className={css({
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginLeft: '2',
                                paddingX: '1.5',
                                paddingY: '0.5',
                                borderRadius: 'full',
                                fontSize: '2xs',
                                fontWeight: '600',
                                bg: activeTab === tab.id ? 'accent.soft' : 'surface.muted',
                                color: activeTab === tab.id ? 'brand.primary' : 'foreground.muted',
                                minWidth: '5',
                                transition: 'all 0.2s ease',
                            })}
                        >
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {activeTab === 'ingredients' && (
                <IngredientsTab
                    ingredients={ingredients}
                    allCategories={categories}
                    allUnits={units}
                />
            )}
            {activeTab === 'categories' && <CategoriesTab categories={categories} />}
            {activeTab === 'units' && <UnitsTab units={units} />}
        </div>
    );
}

// ===========================================================================
// INGREDIENTS TAB
// ===========================================================================

function IngredientsTab({
    ingredients,
    allCategories,
    allUnits,
}: {
    ingredients: Ingredient[];
    allCategories: IngredientCategory[];
    allUnits: Unit[];
}) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
    const [showAdd, setShowAdd] = useState(false);
    const [showMerge, setShowMerge] = useState(false);

    const columns = useMemo<ColumnDef<Ingredient>[]>(
        () => [
            {
                accessorKey: 'name',
                header: ({ column }) => <SortHeader column={column} label="Name" />,
                cell: ({ row }) => (
                    <div>
                        <span
                            className={css({
                                fontWeight: '600',
                                color: 'foreground',
                                fontSize: 'sm',
                            })}
                        >
                            {row.original.name}
                        </span>
                        {row.original.aliases.length > 0 && (
                            <p
                                className={css({
                                    fontSize: 'xs',
                                    color: 'foreground.muted',
                                    marginTop: '0.5',
                                    lineClamp: '1',
                                })}
                            >
                                {row.original.aliases.join(', ')}
                            </p>
                        )}
                    </div>
                ),
                filterFn: (row, _columnId, filterValue: string) => {
                    const val = filterValue.toLowerCase();
                    return (
                        row.original.name.toLowerCase().includes(val) ||
                        row.original.aliases.some((a) => a.toLowerCase().includes(val))
                    );
                },
            },
            {
                accessorKey: 'categories',
                header: 'Kategorien',
                cell: ({ row }) => (
                    <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '1' })}>
                        {row.original.categories.map((c) => (
                            <span key={c.id} className={pillStyle}>
                                {c.name}
                            </span>
                        ))}
                        {row.original.categories.length === 0 && (
                            <span className={css({ fontSize: 'sm', color: 'foreground.muted' })}>
                                -
                            </span>
                        )}
                    </div>
                ),
                enableSorting: false,
            },
            {
                accessorKey: 'ingredientUnits',
                header: 'Einheiten',
                cell: ({ row }) => (
                    <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '1' })}>
                        {row.original.ingredientUnits.map((iu) => (
                            <span key={iu.unit.id} className={pillStyle}>
                                {iu.unit.shortName}
                                {iu.grams != null && (
                                    <span
                                        className={css({
                                            fontSize: '2xs',
                                            color: 'foreground.muted',
                                            fontWeight: '400',
                                        })}
                                    >
                                        {iu.grams}g
                                    </span>
                                )}
                            </span>
                        ))}
                        {row.original.ingredientUnits.length === 0 && (
                            <span className={css({ fontSize: 'sm', color: 'foreground.muted' })}>
                                -
                            </span>
                        )}
                    </div>
                ),
                enableSorting: false,
            },
            {
                accessorKey: 'energyKcal',
                header: ({ column }) => <SortHeader column={column} label="kcal/100g" />,
                cell: ({ row }) => (
                    <span
                        className={css({
                            fontSize: 'sm',
                            color: 'foreground.muted',
                            fontVariantNumeric: 'tabular-nums',
                            display: 'block',
                            textAlign: 'right',
                        })}
                    >
                        {row.original.energyKcal ?? '-'}
                    </span>
                ),
            },
            {
                accessorKey: 'recipeCount',
                header: ({ column }) => <SortHeader column={column} label="Rezepte" />,
                cell: ({ row }) => (
                    <span
                        className={css({
                            fontSize: 'sm',
                            color: 'foreground.muted',
                            fontVariantNumeric: 'tabular-nums',
                            display: 'block',
                            textAlign: 'right',
                        })}
                    >
                        {row.original.recipeCount}
                    </span>
                ),
            },
        ],
        [],
    );

    const table = useReactTable({
        data: ingredients,
        columns,
        state: { sorting, globalFilter },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        globalFilterFn: (row, _columnId, filterValue: string) => {
            const val = filterValue.toLowerCase();
            return (
                row.original.name.toLowerCase().includes(val) ||
                row.original.aliases.some((a) => a.toLowerCase().includes(val))
            );
        },
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    });

    const { rows } = table.getRowModel();
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const rowVirtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => tableContainerRef.current,
        estimateSize: () => 52,
        overscan: 20,
    });

    return (
        <div>
            {/* Toolbar */}
            <div
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2',
                    padding: '4',
                    borderBottom: '1px solid',
                    borderColor: 'border.muted',
                })}
            >
                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        flex: '1',
                        gap: '2',
                        borderRadius: 'lg',
                        border: '1px solid',
                        borderColor: 'border',
                        bg: 'surface.elevated',
                        paddingX: '3',
                        paddingY: '2',
                        transition: 'all 0.15s',
                        _focusWithin: {
                            borderColor: 'brand.primary',
                            boxShadow: {
                                base: '0 0 0 3px rgba(224,123,83,0.12)',
                                _dark: '0 0 0 3px rgba(224,123,83,0.2)',
                            },
                        },
                    })}
                >
                    <Search
                        size={15}
                        className={css({ color: 'foreground.muted', flexShrink: '0' })}
                    />
                    <input
                        type="text"
                        placeholder="Zutat suchen..."
                        value={globalFilter}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                        className={css({
                            flex: '1',
                            bg: 'transparent',
                            border: 'none',
                            outline: 'none',
                            fontSize: 'sm',
                            color: 'foreground',
                        })}
                    />
                    {globalFilter && (
                        <button
                            type="button"
                            onClick={() => setGlobalFilter('')}
                            className={css({
                                bg: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'foreground.muted',
                                display: 'flex',
                                padding: '0.5',
                                borderRadius: 'md',
                                _hover: { color: 'foreground', bg: 'surface.muted' },
                            })}
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
                <button
                    type="button"
                    onClick={() => setShowMerge(true)}
                    className={btnSecondary}
                    title="Zutaten zusammenfuehren"
                >
                    <GitMerge size={14} />
                </button>
                <button
                    type="button"
                    onClick={() => setShowAdd(!showAdd)}
                    className={btnPrimary}
                    title="Neue Zutat"
                >
                    <Plus size={14} />
                </button>
            </div>

            {/* Add form */}
            {showAdd && <AddIngredientForm onClose={() => setShowAdd(false)} />}

            {/* Merge modal */}
            {showMerge && (
                <MergeModal ingredients={ingredients} onClose={() => setShowMerge(false)} />
            )}

            {/* Virtualized table */}
            <div
                ref={tableContainerRef}
                className={css({ overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' })}
            >
                <table className={css({ width: '100%', borderCollapse: 'collapse' })}>
                    <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr
                                key={headerGroup.id}
                                className={css({
                                    borderBottom: '1px solid',
                                    borderColor: 'border.muted',
                                })}
                            >
                                {headerGroup.headers.map((header) => (
                                    <th key={header.id} className={thStyle}>
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
                        {rows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className={css({
                                        padding: '12',
                                        textAlign: 'center',
                                        color: 'foreground.muted',
                                        fontSize: 'sm',
                                    })}
                                >
                                    Keine Zutaten gefunden.
                                </td>
                            </tr>
                        ) : (
                            <>
                                {rowVirtualizer.getVirtualItems().length > 0 && (
                                    <tr
                                        style={{
                                            height: rowVirtualizer.getVirtualItems()[0].start,
                                        }}
                                    />
                                )}
                                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                    const row = rows[virtualRow.index];
                                    return (
                                        <tr
                                            key={row.id}
                                            data-index={virtualRow.index}
                                            ref={rowVirtualizer.measureElement}
                                            onClick={() => setEditingIngredient(row.original)}
                                            className={css({
                                                borderBottom: '1px solid',
                                                borderColor: 'border.muted',
                                                cursor: 'pointer',
                                                transition: 'background 0.1s ease',
                                                bg: row.original.needsReview
                                                    ? {
                                                          base: 'rgba(245,158,11,0.06)',
                                                          _dark: 'rgba(245,158,11,0.08)',
                                                      }
                                                    : virtualRow.index % 2 === 1
                                                      ? 'surface.muted'
                                                      : 'transparent',
                                                borderLeft: row.original.needsReview
                                                    ? '3px solid'
                                                    : '3px solid transparent',
                                                borderLeftColor: row.original.needsReview
                                                    ? 'status.warning'
                                                    : 'transparent',
                                                _hover: {
                                                    bg: {
                                                        base: 'rgba(224,123,83,0.06)',
                                                        _dark: 'rgba(224,123,83,0.08)',
                                                    },
                                                },
                                            })}
                                        >
                                            {row.getVisibleCells().map((cell) => (
                                                <td
                                                    key={cell.id}
                                                    className={css({
                                                        padding: '3',
                                                        paddingX: '4',
                                                        verticalAlign: 'middle',
                                                    })}
                                                >
                                                    {flexRender(
                                                        cell.column.columnDef.cell,
                                                        cell.getContext(),
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                                {rowVirtualizer.getVirtualItems().length > 0 && (
                                    <tr
                                        style={{
                                            height:
                                                rowVirtualizer.getTotalSize() -
                                                (rowVirtualizer.getVirtualItems().at(-1)?.end ?? 0),
                                        }}
                                    />
                                )}
                            </>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Row count */}
            <div
                className={css({
                    padding: '3',
                    paddingX: '4',
                    borderTop: '1px solid',
                    borderColor: 'border.muted',
                    display: 'flex',
                    justifyContent: 'center',
                })}
            >
                <span className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                    {rows.length} Zutaten
                </span>
            </div>

            {/* Edit dialog */}
            <Dialog.Root
                open={!!editingIngredient}
                onOpenChange={(open) => {
                    if (!open) setEditingIngredient(null);
                }}
            >
                <Dialog.Portal>
                    <Dialog.Overlay className={overlayStyle} />
                    <Dialog.Content className={dialogContentStyle}>
                        {editingIngredient && (
                            <IngredientEditPanel
                                ingredient={editingIngredient}
                                allCategories={allCategories}
                                allUnits={allUnits}
                                onClose={() => setEditingIngredient(null)}
                            />
                        )}
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Ingredient edit panel
// ---------------------------------------------------------------------------

function IngredientEditPanel({
    ingredient,
    allCategories,
    allUnits,
    onClose,
}: {
    ingredient: Ingredient;
    allCategories: IngredientCategory[];
    allUnits: Unit[];
    onClose: () => void;
}) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState('');

    // Basic fields
    const [name, setName] = useState(ingredient.name);
    const [pluralName, setPluralName] = useState(ingredient.pluralName ?? '');

    // Aliases
    const [aliases, setAliases] = useState<string[]>(ingredient.aliases);
    const [newAlias, setNewAlias] = useState('');

    // Categories
    const [selectedCatIds, setSelectedCatIds] = useState<Set<string>>(
        new Set(ingredient.categories.map((c) => c.id)),
    );

    // Units with gram overrides
    const [selectedUnits, setSelectedUnits] = useState<Map<string, number | null>>(
        new Map(ingredient.ingredientUnits.map((iu) => [iu.unit.id, iu.grams])),
    );

    // Nutrition
    const [nutrition, setNutrition] = useState({
        energyKcal: ingredient.energyKcal,
        protein: ingredient.protein,
        fat: ingredient.fat,
        carbs: ingredient.carbs,
        fiber: ingredient.fiber,
        sugar: ingredient.sugar,
        sodium: ingredient.sodium,
        saturatedFat: ingredient.saturatedFat,
    });

    const handleAddAlias = () => {
        const trimmed = newAlias.trim().toLowerCase();
        if (trimmed && !aliases.includes(trimmed)) {
            setAliases([...aliases, trimmed]);
            setNewAlias('');
        }
    };

    const toggleCategory = (catId: string) => {
        setSelectedCatIds((prev) => {
            const next = new Set(prev);
            if (next.has(catId)) next.delete(catId);
            else next.add(catId);
            return next;
        });
    };

    const toggleUnit = (unitId: string) => {
        setSelectedUnits((prev) => {
            const next = new Map(prev);
            if (next.has(unitId)) next.delete(unitId);
            else next.set(unitId, null);
            return next;
        });
    };

    const setUnitGrams = (unitId: string, grams: number | null) => {
        setSelectedUnits((prev) => {
            const next = new Map(prev);
            next.set(unitId, grams);
            return next;
        });
    };

    const updateNutritionField = (field: keyof typeof nutrition, value: string) => {
        setNutrition((prev) => ({
            ...prev,
            [field]: value === '' ? null : parseFloat(value),
        }));
    };

    const handleSave = () => {
        setError('');
        startTransition(async () => {
            try {
                await updateIngredient(ingredient.id, {
                    name,
                    pluralName: pluralName.trim() || null,
                    aliases,
                    categoryIds: Array.from(selectedCatIds),
                    ...nutrition,
                });
                await updateIngredientUnits(
                    ingredient.id,
                    Array.from(selectedUnits.entries()).map(([unitId, grams]) => ({
                        unitId,
                        grams,
                    })),
                );
                onClose();
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
            }
        });
    };

    const handleDelete = () => {
        if (!confirm(`"${ingredient.name}" wirklich loeschen?`)) return;
        startTransition(async () => {
            try {
                await deleteIngredient(ingredient.id);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Fehler beim Loeschen');
            }
        });
    };

    const nutritionFields: Array<{ key: keyof typeof nutrition; label: string }> = [
        { key: 'energyKcal', label: 'kcal' },
        { key: 'protein', label: 'Protein (g)' },
        { key: 'fat', label: 'Fett (g)' },
        { key: 'carbs', label: 'Kohlenhydrate (g)' },
        { key: 'fiber', label: 'Ballaststoffe (g)' },
        { key: 'sugar', label: 'Zucker (g)' },
        { key: 'sodium', label: 'Natrium (mg)' },
        { key: 'saturatedFat', label: 'Ges. Fett (g)' },
    ];

    return (
        <>
            {/* Header */}
            <div
                className={css({
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    padding: '6',
                    paddingBottom: '4',
                    borderBottom: '1px solid',
                    borderColor: 'border.muted',
                    flexShrink: '0',
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
                        Zutat bearbeiten
                    </Dialog.Title>
                    <p
                        className={css({
                            fontSize: 'sm',
                            color: 'foreground.muted',
                            marginTop: '0.5',
                        })}
                    >
                        {ingredient.name}
                        {ingredient.needsReview && (
                            <span
                                className={css({
                                    marginLeft: '2',
                                    paddingX: '2',
                                    paddingY: '0.5',
                                    borderRadius: 'full',
                                    fontSize: 'xs',
                                    fontWeight: '600',
                                    bg: {
                                        base: 'rgba(245,158,11,0.12)',
                                        _dark: 'rgba(245,158,11,0.15)',
                                    },
                                    color: 'status.warning',
                                })}
                            >
                                Review
                            </span>
                        )}
                    </p>
                </div>
                <Dialog.Close asChild>
                    <button type="button" className={closeButtonStyle}>
                        <X size={18} />
                    </button>
                </Dialog.Close>
            </div>

            {/* Scrollable content */}
            <div
                className={css({
                    padding: '6',
                    overflowY: 'auto',
                    flex: '1',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5',
                })}
            >
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

                {/* Section: Allgemein */}
                <div>
                    <p className={sectionLabelStyle}>Allgemein</p>
                    <div
                        className={css({
                            display: 'grid',
                            gridTemplateColumns: { base: '1fr', md: '1fr 1fr' },
                            gap: '3',
                        })}
                    >
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
                                Pluralname
                            </label>
                            <input
                                type="text"
                                value={pluralName}
                                onChange={(e) => setPluralName(e.target.value)}
                                className={inputStyle}
                                placeholder="z.B. Tomaten"
                            />
                        </div>
                    </div>
                </div>

                {/* Section: Aliase */}
                <div>
                    <p className={sectionLabelStyle}>Aliase</p>
                    <div
                        className={css({
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '1.5',
                            marginBottom: '2.5',
                        })}
                    >
                        {aliases.map((alias) => (
                            <span key={alias} className={tagStyle}>
                                {alias}
                                <button
                                    type="button"
                                    onClick={() => setAliases(aliases.filter((a) => a !== alias))}
                                    className={css({
                                        display: 'flex',
                                        bg: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'foreground.muted',
                                        padding: '0',
                                        borderRadius: 'full',
                                        transition: 'color 0.1s',
                                        _hover: { color: 'status.danger' },
                                    })}
                                >
                                    <X size={12} />
                                </button>
                            </span>
                        ))}
                        {aliases.length === 0 && (
                            <span className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                                Keine Aliase
                            </span>
                        )}
                    </div>
                    <div className={css({ display: 'flex', gap: '2', maxWidth: '320px' })}>
                        <input
                            type="text"
                            value={newAlias}
                            onChange={(e) => setNewAlias(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddAlias();
                                }
                            }}
                            placeholder="Neuer Alias..."
                            className={inputStyle}
                        />
                        <button type="button" onClick={handleAddAlias} className={btnSecondary}>
                            <Plus size={14} />
                        </button>
                    </div>
                </div>

                {/* Section: Kategorien */}
                <div>
                    <p className={sectionLabelStyle}>Kategorien</p>
                    <div
                        className={css({
                            display: 'grid',
                            gridTemplateColumns: { base: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                            gap: '1',
                        })}
                    >
                        {allCategories.map((cat) => (
                            <label
                                key={cat.id}
                                className={css({
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '2',
                                    fontSize: 'sm',
                                    color: 'foreground',
                                    cursor: 'pointer',
                                    paddingX: '2',
                                    paddingY: '1.5',
                                    borderRadius: 'lg',
                                    transition: 'background 0.1s',
                                    _hover: { bg: 'surface.muted' },
                                })}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedCatIds.has(cat.id)}
                                    onChange={() => toggleCategory(cat.id)}
                                    className={css({ accentColor: 'brand.primary' })}
                                />
                                {cat.name}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Section: Einheiten */}
                <div>
                    <p className={sectionLabelStyle}>Einheiten</p>
                    <div className={css({ display: 'flex', flexDirection: 'column', gap: '1' })}>
                        {allUnits.map((unit) => {
                            const isChecked = selectedUnits.has(unit.id);
                            const gramsValue = selectedUnits.get(unit.id);
                            return (
                                <div
                                    key={unit.id}
                                    className={css({
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3',
                                        paddingX: '2',
                                        paddingY: '1.5',
                                        borderRadius: 'lg',
                                        transition: 'background 0.1s',
                                        bg: isChecked ? 'accent.soft' : 'transparent',
                                        _hover: { bg: isChecked ? 'accent.soft' : 'surface.muted' },
                                    })}
                                >
                                    <label
                                        className={css({
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '2',
                                            fontSize: 'sm',
                                            color: 'foreground',
                                            cursor: 'pointer',
                                            minWidth: '160px',
                                        })}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => toggleUnit(unit.id)}
                                            className={css({ accentColor: 'brand.primary' })}
                                        />
                                        <span
                                            className={css({
                                                fontWeight: isChecked ? '600' : '400',
                                            })}
                                        >
                                            {unit.shortName}
                                        </span>
                                        <span
                                            className={css({
                                                color: 'foreground.muted',
                                                fontSize: 'xs',
                                            })}
                                        >
                                            ({unit.longName})
                                        </span>
                                    </label>
                                    {isChecked && (
                                        <input
                                            type="number"
                                            value={gramsValue ?? ''}
                                            onChange={(e) =>
                                                setUnitGrams(
                                                    unit.id,
                                                    e.target.value === ''
                                                        ? null
                                                        : parseFloat(e.target.value),
                                                )
                                            }
                                            placeholder={
                                                unit.gramsDefault != null
                                                    ? `Standard: ${unit.gramsDefault}g`
                                                    : 'Gramm'
                                            }
                                            className={css({
                                                width: '150px',
                                                paddingX: '2.5',
                                                paddingY: '1.5',
                                                borderRadius: 'lg',
                                                border: '1px solid',
                                                borderColor: 'border',
                                                bg: 'surface',
                                                fontSize: 'sm',
                                                color: 'foreground',
                                                outline: 'none',
                                                transition: 'all 0.15s',
                                                _focus: {
                                                    borderColor: 'brand.primary',
                                                    boxShadow: {
                                                        base: '0 0 0 3px rgba(224,123,83,0.12)',
                                                        _dark: '0 0 0 3px rgba(224,123,83,0.2)',
                                                    },
                                                },
                                            })}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Section: Naehrwerte */}
                <div>
                    <p className={sectionLabelStyle}>Naehrwerte pro 100g</p>
                    <div
                        className={css({
                            display: 'grid',
                            gridTemplateColumns: { base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                            gap: '3',
                        })}
                    >
                        {nutritionFields.map((nf) => (
                            <div key={nf.key}>
                                <label
                                    className={css({
                                        fontSize: 'xs',
                                        color: 'foreground.muted',
                                        display: 'block',
                                        marginBottom: '1',
                                        fontWeight: '500',
                                    })}
                                >
                                    {nf.label}
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={nutrition[nf.key] ?? ''}
                                    onChange={(e) => updateNutritionField(nf.key, e.target.value)}
                                    className={inputSmallStyle}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div
                className={css({
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '4',
                    paddingX: '6',
                    borderTop: '1px solid',
                    borderColor: 'border.muted',
                    bg: 'surface',
                    flexShrink: '0',
                })}
            >
                <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isPending}
                    className={btnDanger}
                >
                    <Trash2 size={14} /> Loeschen
                </button>
                <div className={css({ display: 'flex', gap: '2' })}>
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
        </>
    );
}

// ---------------------------------------------------------------------------
// Add ingredient form
// ---------------------------------------------------------------------------

function AddIngredientForm({ onClose }: { onClose: () => void }) {
    const [name, setName] = useState('');
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (!name.trim()) return;
        setError('');
        startTransition(async () => {
            try {
                await createIngredient({ name: name.trim() });
                onClose();
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
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
                placeholder="Neuer Zutatname..."
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

// ---------------------------------------------------------------------------
// Merge modal (Radix Dialog)
// ---------------------------------------------------------------------------

function MergeModal({ ingredients, onClose }: { ingredients: Ingredient[]; onClose: () => void }) {
    const [sourceId, setSourceId] = useState('');
    const [targetId, setTargetId] = useState('');
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState('');

    const sorted = useMemo(
        () => [...ingredients].sort((a, b) => a.name.localeCompare(b.name)),
        [ingredients],
    );

    const handleMerge = () => {
        if (!sourceId || !targetId) return;
        setError('');
        startTransition(async () => {
            try {
                await mergeIngredients(sourceId, targetId);
                onClose();
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Fehler beim Zusammenfuehren');
            }
        });
    };

    return (
        <Dialog.Root
            open
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <Dialog.Portal>
                <Dialog.Overlay className={overlayStyle} />
                <Dialog.Content className={dialogContentSmallStyle}>
                    <div
                        className={css({
                            padding: '6',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4',
                        })}
                    >
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
                                    Zutaten zusammenfuehren
                                </Dialog.Title>
                                <p
                                    className={css({
                                        fontSize: 'sm',
                                        color: 'foreground.muted',
                                        marginTop: '1',
                                    })}
                                >
                                    Die Quellzutat wird in die Zielzutat ueberfuehrt. Alle Rezepte
                                    werden aktualisiert.
                                </p>
                            </div>
                            <Dialog.Close asChild>
                                <button type="button" className={closeButtonStyle}>
                                    <X size={18} />
                                </button>
                            </Dialog.Close>
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

                        <div>
                            <label className={sectionLabelStyle}>Quelle (wird geloescht)</label>
                            <select
                                value={sourceId}
                                onChange={(e) => setSourceId(e.target.value)}
                                className={inputStyle}
                            >
                                <option value="">Zutat waehlen...</option>
                                {sorted.map((ing) => (
                                    <option
                                        key={ing.id}
                                        value={ing.id}
                                        disabled={ing.id === targetId}
                                    >
                                        {ing.name} ({ing.recipeCount} Rezepte)
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className={sectionLabelStyle}>Ziel (bleibt erhalten)</label>
                            <select
                                value={targetId}
                                onChange={(e) => setTargetId(e.target.value)}
                                className={inputStyle}
                            >
                                <option value="">Zutat waehlen...</option>
                                {sorted.map((ing) => (
                                    <option
                                        key={ing.id}
                                        value={ing.id}
                                        disabled={ing.id === sourceId}
                                    >
                                        {ing.name} ({ing.recipeCount} Rezepte)
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div
                            className={css({
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '2',
                                paddingTop: '2',
                            })}
                        >
                            <Dialog.Close asChild>
                                <button type="button" className={btnSecondary}>
                                    Abbrechen
                                </button>
                            </Dialog.Close>
                            <button
                                type="button"
                                onClick={handleMerge}
                                disabled={
                                    isPending || !sourceId || !targetId || sourceId === targetId
                                }
                                className={btnPrimary}
                            >
                                {isPending ? 'Zusammenfuehren...' : 'Zusammenfuehren'}
                            </button>
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

// ===========================================================================
// CATEGORIES TAB
// ===========================================================================

function CategoriesTab({ categories }: { categories: IngredientCategory[] }) {
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

// ===========================================================================
// UNITS TAB
// ===========================================================================

function UnitsTab({ units }: { units: Unit[] }) {
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

function UnitEditPanel({ unit, onClose }: { unit: Unit; onClose: () => void }) {
    const [shortName, setShortName] = useState(unit.shortName);
    const [longName, setLongName] = useState(unit.longName);
    const [gramsDefault, setGramsDefault] = useState<string>(
        unit.gramsDefault != null ? String(unit.gramsDefault) : '',
    );
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState('');

    const handleSave = () => {
        setError('');
        startTransition(async () => {
            try {
                await updateUnit(unit.id, {
                    shortName: shortName.trim(),
                    longName: longName.trim(),
                    gramsDefault: gramsDefault === '' ? null : parseFloat(gramsDefault),
                });
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
                        Einheit bearbeiten
                    </Dialog.Title>
                    <p
                        className={css({
                            fontSize: 'sm',
                            color: 'foreground.muted',
                            marginTop: '0.5',
                        })}
                    >
                        {unit.shortName} ({unit.longName})
                    </p>
                </div>
                <Dialog.Close asChild>
                    <button type="button" className={closeButtonStyle}>
                        <X size={18} />
                    </button>
                </Dialog.Close>
            </div>

            <div
                className={css({
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr auto',
                    gap: '3',
                })}
            >
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
                        Kurzname
                    </label>
                    <input
                        type="text"
                        value={shortName}
                        onChange={(e) => setShortName(e.target.value)}
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
                        Langname
                    </label>
                    <input
                        type="text"
                        value={longName}
                        onChange={(e) => setLongName(e.target.value)}
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
                        Gramm
                    </label>
                    <input
                        type="number"
                        value={gramsDefault}
                        onChange={(e) => setGramsDefault(e.target.value)}
                        placeholder="-"
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
                    disabled={isPending || !shortName.trim() || !longName.trim()}
                    className={btnPrimary}
                >
                    {isPending ? 'Speichern...' : 'Speichern'}
                </button>
            </div>
        </div>
    );
}

function AddUnitForm({ onClose }: { onClose: () => void }) {
    const [shortName, setShortName] = useState('');
    const [longName, setLongName] = useState('');
    const [gramsDefault, setGramsDefault] = useState('');
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (!shortName.trim() || !longName.trim()) return;
        setError('');
        startTransition(async () => {
            try {
                await createUnit({
                    shortName: shortName.trim(),
                    longName: longName.trim(),
                    gramsDefault: gramsDefault === '' ? null : parseFloat(gramsDefault),
                });
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
                alignItems: 'flex-end',
                gap: '3',
            })}
        >
            <div
                className={css({
                    width: '3px',
                    alignSelf: 'stretch',
                    borderRadius: 'full',
                    bg: 'brand.primary',
                    flexShrink: '0',
                })}
            />
            <div className={css({ flex: '1' })}>
                <label
                    className={css({
                        fontSize: 'xs',
                        color: 'foreground.muted',
                        display: 'block',
                        marginBottom: '1',
                        fontWeight: '500',
                    })}
                >
                    Kurzname
                </label>
                <input
                    type="text"
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSubmit();
                        }
                        if (e.key === 'Escape') onClose();
                    }}
                    placeholder="z.B. EL"
                    autoFocus
                    className={inputStyle}
                />
            </div>
            <div className={css({ flex: '1' })}>
                <label
                    className={css({
                        fontSize: 'xs',
                        color: 'foreground.muted',
                        display: 'block',
                        marginBottom: '1',
                        fontWeight: '500',
                    })}
                >
                    Langname
                </label>
                <input
                    type="text"
                    value={longName}
                    onChange={(e) => setLongName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSubmit();
                        }
                    }}
                    placeholder="z.B. Essloeffel"
                    className={inputStyle}
                />
            </div>
            <div className={css({ width: '140px' })}>
                <label
                    className={css({
                        fontSize: 'xs',
                        color: 'foreground.muted',
                        display: 'block',
                        marginBottom: '1',
                        fontWeight: '500',
                    })}
                >
                    Gramm
                </label>
                <input
                    type="number"
                    value={gramsDefault}
                    onChange={(e) => setGramsDefault(e.target.value)}
                    placeholder="-"
                    className={inputStyle}
                />
            </div>
            {error && (
                <span className={css({ fontSize: 'xs', color: 'error.text', fontWeight: '500' })}>
                    {error}
                </span>
            )}
            <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || !shortName.trim() || !longName.trim()}
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

// ===========================================================================
// Shared small components
// ===========================================================================

/** Reusable sort header button */
function SortHeader({ column, label }: { column: { toggleSorting: () => void }; label: string }) {
    return (
        <button
            type="button"
            onClick={() => column.toggleSorting()}
            className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '1',
                bg: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: 'xs',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'foreground.muted',
                _hover: { color: 'foreground' },
                transition: 'color 0.15s',
            })}
        >
            {label} <ArrowUpDown size={12} />
        </button>
    );
}

/** Shared toolbar for search + add */
function TableToolbar({
    searchPlaceholder,
    filter,
    onFilterChange,
    onAdd,
}: {
    searchPlaceholder: string;
    filter: string;
    onFilterChange: (v: string) => void;
    onAdd: () => void;
}) {
    return (
        <div
            className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '2',
                padding: '4',
                borderBottom: '1px solid',
                borderColor: 'border.muted',
            })}
        >
            <div
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    flex: '1',
                    gap: '2',
                    borderRadius: 'lg',
                    border: '1px solid',
                    borderColor: 'border',
                    bg: 'surface.elevated',
                    paddingX: '3',
                    paddingY: '2',
                    transition: 'all 0.15s',
                    _focusWithin: {
                        borderColor: 'brand.primary',
                        boxShadow: {
                            base: '0 0 0 3px rgba(224,123,83,0.12)',
                            _dark: '0 0 0 3px rgba(224,123,83,0.2)',
                        },
                    },
                })}
            >
                <Search size={15} className={css({ color: 'foreground.muted', flexShrink: '0' })} />
                <input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={filter}
                    onChange={(e) => onFilterChange(e.target.value)}
                    className={css({
                        flex: '1',
                        bg: 'transparent',
                        border: 'none',
                        outline: 'none',
                        fontSize: 'sm',
                        color: 'foreground',
                    })}
                />
                {filter && (
                    <button
                        type="button"
                        onClick={() => onFilterChange('')}
                        className={css({
                            bg: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'foreground.muted',
                            display: 'flex',
                            padding: '0.5',
                            borderRadius: 'md',
                            _hover: { color: 'foreground', bg: 'surface.muted' },
                        })}
                    >
                        <X size={14} />
                    </button>
                )}
            </div>
            <button type="button" onClick={onAdd} className={btnPrimary} title="Hinzufuegen">
                <Plus size={14} />
            </button>
        </div>
    );
}

/** Reusable simple table for categories/units */
function SimpleTable<T>({
    table,
    columns,
    onRowClick,
    emptyMessage,
}: {
    table: ReturnType<typeof useReactTable<T>>;
    columns: ColumnDef<T>[];
    onRowClick: (row: T) => void;
    emptyMessage: string;
}) {
    return (
        <div className={css({ overflowX: 'auto' })}>
            <table className={css({ width: '100%', borderCollapse: 'collapse' })}>
                <thead>
                    {table.getHeaderGroups().map((hg) => (
                        <tr
                            key={hg.id}
                            className={css({
                                borderBottom: '1px solid',
                                borderColor: 'border.muted',
                            })}
                        >
                            {hg.headers.map((header) => (
                                <th key={header.id} className={thStyle}>
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
                    {table.getRowModel().rows.map((row, idx) => (
                        <tr
                            key={row.id}
                            onClick={() => onRowClick(row.original)}
                            className={css({
                                borderBottom: '1px solid',
                                borderColor: 'border.muted',
                                cursor: 'pointer',
                                transition: 'background 0.1s ease',
                                bg: idx % 2 === 1 ? 'surface.muted' : 'transparent',
                                _hover: {
                                    bg: {
                                        base: 'rgba(224,123,83,0.06)',
                                        _dark: 'rgba(224,123,83,0.08)',
                                    },
                                },
                            })}
                        >
                            {row.getVisibleCells().map((cell) => (
                                <td
                                    key={cell.id}
                                    className={css({
                                        padding: '3',
                                        paddingX: '4',
                                        verticalAlign: 'middle',
                                    })}
                                >
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </td>
                            ))}
                        </tr>
                    ))}
                    {table.getRowModel().rows.length === 0 && (
                        <tr>
                            <td
                                colSpan={columns.length}
                                className={css({
                                    padding: '12',
                                    textAlign: 'center',
                                    color: 'foreground.muted',
                                    fontSize: 'sm',
                                })}
                            >
                                {emptyMessage}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

/** Delete button with confirmation */
function DeleteButton({
    onDelete,
    disabled,
    title,
}: {
    onDelete: () => Promise<void>;
    disabled?: boolean;
    title?: string;
}) {
    const [isPending, startTransition] = useTransition();

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (disabled) return;
        if (!confirm('Wirklich loeschen?')) return;
        startTransition(async () => {
            await onDelete();
        });
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={disabled || isPending}
            title={title}
            className={css({
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '8',
                height: '8',
                borderRadius: 'lg',
                border: 'none',
                bg: 'transparent',
                cursor: disabled ? 'not-allowed' : 'pointer',
                color: disabled ? 'foreground.muted' : 'foreground.muted',
                opacity: disabled ? '0.3' : '1',
                transition: 'all 0.15s',
                _hover: disabled
                    ? {}
                    : {
                          bg: 'error.bg',
                          color: 'status.danger',
                      },
            })}
        >
            <Trash2 size={14} />
        </button>
    );
}
