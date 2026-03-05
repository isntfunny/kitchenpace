'use client';

import { ShoppingCategory } from '@prisma/client';
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
import { ArrowUpDown, Search, Plus, Trash2, GitMerge, X, Check } from 'lucide-react';
import { useState } from 'react';

import { css } from 'styled-system/css';

import { createIngredient, updateIngredient, deleteIngredient, mergeIngredients } from './actions';

type Ingredient = {
    id: string;
    name: string;
    slug: string;
    category: ShoppingCategory;
    units: string[];
    recipeCount: number;
};

const CATEGORY_LABELS: Record<ShoppingCategory, string> = {
    GEMUESE: 'Gemüse',
    OBST: 'Obst',
    FLEISCH: 'Fleisch',
    FISCH: 'Fisch',
    MILCHPRODUKTE: 'Milchprodukte',
    GEWURZE: 'Gewürze',
    BACKEN: 'Backen',
    GETRAENKE: 'Getränke',
    SONSTIGES: 'Sonstiges',
};

function EditableRow({ ingredient, onCancel }: { ingredient: Ingredient; onCancel: () => void }) {
    const [name, setName] = useState(ingredient.name);
    const [category, setCategory] = useState<ShoppingCategory>(ingredient.category);
    const [units, setUnits] = useState<string[]>(ingredient.units);
    const [newUnit, setNewUnit] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleAddUnit = () => {
        const trimmed = newUnit.trim();
        if (trimmed && !units.includes(trimmed)) {
            setUnits([...units, trimmed]);
            setNewUnit('');
        }
    };

    const handleRemoveUnit = (unitToRemove: string) => {
        setUnits(units.filter((u) => u !== unitToRemove));
    };

    const handleSave = async () => {
        setError('');
        setSaving(true);
        try {
            await updateIngredient(ingredient.id, { name, category, units });
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
                <td className={css({ padding: '2', paddingLeft: '4' })}>
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
                <td className={css({ padding: '2' })}>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as ShoppingCategory)}
                        className={css({
                            paddingX: '2',
                            paddingY: '1',
                            borderRadius: 'md',
                            borderWidth: '1px',
                            borderColor: 'border.muted',
                            background: 'surface.elevated',
                            fontSize: 'sm',
                            color: 'foreground',
                            outline: 'none',
                            cursor: 'pointer',
                        })}
                    >
                        {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                </td>
                <td className={css({ padding: '2' })}>
                    <div
                        className={css({
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '1',
                            marginBottom: '1',
                        })}
                    >
                        {units.map((unit) => (
                            <span
                                key={unit}
                                className={css({
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.5',
                                    paddingX: '1.5',
                                    paddingY: '0.5',
                                    borderRadius: 'full',
                                    fontSize: 'xs',
                                    background: 'surface.elevated',
                                    borderWidth: '1px',
                                    borderColor: 'border.muted',
                                })}
                            >
                                {unit}
                                <button
                                    type="button"
                                    onClick={() => handleRemoveUnit(unit)}
                                    className={css({
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '3',
                                        height: '3',
                                        borderRadius: 'full',
                                        border: 'none',
                                        background: 'transparent',
                                        cursor: 'pointer',
                                        color: 'foreground.muted',
                                        _hover: { color: 'red.500' },
                                    })}
                                >
                                    <X size={10} />
                                </button>
                            </span>
                        ))}
                    </div>
                    <div className={css({ display: 'flex', gap: '1' })}>
                        <input
                            type="text"
                            value={newUnit}
                            onChange={(e) => setNewUnit(e.target.value)}
                            onKeyDown={(e) =>
                                e.key === 'Enter' && (e.preventDefault(), handleAddUnit())
                            }
                            placeholder="+ Einheit"
                            className={css({
                                flex: '1',
                                paddingX: '2',
                                paddingY: '0.5',
                                borderRadius: 'md',
                                borderWidth: '1px',
                                borderColor: 'border.muted',
                                background: 'surface.elevated',
                                fontSize: 'xs',
                                color: 'foreground',
                                outline: 'none',
                                minWidth: '80px',
                            })}
                        />
                        <button
                            type="button"
                            onClick={handleAddUnit}
                            className={css({
                                paddingX: '2',
                                paddingY: '0.5',
                                borderRadius: 'md',
                                borderWidth: '1px',
                                borderColor: 'border.muted',
                                background: 'surface.elevated',
                                fontSize: 'xs',
                                cursor: 'pointer',
                                color: 'foreground',
                            })}
                        >
                            +
                        </button>
                    </div>
                </td>
                <td className={css({ padding: '2', fontSize: 'sm', color: 'foreground.muted' })}>
                    {ingredient.recipeCount}
                </td>
                <td className={css({ padding: '2' })}>
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
                    <td colSpan={5} className={css({ padding: '2', paddingLeft: '4' })}>
                        <div className={css({ fontSize: 'xs', color: 'red.600' })}>{error}</div>
                    </td>
                </tr>
            )}
        </>
    );
}

