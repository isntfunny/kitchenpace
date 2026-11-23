'use client';

import { Loader2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { RecipeCardData } from '@app/app/actions/recipes';
import { openWeekSelection, type WeekSelectionOpen } from '@app/app/plan/selection-actions';
import { RecipeSearchView } from '@app/app/recipes/components/RecipeSearchView';
import { searchSortOptions, type SortChoice } from '@app/app/recipes/components/SearchHeader';
import { useRecipeFilterState } from '@app/app/recipes/components/useRecipeFilterState';
import { useRecipeSearch } from '@app/app/recipes/components/useRecipeSearch';
import { addMealPlanEntriesToShoppingList } from '@app/app/shopping-list/actions';
import { IconButton } from '@app/components/atoms/Button';
import type { RecipeCardSelection } from '@app/components/features/RecipeCard';
import { QueryProvider } from '@app/components/providers/QueryProvider';
import { useToastContext } from '@app/components/providers/ToastProvider';
import { Sheet } from '@app/components/ui/Sheet';
import { weekRangeLabel } from '@app/lib/meal-plan/view';
import type { RecipeSearchContext } from '@app/lib/recipeSearchContext';
import type { MealKind } from '@shared/meal-planning/meal-kind';

import { css } from 'styled-system/css';

import { KindTabs } from './KindTabs';
import { appliedMessage, canIncrement, canPick } from './selection-state';
import { SelectionBar } from './SelectionBar';
import { SelectionCardFooter } from './SelectionCardFooter';
import { SlotPicker } from './SlotPicker';
import { TryAlsoRow } from './TryAlsoRow';
import { usePersistedFilters, useStoredFilters } from './usePersistedFilters';
import { useWeekSelection } from './useWeekSelection';

export type WeekSelectionApplied = { planned: number; skipped: number; entryIds: string[] };

type WeekSelectionDialogProps = {
    startDate: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** After "Übernehmen" (the dialog has closed and shown its toast) */
    onApplied: (result: WeekSelectionApplied) => void;
};

const SORT_OPTIONS: SortChoice[] = [
    { value: 'week', label: 'Passt zu deiner Woche' },
    ...searchSortOptions(true),
];

/**
 * "Woche planen" (KUC-126): pick dishes for the free slots of a week like in a meal kit,
 * on the same search as /recipes. "Übernehmen" distributes them onto the chosen slots.
 */
export function WeekSelectionDialog({
    startDate,
    open,
    onOpenChange,
    onApplied,
}: WeekSelectionDialogProps) {
    return (
        <Sheet
            open={open}
            onOpenChange={onOpenChange}
            title="Woche planen"
            header={false}
            placement="full"
            size="xl"
        >
            {open && (
                <QueryProvider>
                    <WeekSelectionLoader
                        key={startDate}
                        startDate={startDate}
                        onClose={() => onOpenChange(false)}
                        onApplied={onApplied}
                    />
                </QueryProvider>
            )}
        </Sheet>
    );
}

type BodyProps = {
    onClose: () => void;
    onApplied: (result: WeekSelectionApplied) => void;
};

function DialogHead({ startDate, onClose }: { startDate: string; onClose: () => void }) {
    return (
        <header
            className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '3',
                px: { base: '4', md: '6' },
                py: '3',
                borderBottomWidth: '1px',
                borderBottomStyle: 'solid',
                borderBottomColor: 'border',
            })}
        >
            <div className={css({ flex: 1, minW: 0 })}>
                <h2 className={css({ fontSize: 'xl', fontWeight: '700' })}>Woche planen</h2>
                <p className={css({ fontSize: 'sm', color: 'text.muted' })}>
                    {weekRangeLabel(startDate)}
                </p>
            </div>
            <IconButton variant="ghost" onClick={onClose} aria-label="Schließen">
                <X size={20} />
            </IconButton>
        </header>
    );
}

/** Loads the free slots and the filter bar data, once per opening. */
function WeekSelectionLoader({ startDate, ...props }: BodyProps & { startDate: string }) {
    const [data, setData] = useState<WeekSelectionOpen | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        openWeekSelection({ startDate }).then((result) => {
            if (!active) return;
            if (result.ok) setData(result.data);
            else setError(result.error);
        });
        return () => {
            active = false;
        };
    }, [startDate]);

    if (data) return <WeekSelectionBody data={data} {...props} />;
    return (
        <>
            <DialogHead startDate={startDate} onClose={props.onClose} />
            <div className={css({ flex: 1, display: 'grid', placeItems: 'center', p: '6' })}>
                {error ? (
                    <p role="alert" className={css({ color: 'status.error' })}>
                        {error}
                    </p>
                ) : (
                    <Loader2
                        size={28}
                        aria-label="Lädt"
                        className={css({
                            animation: 'spin 1s linear infinite',
                            color: 'text.muted',
                        })}
                    />
                )}
            </div>
        </>
    );
}

