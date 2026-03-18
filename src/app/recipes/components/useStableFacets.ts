/* eslint-disable react-hooks/set-state-in-effect -- This hook's purpose is syncing facet state from async search responses */
import { useEffect, useMemo, useRef, useState } from 'react';

import type { RecipeFilterSearchParams } from '@app/lib/recipeFilters';

import type { RecipeSearchFacets } from './useRecipeSearch';

const buildSliderSignature = (filters: RecipeFilterSearchParams) =>
    JSON.stringify([
        filters.minTotalTime ?? null,
        filters.maxTotalTime ?? null,
        filters.minPrepTime ?? null,
        filters.maxPrepTime ?? null,
        filters.minCookTime ?? null,
        filters.maxCookTime ?? null,
        filters.minStepCount ?? null,
        filters.maxStepCount ?? null,
        filters.minCalories ?? null,
        filters.maxCalories ?? null,
        filters.minRating ?? null,
        filters.minCookCount ?? null,
    ]);

const buildNonSliderSignature = (filters: RecipeFilterSearchParams) =>
    JSON.stringify({
        query: filters.query ?? null,
        tags: filters.tags ?? [],
        categories: filters.categories ?? [],
        ingredients: filters.ingredients ?? [],
        excludeIngredients: filters.excludeIngredients ?? [],
        difficulty: filters.difficulty ?? [],
        filterMode: filters.filterMode ?? 'and',
    });

const evaluateMinChange = (prevValue?: number, nextValue?: number) => {
    if (prevValue === nextValue) return 'none';
    if (nextValue === undefined) return 'relax';
    if (prevValue === undefined) return 'restrict';
    return nextValue < prevValue ? 'relax' : 'restrict';
};

const evaluateMaxChange = (prevValue?: number, nextValue?: number) => {
    if (prevValue === nextValue) return 'none';
    if (nextValue === undefined) return 'relax';
    if (prevValue === undefined) return 'restrict';
    return nextValue > prevValue ? 'relax' : 'restrict';
};

/**
 * Stabilises facet counts so the filter sidebar doesn't flicker while the user
 * drags range sliders. Facets are only updated when:
 * - No filter changed (initial data arrival)
 * - A non-slider filter changed
 * - A slider was *relaxed* (widened), not restricted
 */
export function useStableFacets(
    facets: RecipeSearchFacets | undefined,
    filters: RecipeFilterSearchParams,
): RecipeSearchFacets | undefined {
    const sliderSig = useMemo(() => buildSliderSignature(filters), [filters]);
    const nonSliderSig = useMemo(() => buildNonSliderSignature(filters), [filters]);

    const prevSliderRef = useRef(sliderSig);
    const prevNonSliderRef = useRef(nonSliderSig);
    const prevFiltersRef = useRef(filters);
    const [stable, setStable] = useState(() => facets);

    useEffect(() => {
        if (!facets) return;

        const sliderChanged = sliderSig !== prevSliderRef.current;
        const nonSliderChanged = nonSliderSig !== prevNonSliderRef.current;

        prevSliderRef.current = sliderSig;
        prevNonSliderRef.current = nonSliderSig;

        const prev = prevFiltersRef.current;
        prevFiltersRef.current = filters;

        // No filter change (e.g. initial data arrival) — just sync facets
        if (!sliderChanged && !nonSliderChanged) {
            setStable(facets);
            return;
        }

        // Only slider changed and it was a restriction (narrowing) — keep current
        // facets so the sidebar doesn't jump while the user is dragging
        if (sliderChanged && !nonSliderChanged) {
            const sliderRelaxed = [
                evaluateMinChange(prev.minTotalTime, filters.minTotalTime),
                evaluateMaxChange(prev.maxTotalTime, filters.maxTotalTime),
                evaluateMinChange(prev.minPrepTime, filters.minPrepTime),
                evaluateMaxChange(prev.maxPrepTime, filters.maxPrepTime),
                evaluateMinChange(prev.minCookTime, filters.minCookTime),
                evaluateMaxChange(prev.maxCookTime, filters.maxCookTime),
                evaluateMinChange(prev.minStepCount, filters.minStepCount),
                evaluateMaxChange(prev.maxStepCount, filters.maxStepCount),
                evaluateMinChange(prev.minCalories, filters.minCalories),
                evaluateMaxChange(prev.maxCalories, filters.maxCalories),
                evaluateMinChange(prev.minRating, filters.minRating),
                evaluateMinChange(prev.minCookCount, filters.minCookCount),
            ].some((r) => r === 'relax');

            if (!sliderRelaxed) return;
        }

        setStable(facets);
    }, [facets, filters, sliderSig, nonSliderSig]);

    return stable ?? facets;
}
