'use client';

import { useCallback, useEffect, useEffectEvent, useMemo, useReducer, useState } from 'react';

import type { RecipeCardData } from '@app/app/actions/recipes';
import {
    applyWeekSelection,
    loadSideDishes,
    loadTryAlso,
    type WeekSelectionOpen,
} from '@app/app/plan/selection-actions';
import type { FiltersWithSort } from '@app/app/recipes/components/filter-state';
import type { MealKind } from '@shared/meal-planning/meal-kind';

import {
    canPick,
    cellsFor,
    freeCells,
    selectionReducer,
    tabsOf,
    type SelectionState,
} from './selection-state';

/** Cards of the "Probier auch mal" row */
const TRY_ALSO_COUNT = 5;
/** Ids the server accepts as exclusion for the row */
const MAX_EXCLUDE = 400;
/** The week sort re-ranks after the picks settle */
const PICKS_DEBOUNCE_MS = 300;

function useDebounced<T>(value: T, ms: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), ms);
        return () => clearTimeout(timer);
    }, [value, ms]);
    return debounced;
}

const toggleIn = (list: string[], value: string, order: string[]) =>
    list.includes(value)
        ? list.filter((item) => item !== value)
        : order.filter((item) => item === value || list.includes(item));

/**
 * State of one opening of the week selection (KUC-126): slot chips, picks with servings
 * and side dishes, the "Probier auch mal" row and "Übernehmen".
 */
export function useWeekSelection(data: WeekSelectionOpen, filters: FiltersWithSort) {
    const free = useMemo(
        () => freeCells(data.days, data.slots, data.occupied),
        [data.days, data.slots, data.occupied],
    );
    const slotKeys = useMemo(() => data.slots.map((slot) => slot.key), [data.slots]);
    const freeKeys = useMemo(() => Object.keys(free), [free]);
    const hasFree = useCallback(
        (part: 'meal' | 'day', value: string) =>
            freeKeys.some((key) => key.split('|')[part === 'day' ? 0 : 1] === value),
        [freeKeys],
    );

    // Pre-set: every meal and day that has a free slot
    const [meals, setMeals] = useState(() => slotKeys.filter((key) => hasFree('meal', key)));
    const [days, setDays] = useState(() => data.days.filter((day) => hasFree('day', day)));
    const [state, dispatch] = useReducer(
        selectionReducer,
        undefined,
        (): SelectionState => ({
            household: data.household,
            chosenSlots: cellsFor(meals, days, free),
            slotKinds: free,
            picks: [],
        }),
    );

    const toggleMeal = (key: string) => {
        const next = toggleIn(meals, key, slotKeys);
        setMeals(next);
        dispatch({ type: 'setSlots', keys: cellsFor(next, days, free) });
    };
    const toggleDay = (day: string) => {
        const next = toggleIn(days, day, data.days);
        setDays(next);
        dispatch({ type: 'setSlots', keys: cellsFor(meals, next, free) });
    };

    const tabs = tabsOf(state);
    const [chosenKind, setKind] = useState<MealKind>('main');
    const kind = tabs.some((tab) => tab.kind === chosenKind)
        ? chosenKind
        : (tabs[0]?.kind ?? chosenKind);

    const pickIds = useMemo(() => state.picks.map((pick) => pick.recipe.id), [state.picks]);
    const rankedPickIds = useDebounced(pickIds, PICKS_DEBOUNCE_MS);

    // "Probier auch mal": loaded once per opening, stays put; picked cards are refilled
    const [tryRow, setTryRow] = useState<RecipeCardData[] | null>(null);
    const hasMainSlots = Object.values(free).includes('main');
    const loadRow = useEffectEvent(() => {
        loadTryAlso({
            startDate: data.startDate,
            filters,
            pickIds: [],
            excludeIds: [],
            need: TRY_ALSO_COUNT,
        }).then((result) => setTryRow(result.ok ? result.data : []));
    });
    useEffect(() => {
        if (hasMainSlots) loadRow();
    }, [hasMainSlots]);

    const refillRow = (picked: string, listIds: string[]) => {
        const rowIds = (tryRow ?? []).map((card) => card.id);
        setTryRow((row) => row?.filter((card) => card.id !== picked) ?? row);
        loadTryAlso({
            startDate: data.startDate,
            filters,
            pickIds: [...pickIds, picked].slice(0, 30),
            excludeIds: [...new Set([...listIds, ...rowIds, ...pickIds])].slice(0, MAX_EXCLUDE),
            need: 1,
        }).then((result) => {
            if (result.ok) setTryRow((row) => [...(row ?? []), ...result.data]);
        });
    };

    const toggle = (
        recipe: RecipeCardData,
        pickKind: MealKind,
        source: { tryRow?: boolean; listIds?: string[] } = {},
    ) => {
        const picking = !pickIds.includes(recipe.id);
        if (picking && !canPick(state, pickKind)) return;
        dispatch({ type: 'togglePick', recipe, kind: pickKind });
        if (picking && source.tryRow) refillRow(recipe.id, source.listIds ?? []);
    };

    // "Dazu passt": after every change of the main dishes, one side per main at most
    const mainKey = state.picks
        .filter((pick) => pick.kind === 'main')
        .map((pick) => pick.recipe.id)
        .join(',');
    const loadSides = useEffectEvent((mainIds: string[], isActive: () => boolean) => {
        loadSideDishes({ filters, mainIds }).then((result) => {
            if (!result.ok || !isActive()) return;
            for (const [recipeId, side] of Object.entries(result.data)) {
                // An accepted side stays, even if the suggestion moved on
                if (state.picks.find((pick) => pick.recipe.id === recipeId)?.side?.accepted)
                    continue;
                dispatch({ type: 'side', recipeId, side: side ? { card: side.card } : null });
            }
        });
    });
    useEffect(() => {
        if (!mainKey) return;
        let active = true;
        const timer = setTimeout(() => loadSides(mainKey.split(','), () => active), 250);
        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [mainKey]);

    const [applying, setApplying] = useState(false);
    const apply = async () => {
        setApplying(true);
        try {
            return await applyWeekSelection({
                startDate: data.startDate,
                slots: state.chosenSlots,
                picks: state.picks.map((pick) => ({
                    recipeId: pick.recipe.id,
                    kind: pick.kind,
                    servings: pick.servings,
                    ...(pick.side?.accepted ? { sideRecipeId: pick.side.card.id } : {}),
                })),
            });
        } finally {
            setApplying(false);
        }
    };

    return {
        state,
        dispatch,
        free,
        meals,
        days,
        toggleMeal,
        toggleDay,
        hasFree,
        tabs,
        kind,
        setKind,
        pickIds,
        rankedPickIds,
        tryRow,
        toggle,
        apply,
        applying,
    };
}

export type WeekSelection = ReturnType<typeof useWeekSelection>;
