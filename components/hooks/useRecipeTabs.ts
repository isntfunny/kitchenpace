'use client';

import { useContext } from 'react';

import { RecipeTabsContext } from '@/components/providers/RecipeTabsProvider';

export function useRecipeTabs() {
    const context = useContext(RecipeTabsContext);
    if (!context) {
        throw new Error('useRecipeTabs must be used within a RecipeTabsProvider');
    }
    return context;
}