function WeekSelectionBody({ data, onClose, onApplied }: BodyProps & { data: WeekSelectionOpen }) {
    const { showToast } = useToastContext();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [applyError, setApplyError] = useState<string | null>(null);

    const filterState = useRecipeFilterState({
        initialFilters: useStoredFilters(),
        filterSets: data.startData.filterSets,
        isLoggedIn: true,
        defaultSort: 'week',
    });
    usePersistedFilters(filterState.filters);

    const selection = useWeekSelection(data, filterState.filters);
    const { state, dispatch, kind, tabs, pickIds, rankedPickIds, tryRow } = selection;

    const context = useMemo<RecipeSearchContext>(
        () => ({ kind, excludeIds: pickIds, pickIds: rankedPickIds, week: data.startDate }),
        [kind, pickIds, rankedPickIds, data.startDate],
    );
    const results = useRecipeSearch(filterState.filters, { context, keepPrevious: true });
    const listIds = results.data.map((recipe) => recipe.id);

    const cardSelection = (
        recipe: RecipeCardData,
        cardKind: MealKind,
        source: { tryRow?: boolean } = {},
    ): RecipeCardSelection => {
        const pick = state.picks.find((p) => p.recipe.id === recipe.id);
        return {
            selected: !!pick,
            disabled: !pick && !canPick(state, cardKind),
            onToggle: () => selection.toggle(recipe, cardKind, { ...source, listIds }),
            reason: recipe.reason,
            footer: pick && (
                <SelectionCardFooter
                    pick={pick}
                    household={state.household}
                    canIncrement={canIncrement(state, recipe.id)}
                    onServings={(delta) =>
                        dispatch({ type: 'servings', recipeId: recipe.id, delta })
                    }
                    onAcceptSide={(accepted) =>
                        dispatch({ type: 'acceptSide', recipeId: recipe.id, accepted })
                    }
                />
            ),
        };
    };

    const apply = async () => {
        setApplyError(null);
        const result = await selection.apply();
        if (!result.ok) {
            setApplyError(result.error);
            return;
        }
        const { planned, skipped, entryIds } = result.data;
        showToast({
            type: planned > 0 ? 'success' : 'warning',
            title: appliedMessage({ planned, skipped }),
            duration: 8000,
            action:
                entryIds.length > 0
                    ? {
                          label: 'Auf die Einkaufsliste',
                          onClick: async () => {
                              const added = await addMealPlanEntriesToShoppingList(entryIds);
                              showToast(
                                  added.ok
                                      ? {
                                            type: 'success',
                                            title: 'Zutaten sind auf der Einkaufsliste',
                                        }
                                      : { type: 'error', title: added.error },
                              );
                          },
                      }
                    : undefined,
        });
        onClose();
        onApplied({ planned, skipped, entryIds });
    };

    const kindPicks = state.picks.filter((pick) => pick.kind === kind);
    const tabLabel = tabs.find((tab) => tab.kind === kind)?.label;

    return (
        <>
            <DialogHead startDate={data.startDate} onClose={onClose} />
            <SlotPicker selection={selection} days={data.days} slots={data.slots} />
            <KindTabs tabs={tabs} active={kind} onChange={selection.setKind} />
            <div
                ref={scrollRef}
                className={css({
                    flex: 1,
                    minH: 0,
                    overflowY: 'auto',
                    overscrollBehavior: 'contain',
                    px: { base: '4', md: '6' },
                })}
            >
                {tabs.length === 0 ? (
                    <p className={css({ py: '10', textAlign: 'center', color: 'text.muted' })}>
                        {Object.keys(selection.free).length === 0
                            ? 'In dieser Woche ist kein Platz mehr frei.'
                            : 'Wähle oben mindestens eine Mahlzeit und einen Tag.'}
                    </p>
                ) : (
                    <RecipeSearchView
                        state={filterState}
                        results={results}
                        filterOptions={data.startData.filterOptions}
                        filterSets={data.startData.filterSets}
                        themes={data.startData.themes}
                        currentSeason={data.startData.currentSeason}
                        isLoggedIn
                        personal={data.personal}
                        title={tabLabel}
                        titleAs="h2"
                        sortOptions={SORT_OPTIONS}
                        hiddenSections={['categories']}
                        scrollElement={scrollRef}
                        sidebarTop="0px"
                        leading={kindPicks.map((pick) => pick.recipe)}
                        renderCardSelection={(recipe) => cardSelection(recipe, kind)}
                        listFooter={
                            kind === 'main' ? (
                                <TryAlsoRow
                                    cards={
                                        tryRow?.filter((card) => !pickIds.includes(card.id)) ?? null
                                    }
                                    renderSelection={(recipe) =>
                                        cardSelection(recipe, 'main', { tryRow: true })
                                    }
                                />
                            ) : undefined
                        }
                    />
                )}
            </div>
            <SelectionBar
                picks={state.picks}
                tabs={tabs}
                onApply={apply}
                applying={selection.applying}
                error={applyError}
            />
        </>
    );
}
