'use client';

import { usePathname } from 'next/navigation';
import type { FC } from 'react';

import type { FilterSetWithRelations } from '@app/lib/fits-now/db-queries';
import type { Season } from '@app/lib/fits-now/labels';
import type { PersonalSearchFlags } from '@app/lib/recipeSearchTypes';
import { STORAGE_KEYS } from '@app/lib/storageKeys';
import type { RecipeFilterSearchParams } from '@shared/recipe-filters';
import type { ThemeChip } from '@shared/theme-clusters/release';

import { RecipeSearchView, type FilterOptions } from './RecipeSearchView';
import { useFilterUrlSync } from './useFilterUrlSync';
import { useRecipeFilterState } from './useRecipeFilterState';
import type { InitialSearchData } from './useRecipeSearch';
import { useRecipeSearch } from './useRecipeSearch';

type RecipeSearchClientProps = {
    initialFilters: RecipeFilterSearchParams;
    filterOptions: FilterOptions;
    initialData?: InitialSearchData;
    filterSets?: FilterSetWithRelations[];
    currentSeason?: Season;
    themes?: ThemeChip[];
    isLoggedIn?: boolean;
    /** Personal quick filters and sorts (week plan, pantry), read on the server */
    personal?: PersonalSearchFlags;
    /** The URL sets ?sort=, so the remembered sort must not override it */
    sortLocked?: boolean;
};

/** The recipe page: filter state mirrored into the URL, rendered by RecipeSearchView. */
export const RecipeSearchClient: FC<RecipeSearchClientProps> = ({
    initialFilters,
    filterOptions,
    initialData,
    filterSets,
    currentSeason,
    themes,
    isLoggedIn = false,
    personal,
    sortLocked = false,
}) => {
    const state = useRecipeFilterState({
        initialFilters,
        filterSets,
        isLoggedIn,
        sortStorageKey: STORAGE_KEYS.searchSort,
        sortLocked,
        hasPantry: personal?.hasPantry ?? false,
    });
    useFilterUrlSync(state, { pathname: usePathname(), initialFilters });
    const results = useRecipeSearch(state.filters, { initialData });

    return (
        <RecipeSearchView
            state={state}
            results={results}
            filterOptions={filterOptions}
            filterSets={filterSets}
            themes={themes}
            currentSeason={currentSeason}
            isLoggedIn={isLoggedIn}
            personal={personal}
        />
    );
};
