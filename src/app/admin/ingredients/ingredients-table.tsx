'use client';

import { useState } from 'react';

import { css } from 'styled-system/css';

import { CategoriesTab } from './CategoriesTab';
import { type Ingredient, type IngredientCategory, type Unit } from './ingredient-types';
import { IngredientsTab } from './IngredientsTab';
import { UnitsTab } from './UnitsTab';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabId = 'ingredients' | 'categories' | 'units';

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
