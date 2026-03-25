'use client';

import { Star, ChevronDown } from 'lucide-react';
import { Accordion, ToggleGroup, Tooltip } from 'radix-ui';
import { useMemo, type ReactNode } from 'react';

import type { FilterSetWithRelations } from '@app/lib/fits-now/db-queries';
import { SEASON_LABELS, TIME_SLOT_LABELS } from '@app/lib/fits-now/labels';
import type { RecipeFilterSearchParams } from '@app/lib/recipeFilters';

import { css } from 'styled-system/css';

import type { CategoryOption } from '../actions';

import { RangeControl } from './FilterSidebar/components/RangeControl';
import { SearchableFilterChips, type FilterChipItem } from './SearchableFilterChips';
import type { RecipeSearchFacets } from './useRecipeSearch';

type FilterSidebarProps = {
    filters: RecipeFilterSearchParams;
    options: {
        tags: string[];
        ingredients: string[];
        categories: CategoryOption[];
    };
    facets?: RecipeSearchFacets;
    onFiltersChange: (next: Partial<RecipeFilterSearchParams>) => void;
    loading?: boolean;
    filterSets?: FilterSetWithRelations[];
    onFilterSetToggle?: (filterSet: FilterSetWithRelations) => void;
    /** Strip container chrome (border, shadow, scroll) when embedded inside another panel */
    embedded?: boolean;
};

const DIFFICULTY_OPTIONS = [
    { value: 'EASY', label: 'Einfach' },
    { value: 'MEDIUM', label: 'Mittel' },
    { value: 'HARD', label: 'Schwer' },
];

const RANGE_FALLBACKS = {
    totalTime: { min: 0, max: 180, interval: 5 },
    prepTime: { min: 0, max: 90, interval: 5 },
    cookTime: { min: 0, max: 120, interval: 5 },
    stepCount: { min: 1, max: 20, interval: 2 },
    calories: { min: 0, max: 2000, interval: 100 },
    rating: { min: 0, max: 5, interval: 0.5 },
    cookCount: { min: 0, max: 200, interval: 10 },
};

const FILTER_SECTION_IDS = {
    schnellfilter: 'schnellfilter',
    tags: 'tags',
    categories: 'categories',
    ingredients: 'ingredients',
    exclude: 'exclude',
    difficulty: 'difficulty',
    timing: 'timing',
    rating: 'rating',
} as const;

function getFilterSetLabel(fs: FilterSetWithRelations): string {
    if (fs.displayLabel) return fs.displayLabel;
    if (fs.label) return fs.label;
    if (fs.timeSlot && fs.season) {
        const slot = (TIME_SLOT_LABELS as Record<string, string>)[fs.timeSlot] ?? fs.timeSlot;
        const season = (SEASON_LABELS as Record<string, string>)[fs.season] ?? fs.season;
        return `${slot} (${season})`;
    }
    if (fs.slug) return fs.slug;
    return 'Filter';
}

const normalizeTag = (value: string) => value.trim().toLowerCase();

const accordionRootClass = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '3',
});

const accordionItemClass = css({
    borderRadius: '2xl',
    border: '1px solid',
    borderColor: 'border.muted',
    background: 'surface',
    overflow: 'hidden',
});

const accordionHeaderClass = css({ width: '100%' });

const accordionTriggerClass = css({
    all: 'unset',
    width: '100%',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '3',
    px: '3',
    py: '3',
    cursor: 'pointer',
    background: 'surface',
    transition: 'background 150ms ease',
    '&[data-state="open"]': {
        background: 'surface',
        borderBottom: '1px solid',
        borderColor: 'border.muted',
    },
    '& svg': {
        transition: 'transform 200ms ease',
    },
    '&[data-state="open"] svg': {
        transform: 'rotate(180deg)',
    },
});

const accordionContentClass = css({
    borderColor: 'border.muted',
    overflow: 'hidden',
    background: 'surface',
    '&[data-state="open"]': {
        animation: 'slideDown 250ms ease-out',
    },
    '&[data-state="closed"]': {
        animation: 'slideUpCollapse 200ms ease-in forwards',
    },
});

const accordionContentInnerClass = css({
    px: '2.5',
    py: '3',
    display: 'flex',
    flexDirection: 'column',
    gap: '4',
});

const accordionTitleClass = css({
    fontSize: 'xs',
    textTransform: 'uppercase',
    letterSpacing: 'widest',
    color: 'primary',
    fontWeight: '600',
});

const accordionDescriptionClass = css({
    fontSize: 'xs',
    color: 'foreground.muted',
});

