'use client';

import { createContext, useContext, type ReactNode } from 'react';

import { portionFactor } from '@app/lib/ingredients/quantities';

const IngredientPortionsContext = createContext(1);
export function IngredientPortionsProvider({
    servings = 1,
    originalServings = 1,
    children,
}: {
    servings?: number;
    originalServings?: number;
    children: ReactNode;
}) {
    return (
        <IngredientPortionsContext.Provider value={portionFactor(servings, originalServings)}>
            {children}
        </IngredientPortionsContext.Provider>
    );
}
export const useIngredientPortionFactor = () => useContext(IngredientPortionsContext);
