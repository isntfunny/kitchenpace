'use client';

import { type ColumnDef } from '@tanstack/react-table';

import { css } from 'styled-system/css';

import { SortHeader } from './ingredient-shared';
import { type Ingredient, pillStyle } from './ingredient-types';

// ---------------------------------------------------------------------------
// Ingredient column definitions for the main ingredients table
// ---------------------------------------------------------------------------

export function getIngredientColumns(): ColumnDef<Ingredient>[] {
    return [
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
    ];
}