const accordionChevronClass = css({
    width: '16px',
    height: '16px',
    flexShrink: 0,
    color: 'foreground.muted',
});

const accordionActiveBadgeClass = css({
    width: '8px',
    height: '8px',
    borderRadius: 'full',
    background: 'primary',
    flexShrink: 0,
});

const chipGroupClass = css({
    display: 'flex',
    flexWrap: 'wrap',
    gap: '2',
});

const chipItemClass = css({
    borderRadius: 'full',
    px: '2.5',
    py: '1',
    fontSize: 'xs',
    border: '1px solid',
    borderColor: 'border.muted',
    background: 'surface',
    color: 'foreground',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '1.5',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'border 150ms ease, box-shadow 150ms ease, background 150ms ease',
    '&[data-state="on"]': {
        borderColor: 'primary',
        background: 'accent.soft',
        color: 'primary',
        boxShadow: {
            base: '0 4px 12px rgba(224,123,83,0.15)',
            _dark: '0 4px 12px rgba(224,123,83,0.12)',
        },
    },
});

const filterSetChipRowClass = css({
    display: 'flex',
    gap: '2',
    overflowX: 'auto',
    pb: '2',
    scrollbarWidth: 'none',
    '&::-webkit-scrollbar': { display: 'none' },
});

const filterSetChipBaseClass = css({
    borderRadius: 'full',
    px: '3',
    py: '1.5',
    fontSize: 'xs',
    fontWeight: '600',
    border: '1px solid',
    cursor: 'pointer',
    transition: 'all 150ms ease',
    whiteSpace: 'nowrap',
    flexShrink: 0,
});

const filterSetChipActiveClass = css({
    borderColor: 'accent',
    background: 'accent',
    color: 'white',
});

const filterSetChipInactiveClass = css({
    borderColor: 'border.muted',
    background: 'surface',
    color: 'foreground',
});

const FilterSection = ({
    value,
    title,
    description,
    children,
    activeCount = 0,
}: {
    value: string;
    title: string;
    description?: string;
    children: ReactNode;
    activeCount?: number;
}) => (
    <Accordion.Item value={value} className={accordionItemClass}>
        <Accordion.Header className={accordionHeaderClass}>
            <Accordion.Trigger className={accordionTriggerClass}>
                <div
                    className={css({
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5',
                        flex: 1,
                    })}
                >
                    <div className={css({ display: 'flex', alignItems: 'center', gap: '2' })}>
                        <p className={accordionTitleClass}>{title}</p>
                        {activeCount > 0 && <span className={accordionActiveBadgeClass} />}
                    </div>
                    {description && <p className={accordionDescriptionClass}>{description}</p>}
                </div>
                <ChevronDown aria-hidden className={accordionChevronClass} />
            </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content className={accordionContentClass}>
            <div className={accordionContentInnerClass}>{children}</div>
        </Accordion.Content>
    </Accordion.Item>
);