const columns: ColumnDef<Ingredient>[] = [
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
        cell: ({ row }) => (
            <span className={css({ fontWeight: 'medium' })}>{row.original.name}</span>
        ),
    },
    {
        accessorKey: 'category',
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
                Kategorie
                <ArrowUpDown size={12} />
            </button>
        ),
        cell: ({ row }) => (
            <span className={css({ fontSize: 'sm' })}>
                {CATEGORY_LABELS[row.original.category]}
            </span>
        ),
    },
    {
        accessorKey: 'units',
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
                Einheiten
            </span>
        ),
        cell: ({ row }) => (
            <div className={css({ display: 'flex', gap: '1', flexWrap: 'wrap' })}>
                {row.original.units.length > 0 ? (
                    row.original.units.map((unit) => (
                        <span
                            key={unit}
                            className={css({
                                paddingX: '2',
                                paddingY: '0.5',
                                borderRadius: 'full',
                                fontSize: 'xs',
                                background: 'surface.elevated',
                                borderWidth: '1px',
                                borderColor: 'border.muted',
                            })}
                        >
                            {unit}
                        </span>
                    ))
                ) : (
                    <span className={css({ fontSize: 'xs', color: 'foreground.muted' })}>—</span>
                )}
            </div>
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
            const ingredient = row.original;
            return (
                <div className={css({ display: 'flex', gap: '2' })}>
                    <form
                        action={async () => {
                            if (confirm(`"${ingredient.name}" wirklich löschen?`)) {
                                try {
                                    await deleteIngredient(ingredient.id);
                                } catch (err) {
                                    alert(
                                        err instanceof Error ? err.message : 'Fehler beim Löschen',
                                    );
                                }
                            }
                        }}
                    >
                        <button
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

function MergeModal({ ingredients, onClose }: { ingredients: Ingredient[]; onClose: () => void }) {
    const [sourceId, setSourceId] = useState('');
    const [targetId, setTargetId] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleMerge = async () => {
        setError('');
        if (!sourceId || !targetId || sourceId === targetId) {
            setError('Bitte wähle zwei verschiedene Zutaten aus.');
            return;
        }
        setSaving(true);
        try {
            await mergeIngredients(sourceId, targetId);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
        } finally {
            setSaving(false);
        }
    };

    const sourceIngredient = ingredients.find((i) => i.id === sourceId);
    const targetIngredient = ingredients.find((i) => i.id === targetId);

    return (
        <div
            className={css({
                position: 'fixed',
                inset: '0',
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: '50',
            })}
        >
            <div
                className={css({
                    background: 'surface',
                    borderRadius: '2xl',
                    borderWidth: '1px',
                    borderColor: 'border.muted',
                    padding: '6',
                    width: '100%',
                    maxWidth: '500px',
                    margin: '4',
                })}
            >
                <div
                    className={css({
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '4',
                    })}
                >
                    <h2 className={css({ fontSize: 'lg', fontWeight: 'semibold' })}>
                        Zutaten zusammenführen
                    </h2>
                    <button
                        onClick={onClose}
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '8',
                            height: '8',
                            borderRadius: 'lg',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            color: 'foreground.muted',
                            _hover: { background: 'surface.elevated' },
                        })}
                    >
                        <X size={18} />
                    </button>
                </div>
                <p
                    className={css({
                        fontSize: 'sm',
                        color: 'foreground.muted',
                        marginBottom: '4',
                    })}
                >
                    Wähle zwei Zutaten aus. Die erste wird in die zweite zusammengeführt und dann
                    gelöscht. Alle Rezepte werden automatisch aktualisiert.
                </p>
                {error && (
                    <div
                        className={css({
                            padding: '3',
                            borderRadius: 'lg',
                            background: 'red.50',
                            borderWidth: '1px',
                            borderColor: 'red.200',
                            marginBottom: '4',
                        })}
                    >
                        <p className={css({ fontSize: 'sm', color: 'red.600' })}>{error}</p>
                    </div>
                )}
                <div className={css({ display: 'flex', flexDirection: 'column', gap: '4' })}>
                    <div>
                        <label
                            className={css({
                                display: 'block',
                                fontSize: 'xs',
                                color: 'foreground.muted',
                                marginBottom: '1',
                            })}
                        >
                            Zutat die gelöscht wird (Quelle)
                        </label>
                        <select
                            value={sourceId}
                            onChange={(e) => setSourceId(e.target.value)}
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
                                cursor: 'pointer',
                            })}
                        >
                            <option value="">Zutat auswählen...</option>
                            {ingredients
                                .filter((i) => i.id !== targetId)
                                .map((ing) => (
                                    <option key={ing.id} value={ing.id}>
                                        {ing.name} ({ing.recipeCount} Rezepte)
                                    </option>
                                ))}
                        </select>
                    </div>
                    <div className={css({ display: 'flex', justifyContent: 'center' })}>
                        <GitMerge size={20} className={css({ color: 'foreground.muted' })} />
                    </div>
                    <div>
                        <label
                            className={css({
                                display: 'block',
                                fontSize: 'xs',
                                color: 'foreground.muted',
                                marginBottom: '1',
                            })}
                        >
                            Zutat die behalten wird (Ziel)
                        </label>
                        <select
                            value={targetId}
                            onChange={(e) => setTargetId(e.target.value)}
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
                                cursor: 'pointer',
                            })}
                        >
                            <option value="">Zutat auswählen...</option>
                            {ingredients
                                .filter((i) => i.id !== sourceId)
                                .map((ing) => (
                                    <option key={ing.id} value={ing.id}>
                                        {ing.name} ({ing.recipeCount} Rezepte)
                                    </option>
                                ))}
                        </select>
                    </div>
                    {sourceIngredient && targetIngredient && (
                        <div
                            className={css({
                                padding: '3',
                                borderRadius: 'lg',
                                background: 'surface.elevated',
                                borderWidth: '1px',
                                borderColor: 'border.muted',
                            })}
                        >
                            <p className={css({ fontSize: 'sm', color: 'foreground.muted' })}>
                                <strong>{sourceIngredient.name}</strong> (
                                {sourceIngredient.recipeCount} Rezepte) wird mit{' '}
                                <strong>{targetIngredient.name}</strong> zusammengeführt.
                            </p>
                        </div>
                    )}
                    <div className={css({ display: 'flex', gap: '2', marginTop: '2' })}>
                        <button
                            onClick={onClose}
                            className={css({
                                flex: '1',
                                paddingX: '4',
                                paddingY: '2',
                                borderRadius: 'lg',
                                borderWidth: '1px',
                                borderColor: 'border.muted',
                                background: 'surface',
                                fontSize: 'sm',
                                fontWeight: 'medium',
                                cursor: 'pointer',
                                color: 'foreground',
                            })}
                        >
                            Abbrechen
                        </button>
                        <button
                            onClick={handleMerge}
                            disabled={saving || !sourceId || !targetId}
                            className={css({
                                flex: '1',
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
                                opacity: saving || !sourceId || !targetId ? 0.7 : 1,
                            })}
                        >
                            {saving ? 'Zusammenführen...' : 'Zusammenführen'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function IngredientsTable({ ingredients }: { ingredients: Ingredient[] }) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [newCategory, setNewCategory] = useState<ShoppingCategory>('SONSTIGES');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isMerging, setIsMerging] = useState(false);
    const [error, setError] = useState('');

    const table = useReactTable({
        data: ingredients,
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

    const handleAddIngredient = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!newName.trim()) return;
        try {
            await createIngredient({ name: newName, category: newCategory });
            setNewName('');
            setNewCategory('SONSTIGES');
            setIsAdding(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
        }
    };

    return (
        <>
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
                            placeholder="Zutaten suchen..."
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
                    <div className={css({ display: 'flex', gap: '2' })}>
                        <button
                            onClick={() => setIsMerging(true)}
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2',
                                paddingX: '3',
                                paddingY: '2',
                                borderRadius: 'lg',
                                borderWidth: '1px',
                                borderColor: 'border.muted',
                                background: 'surface',
                                fontSize: 'sm',
                                fontWeight: 'medium',
                                cursor: 'pointer',
                                color: 'foreground',
                                transition: 'all 0.2s',
                                _hover: { background: 'surface.elevated' },
                            })}
                        >
                            <GitMerge size={16} />
                            Zusammenführen
                        </button>
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
                </div>

                {error && (
                    <div
                        className={css({
                            padding: '3',
                            borderBottomWidth: '1px',
                            borderColor: 'red.200',
                            background: 'red.50',
                        })}
                    >
                        <p className={css({ fontSize: 'sm', color: 'red.600' })}>{error}</p>
                    </div>
                )}

                {isAdding && (
                    <form
                        onSubmit={handleAddIngredient}
                        className={css({
                            padding: '4',
                            borderBottomWidth: '1px',
                            borderColor: 'border.muted',
                            background: 'surface',
                            display: 'flex',
                            gap: '3',
                            alignItems: 'flex-end',
                            flexWrap: 'wrap',
                        })}
                    >
                        <div
                            className={css({ display: 'flex', flexDirection: 'column', gap: '1' })}
                        >
                            <label className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                                Name
                            </label>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Zutatenname"
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
                        <div
                            className={css({ display: 'flex', flexDirection: 'column', gap: '1' })}
                        >
                            <label className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                                Kategorie
                            </label>
                            <select
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value as ShoppingCategory)}
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
                                    cursor: 'pointer',
                                })}
                            >
                                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
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
                                        Keine Zutaten gefunden.
                                    </td>
                                </tr>
                            ) : (
                                table.getRowModel().rows.map((row) =>
                                    editingId === row.original.id ? (
                                        <EditableRow
                                            key={row.id}
                                            ingredient={row.original}
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
                                                    className={css({
                                                        padding: '3',
                                                        paddingLeft: '4',
                                                    })}
                                                >
                                                    {cell.column.id === 'name' ? (
                                                        <div
                                                            className={css({
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '2',
                                                            })}
                                                        >
                                                            <span
                                                                className={css({
                                                                    fontWeight: 'medium',
                                                                })}
                                                            >
                                                                {cell.getValue() as string}
                                                            </span>
                                                            <button
                                                                onClick={() =>
                                                                    setEditingId(row.original.id)
                                                                }
                                                                title="Bearbeiten"
                                                                className={css({
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    width: '6',
                                                                    height: '6',
                                                                    borderRadius: 'md',
                                                                    border: 'none',
                                                                    background: 'transparent',
                                                                    cursor: 'pointer',
                                                                    color: 'foreground.muted',
                                                                    opacity: 0.5,
                                                                    _hover: {
                                                                        opacity: 1,
                                                                        color: 'foreground',
                                                                    },
                                                                })}
                                                            >
                                                                <X
                                                                    size={12}
                                                                    style={{
                                                                        transform: 'rotate(45deg)',
                                                                    }}
                                                                />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        flexRender(
                                                            cell.column.columnDef.cell,
                                                            cell.getContext(),
                                                        )
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

            {isMerging && (
                <MergeModal ingredients={ingredients} onClose={() => setIsMerging(false)} />
            )}
        </>
    );
}
