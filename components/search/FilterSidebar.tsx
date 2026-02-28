'use client';

import { Star, ChevronDown } from 'lucide-react';
import { Accordion, ToggleGroup, Tooltip } from 'radix-ui';
import { useMemo, type ReactNode } from 'react';

import type { CategoryOption } from '@/app/actions/filters';
import type { RecipeFilterSearchParams } from '@/lib/recipeFilters';
import { css } from 'styled-system/css';

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
};

const MEAL_TYPE_OPTIONS = [
    { value: 'Frühstück', label: 'Frühstück' },
    { value: 'Mittagessen', label: 'Mittagessen' },
    { value: 'Abendessen', label: 'Abendessen' },
    { value: 'Snack', label: 'Snack' },
    { value: 'Dessert', label: 'Dessert' },
];

const TIME_OF_DAY_OPTIONS = [
    { value: 'morgen', label: 'Morgen' },
    { value: 'mittag', label: 'Mittag' },
    { value: 'nachmittag', label: 'Nachmittag' },
    { value: 'abend', label: 'Abend' },
    { value: 'snack', label: 'Snack' },
];

const DIFFICULTY_OPTIONS = [
    { value: 'EASY', label: 'Einfach' },
    { value: 'MEDIUM', label: 'Mittel' },
    { value: 'HARD', label: 'Schwer' },
];

const RANGE_FALLBACKS = {
    totalTime: { min: 0, max: 180, interval: 5 },
    prepTime: { min: 0, max: 90, interval: 5 },
    cookTime: { min: 0, max: 120, interval: 5 },
    rating: { min: 0, max: 5, interval: 0.5 },
    cookCount: { min: 0, max: 200, interval: 10 },
};

const FILTER_SECTION_IDS = {
    tags: 'tags',
    mealType: 'meal-type',
    ingredients: 'ingredients',
    exclude: 'exclude',
    difficulty: 'difficulty',
    timing: 'timing',
    rating: 'rating',
} as const;

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
    px: '4',
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
    px: '4',
    py: '4',
    display: 'flex',
    flexDirection: 'column',
    gap: '4',
    background: 'surface',
    '&[data-state="closed"]': {
        display: 'none',
    },
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
    px: '3',
    py: '2',
    minHeight: '44px',
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
        boxShadow: '0 4px 12px rgba(224,123,83,0.15)',
    },
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
        <Accordion.Content className={accordionContentClass}>{children}</Accordion.Content>
    </Accordion.Item>
);

export function FilterSidebar({
    filters,
    options,
    facets,
    onFiltersChange,
    loading,
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
        const hasActiveMealType = (filters.mealTypes?.length ?? 0) > 0;
        const hasActiveIngredients = (filters.ingredients?.length ?? 0) > 0;
        const hasActiveExclude = (filters.excludeIngredients?.length ?? 0) > 0;
        const hasActiveDifficulty = (filters.difficulty?.length ?? 0) > 0;
        const hasActiveTimeOfDay = (filters.timeOfDay?.length ?? 0) > 0;
        const hasActiveTotalTime =
            typeof filters.minTotalTime === 'number' || typeof filters.maxTotalTime === 'number';
        const hasActivePrepTime =
            typeof filters.minPrepTime === 'number' || typeof filters.maxPrepTime === 'number';
        const hasActiveCookTime =
            typeof filters.minCookTime === 'number' || typeof filters.maxCookTime === 'number';
        const hasActiveRating = typeof filters.minRating === 'number';
        const hasActiveCookCount = typeof filters.minCookCount === 'number';

        return {
            tags: hasActiveTags ? 1 : 0,
            mealType: hasActiveMealType ? (filters.mealTypes?.length ?? 0) : 0,
            ingredients: hasActiveIngredients ? (filters.ingredients?.length ?? 0) : 0,
            exclude: hasActiveExclude ? (filters.excludeIngredients?.length ?? 0) : 0,
            difficulty: hasActiveDifficulty ? (filters.difficulty?.length ?? 0) : 0,
            timing:
                (hasActiveTimeOfDay ? (filters.timeOfDay?.length ?? 0) : 0) +
                (hasActiveTotalTime ? 1 : 0) +
                (hasActivePrepTime ? 1 : 0) +
                (hasActiveCookTime ? 1 : 0),
            rating: (hasActiveRating ? 1 : 0) + (hasActiveCookCount ? 1 : 0),
        };
    }, [filters]);

    return (
        <Tooltip.Provider delayDuration={300}>
            <div
                className={css({
                    padding: '4',
                    borderRadius: '2xl',
                    border: '1px solid',
                    borderColor: 'border.muted',
                    background: 'surface',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                    width: 'full',
                })}
            >
                <Accordion.Root
                    type="multiple"
                    defaultValue={[FILTER_SECTION_IDS.tags]}
                    className={accordionRootClass}
                >
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
                        />
                    </FilterSection>

                    <FilterSection
                        value={FILTER_SECTION_IDS.mealType}
                        title="Mahlzeit"
                        description="Abgestimmt auf deinen Rhythmus"
                        activeCount={activeSectionCounts.mealType}
                    >
                        <ToggleGroup.Root
                            type="multiple"
                            className={chipGroupClass}
                            aria-label="Mahlzeiten filtern"
                            value={filters.mealTypes ?? []}
                            onValueChange={(next: string[]) =>
                                onFiltersChange({
                                    mealTypes: next,
                                } as Partial<RecipeFilterSearchParams>)
                            }
                        >
                            {MEAL_TYPE_OPTIONS.map((option) => (
                                <ToggleGroup.Item
                                    key={option.value}
                                    value={option.value}
                                    className={chipItemClass}
                                >
                                    {option.label}
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
                        />
                    </FilterSection>

                    <FilterSection
                        value={FILTER_SECTION_IDS.difficulty}
                        title="Schwierigkeit"
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
                    </FilterSection>

                    <FilterSection
                        value={FILTER_SECTION_IDS.timing}
                        title="Tageszeit & Dauer"
                        description="Zeitfenster schnell auswählen"
                        activeCount={activeSectionCounts.timing}
                    >
                        <ToggleGroup.Root
                            type="multiple"
                            className={chipGroupClass}
                            aria-label="Tageszeit filtern"
                            value={filters.timeOfDay ?? []}
                            onValueChange={(next: string[]) =>
                                onFiltersChange({
                                    timeOfDay: next,
                                } as Partial<RecipeFilterSearchParams>)
                            }
                        >
                            {TIME_OF_DAY_OPTIONS.map((option) => (
                                <ToggleGroup.Item
                                    key={option.value}
                                    value={option.value}
                                    className={chipItemClass}
                                >
                                    {option.label}
                                </ToggleGroup.Item>
                            ))}
                        </ToggleGroup.Root>
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
                                        <Star size={12} className={css({ color: '#f8b500' })} />
                                    </span>
                                )}
                            />
                            <RangeControl
                                filters={filters}
                                onFiltersChange={onFiltersChange}
                                label="Mind. gekocht"
                                description="häufig ausprobiert"
                                minField="minCookCount"
                                fallback={RANGE_FALLBACKS.cookCount}
                                facet={facets?.cookCount}
                                unit="x"
                                formatValue={(value: number) => `${Math.round(value)}x`}
                            />
                        </div>
                    </FilterSection>
                </Accordion.Root>
            </div>
        </Tooltip.Provider>
    );
}