export function FilterSidebar({
    filters,
    options,
    facets,
    onFiltersChange,
    loading,
    filterSets,
    onFilterSetToggle,
    embedded,
}: FilterSidebarProps) {
    const ingredients = options.ingredients;
    const tags = options.tags;

    // Sort and filter tags: selected first, then by count descending
    const tagFacets = facets?.tags;
    const ingredientFacets = facets?.ingredients;

    // Build count maps from current facets
    const tagCountMap = useMemo(() => {
        const map = new Map<string, number>();
        tagFacets?.forEach((facet) => {
            if (!facet.key) return;
            map.set(facet.key, facet.count);
            map.set(normalizeTag(facet.key), facet.count);
        });
        return map;
    }, [tagFacets]);

    const ingredientCountMap = useMemo(() => {
        const map = new Map<string, number>();
        ingredientFacets?.forEach((facet) => {
            if (!facet.key) return;
            map.set(facet.key, facet.count);
            map.set(normalizeTag(facet.key), facet.count);
        });
        return map;
    }, [ingredientFacets]);

    // Build tag items - show '-' count when loading and count is unavailable
    const sortedTags = useMemo((): FilterChipItem[] => {
        const selectedTags = filters.tags ?? [];
        return tags.map((tag) => {
            const normalized = normalizeTag(tag);
            const isSelected = selectedTags.includes(tag);

            // Get count from facets - use -1 to indicate "loading/unknown" when appropriate
            const rawCount = tagCountMap.get(tag) ?? tagCountMap.get(normalized);
            let count: number;
            if (rawCount !== undefined) {
                count = rawCount;
            } else if (loading && isSelected) {
                // While loading, show -1 to indicate "updating" for selected items
                count = -1;
            } else {
                count = 0;
            }

            return {
                name: tag,
                count,
                selected: isSelected,
            };
        });
    }, [tags, tagCountMap, filters.tags, loading]);

    const ingredientOptionNames = useMemo(() => {
        const selected = [...(filters.ingredients ?? []), ...(filters.excludeIngredients ?? [])];
        const facetKeys =
            ingredientFacets
                ?.map((facet) => facet.key)
                .filter((key): key is string => Boolean(key)) ?? [];
        return Array.from(new Set([...ingredients, ...selected, ...facetKeys]));
    }, [ingredients, ingredientFacets, filters.ingredients, filters.excludeIngredients]);

    // Build ingredient items - show '-' count when loading and count is unavailable
    const sortedIngredients = useMemo((): FilterChipItem[] => {
        const selectedIngredients = filters.ingredients ?? [];
        return ingredientOptionNames.map((name: string) => {
            const normalized = normalizeTag(name);
            const isSelected = selectedIngredients.includes(name);

            // Get count from facets - use -1 to indicate "loading/unknown" when appropriate
            const rawCount = ingredientCountMap.get(name) ?? ingredientCountMap.get(normalized);
            let count: number;
            if (rawCount !== undefined) {
                count = rawCount;
            } else if (loading && isSelected) {
                // While loading, show -1 to indicate "updating" for selected items
                count = -1;
            } else {
                count = 0;
            }

            return {
                name,
                count,
                selected: isSelected,
            };
        });
    }, [ingredientOptionNames, ingredientCountMap, filters.ingredients, loading]);

    const sortedExcludeIngredients = useMemo((): FilterChipItem[] => {
        const selectedExclude = filters.excludeIngredients ?? [];
        return ingredientOptionNames.map((name: string) => {
            const normalized = normalizeTag(name);
            const isSelected = selectedExclude.includes(name);

            // Get count from facets - use -1 to indicate "loading/unknown" when appropriate
            const rawCount = ingredientCountMap.get(name) ?? ingredientCountMap.get(normalized);
            let count: number;
            if (rawCount !== undefined) {
                count = rawCount;
            } else if (loading && isSelected) {
                // While loading, show -1 to indicate "updating" for selected items
                count = -1;
            } else {
                count = 0;
            }

            return {
                name,
                count,
                selected: isSelected,
            };
        });
    }, [ingredientOptionNames, ingredientCountMap, filters.excludeIngredients, loading]);

    const activeSectionCounts = useMemo(() => {
        const hasActiveTags = (filters.tags?.length ?? 0) > 0;
        const hasActiveCategories = (filters.categories?.length ?? 0) > 0;
        const hasActiveIngredients = (filters.ingredients?.length ?? 0) > 0;
        const hasActiveExclude = (filters.excludeIngredients?.length ?? 0) > 0;
        const hasActiveDifficulty = (filters.difficulty?.length ?? 0) > 0;
        const hasActiveTotalTime =
            typeof filters.minTotalTime === 'number' || typeof filters.maxTotalTime === 'number';
        const hasActivePrepTime =
            typeof filters.minPrepTime === 'number' || typeof filters.maxPrepTime === 'number';
        const hasActiveCookTime =
            typeof filters.minCookTime === 'number' || typeof filters.maxCookTime === 'number';
        const hasActiveStepCount =
            typeof filters.minStepCount === 'number' || typeof filters.maxStepCount === 'number';
        const hasActiveRating = typeof filters.minRating === 'number';
        const hasActiveCookCount = typeof filters.minCookCount === 'number';
        const hasActiveCalories =
            typeof filters.minCalories === 'number' || typeof filters.maxCalories === 'number';

        return {
            tags: hasActiveTags ? 1 : 0,
            categories: hasActiveCategories ? (filters.categories?.length ?? 0) : 0,
            ingredients: hasActiveIngredients ? (filters.ingredients?.length ?? 0) : 0,
            exclude: hasActiveExclude ? (filters.excludeIngredients?.length ?? 0) : 0,
            difficulty:
                (hasActiveDifficulty ? (filters.difficulty?.length ?? 0) : 0) +
                (hasActiveStepCount ? 1 : 0),
            timing:
                (hasActiveTotalTime ? 1 : 0) +
                (hasActivePrepTime ? 1 : 0) +
                (hasActiveCookTime ? 1 : 0),
            rating:
                (hasActiveRating ? 1 : 0) +
                (hasActiveCookCount ? 1 : 0) +
                (hasActiveCalories ? 1 : 0),
        };
    }, [filters]);

    return (
        <Tooltip.Provider delayDuration={300}>
            <div
                className={css(
                    embedded
                        ? { width: 'full' }
                        : {
                              padding: '4',
                              borderRadius: '2xl',
                              border: '1px solid',
                              borderColor: 'border.muted',
                              background: 'surface',
                              boxShadow: {
                                  base: '0 8px 32px rgba(0,0,0,0.08)',
                                  _dark: '0 8px 32px rgba(0,0,0,0.3)',
                              },
                              width: 'full',
                              maxHeight: 'calc(100vh - 2rem)',
                              overflowY: 'auto',
                          },
                )}
            >
                <Accordion.Root
                    type="multiple"
                    defaultValue={[
                        ...(filterSets && filterSets.length > 0
                            ? [FILTER_SECTION_IDS.schnellfilter]
                            : []),
                        FILTER_SECTION_IDS.tags,
                    ]}
                    className={accordionRootClass}
                >
                    {filterSets && filterSets.length > 0 && onFilterSetToggle && (
                        <FilterSection
                            value={FILTER_SECTION_IDS.schnellfilter}
                            title="Schnell-Filter"
                            description="Vorgefertigte Themen"
                            activeCount={filters.filterSetId ? 1 : 0}
                        >
                            <div className={filterSetChipRowClass}>
                                {filterSets.map((fs) => {
                                    const isActive = filters.filterSetId === fs.id;
                                    return (
                                        <button
                                            key={fs.id}
                                            type="button"
                                            onClick={() => onFilterSetToggle(fs)}
                                            className={`${filterSetChipBaseClass} ${isActive ? filterSetChipActiveClass : filterSetChipInactiveClass}`}
                                        >
                                            {getFilterSetLabel(fs)}
                                        </button>
                                    );
                                })}
                            </div>
                        </FilterSection>
                    )}

                    <FilterSection
                        value={FILTER_SECTION_IDS.tags}
                        title="Tags"
                        description="Beliebte Themen"
                        activeCount={activeSectionCounts.tags}
                    >
                        <SearchableFilterChips
                            items={sortedTags}
                            selectedValues={filters.tags ?? []}
                            onSelectionChange={(next: string[]) =>
                                onFiltersChange({ tags: next } as Partial<RecipeFilterSearchParams>)
                            }
                            placeholder="Tags suchen..."
                            emptyMessage="Keine Tags gefunden."
                            ariaLabel="Tags filtern"
                            suggestField="tags"
                            showHashIcon
                        />
                    </FilterSection>

                    <FilterSection
                        value={FILTER_SECTION_IDS.categories}
                        title="Kategorien"
                        activeCount={activeSectionCounts.categories}
                    >
                        <ToggleGroup.Root
                            type="multiple"
                            className={chipGroupClass}
                            aria-label="Kategorien filtern"
                            value={filters.categories ?? []}
                            onValueChange={(next: string[]) =>
                                onFiltersChange({
                                    categories: next,
                                } as Partial<RecipeFilterSearchParams>)
                            }
                        >
                            {options.categories.map((cat) => (
                                <ToggleGroup.Item
                                    key={cat.slug}
                                    value={cat.slug}
                                    className={chipItemClass}
                                >
                                    {cat.name}
                                </ToggleGroup.Item>
                            ))}
                        </ToggleGroup.Root>
                    </FilterSection>

                    <FilterSection
                        value={FILTER_SECTION_IDS.ingredients}
                        title="Zutaten"
                        description="Nur Gerichte mit den richtigen Zutaten"
                        activeCount={activeSectionCounts.ingredients}
                    >
                        <SearchableFilterChips
                            items={sortedIngredients}
                            selectedValues={filters.ingredients ?? []}
                            onSelectionChange={(next: string[]) =>
                                onFiltersChange({
                                    ingredients: next,
                                } as Partial<RecipeFilterSearchParams>)
                            }
                            placeholder="Zutaten durchsuchen..."
                            emptyMessage="Keine Zutaten gefunden."
                            ariaLabel="Zutaten filtern"
                            suggestField="ingredients"
                        />
                    </FilterSection>

                    <FilterSection
                        value={FILTER_SECTION_IDS.exclude}
                        title="Enthält nicht"
                        activeCount={activeSectionCounts.exclude}
                    >
                        <SearchableFilterChips
                            items={sortedExcludeIngredients}
                            selectedValues={filters.excludeIngredients ?? []}
                            onSelectionChange={(next: string[]) =>
                                onFiltersChange({
                                    excludeIngredients: next,
                                } as Partial<RecipeFilterSearchParams>)
                            }
                            placeholder="Zutaten ausschließen..."
                            emptyMessage="Keine Zutaten gefunden."
                            ariaLabel="Zutaten ausschließen"
                            variant="exclude"
                            suggestField="ingredients"
                        />
                    </FilterSection>

                    <FilterSection
                        value={FILTER_SECTION_IDS.difficulty}
                        title="Schwierigkeit & Aufwand"
                        activeCount={activeSectionCounts.difficulty}
                    >
                        <ToggleGroup.Root
                            type="multiple"
                            className={chipGroupClass}
                            aria-label="Schwierigkeitsgrad filtern"
                            value={filters.difficulty ?? []}
                            onValueChange={(next: string[]) =>
                                onFiltersChange({
                                    difficulty: next,
                                } as Partial<RecipeFilterSearchParams>)
                            }
                        >
                            {DIFFICULTY_OPTIONS.map((option) => (
                                <ToggleGroup.Item
                                    key={option.value}
                                    value={option.value}
                                    className={chipItemClass}
                                >
                                    {option.label}
                                </ToggleGroup.Item>
                            ))}
                        </ToggleGroup.Root>
                        <RangeControl
                            filters={filters}
                            onFiltersChange={onFiltersChange}
                            label="Schritte"
                            description="Anzahl Zubereitungsschritte"
                            minField="minStepCount"
                            maxField="maxStepCount"
                            fallback={RANGE_FALLBACKS.stepCount}
                            facet={facets?.stepCount}
                            formatValue={(value: number) => `${Math.round(value)}`}
                        />
                    </FilterSection>

                    <FilterSection
                        value={FILTER_SECTION_IDS.timing}
                        title="Dauer"
                        activeCount={activeSectionCounts.timing}
                    >
                        <div className={css({ display: 'grid', gap: '3' })}>
                            <RangeControl
                                filters={filters}
                                onFiltersChange={onFiltersChange}
                                label="Gesamtdauer"
                                description="Verfügbar nach Anzahl Rezepte"
                                minField="minTotalTime"
                                maxField="maxTotalTime"
                                fallback={RANGE_FALLBACKS.totalTime}
                                facet={facets?.totalTime}
                                unit="Min."
                            />
                            <RangeControl
                                filters={filters}
                                onFiltersChange={onFiltersChange}
                                label="Vorbereitungszeit"
                                description="Optimal planen"
                                minField="minPrepTime"
                                maxField="maxPrepTime"
                                fallback={RANGE_FALLBACKS.prepTime}
                                facet={facets?.prepTime}
                                unit="Min."
                            />
                            <RangeControl
                                filters={filters}
                                onFiltersChange={onFiltersChange}
                                label="Kochzeit"
                                description="Verfügbarkeit prüfen"
                                minField="minCookTime"
                                maxField="maxCookTime"
                                fallback={RANGE_FALLBACKS.cookTime}
                                facet={facets?.cookTime}
                                unit="Min."
                            />
                        </div>
                    </FilterSection>

                    <FilterSection
                        value={FILTER_SECTION_IDS.rating}
                        title="Bewertung & Beliebt"
                        activeCount={activeSectionCounts.rating}
                    >
                        <div className={css({ display: 'grid', gap: '3' })}>
                            <RangeControl
                                filters={filters}
                                onFiltersChange={onFiltersChange}
                                label="Min. Bewertung"
                                description="Mindestens so gut bewertet"
                                minField="minRating"
                                fallback={RANGE_FALLBACKS.rating}
                                facet={facets?.rating}
                                step={0.5}
                                formatValue={(value: number) => (
                                    <span
                                        className={css({
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '1',
                                        })}
                                    >
                                        {value.toFixed(1)}
                                        <Star
                                            size={12}
                                            className={css({ color: 'palette.gold' })}
                                        />
                                    </span>
                                )}
                            />
                            <RangeControl
                                filters={filters}
                                onFiltersChange={onFiltersChange}
                                label="Mind. zubereitet"
                                description="häufig ausprobiert"
                                minField="minCookCount"
                                fallback={RANGE_FALLBACKS.cookCount}
                                facet={facets?.cookCount}
                                unit="x"
                                formatValue={(value: number) => `${Math.round(value)}x`}
                            />
                            <RangeControl
                                filters={filters}
                                onFiltersChange={onFiltersChange}
                                label="Kalorien"
                                description="Pro Portion (kcal)"
                                minField="minCalories"
                                maxField="maxCalories"
                                fallback={RANGE_FALLBACKS.calories}
                                facet={facets?.calories}
                                unit="kcal"
                                formatValue={(value: number) => `${Math.round(value)} kcal`}
                            />
                        </div>
                    </FilterSection>
                </Accordion.Root>
            </div>
        </Tooltip.Provider>
    );
}
