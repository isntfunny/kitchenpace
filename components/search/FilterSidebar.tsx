'use client';

import * as Accordion from '@radix-ui/react-accordion';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import * as Slider from '@radix-ui/react-slider';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { useMemo, useState, type ReactNode } from 'react';

import type { CategoryOption } from '@/app/actions/filters';
import type { RecipeFilterSearchParams } from '@/lib/recipeFilters';
import { css, cx } from 'styled-system/css';

import type { HistogramFacet, RecipeSearchFacets } from './useRecipeSearch';

type FilterSidebarProps = {
    filters: RecipeFilterSearchParams;
    options: {
        tags: string[];
        ingredients: string[];
        categories: CategoryOption[];
    };
    facets?: RecipeSearchFacets;
    onFiltersChange: (next: Partial<RecipeFilterSearchParams>) => void;
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
    totalTime: { min: 0, max: 180, interval: 10 },
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
    borderColor: 'light',
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
        background: 'surface.elevated',
    },
    '& svg': {
        transition: 'transform 200ms ease',
    },
    '&[data-state="open"] svg': {
        transform: 'rotate(180deg)',
    },
});

const accordionContentClass = css({
    borderTop: '1px solid',
    borderColor: 'light',
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
    color: 'text-muted',
});

const accordionDescriptionClass = css({
    fontSize: 'xs',
    color: 'text-muted',
});

const accordionChevronClass = css({
    width: '16px',
    height: '16px',
    flexShrink: 0,
    color: 'text-muted',
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
    borderColor: 'light',
    background: 'surface',
    color: 'text',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '1.5',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'border 150ms ease, box-shadow 150ms ease, background 150ms ease',
    '&[data-state="on"]': {
        borderColor: 'primary-dark',
        background: 'primary',
        color: 'light',
        boxShadow: '0 8px 16px rgba(0,0,0,0.08)',
    },
});

const chipBadgeClass = css({
    fontSize: 'xs',
    background: 'rgba(249,115,22,0.12)',
    borderRadius: 'full',
    px: '2',
    py: '0.5',
});

const chipBadgeMutedClass = css({
    fontSize: 'xs',
    padding: '0.25 0.5',
    borderRadius: 'full',
    background: 'transparent',
    border: '1px solid',
    borderColor: 'light',
    color: 'text-muted',
});

const chipZeroClass = css({
    color: 'text-muted',
    borderColor: 'light',
    background: 'surface',
});

const chipRemoveIconClass = css({
    fontSize: 'sm',
    lineHeight: '1',
    opacity: 0.85,
});

const tagSearchInputClass = css({
    width: '100%',
    borderRadius: 'lg',
    border: '1px solid',
    borderColor: 'light',
    background: 'surface',
    px: '3',
    py: '2',
    fontSize: 'sm',
    marginBottom: '2',
    '&::placeholder': {
        color: 'text-muted',
    },
});

const tagScrollContainerClass = css({
    maxHeight: '200px',
    overflowY: 'auto',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '2',
    '&::-webkit-scrollbar': {
        width: '6px',
    },
    '&::-webkit-scrollbar-track': {
        background: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
        background: 'light',
        borderRadius: 'full',
    },
});

const removableChipClass = cx(
    chipItemClass,
    css({
        minHeight: '36px',
        fontSize: 'sm',
        px: '3',
        py: '1.5',
    }),
);

const sliderRootClass = css({
    position: 'relative',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    height: '10',
    touchAction: 'none',
    userSelect: 'none',
});

const sliderTrackClass = css({
    position: 'relative',
    flex: 1,
    height: '3',
    borderRadius: 'full',
    border: '1px solid',
    borderColor: 'light',
    background: 'surface',
    overflow: 'hidden',
});

const sliderRangeClass = css({
    position: 'absolute',
    height: '100%',
    background: 'primary',
    opacity: 0.3,
    borderRadius: 'inherit',
});

const sliderThumbClass = css({
    all: 'unset',
    width: '18px',
    height: '18px',
    borderRadius: 'full',
    background: 'primary',
    border: '2px solid white',
    boxShadow: '0 6px 12px rgba(0,0,0,0.18)',
    cursor: 'grab',
});

const FilterSection = ({
    value,
    title,
    description,
    children,
}: {
    value: string;
    title: string;
    description?: string;
    children: ReactNode;
}) => (
    <Accordion.Item value={value} className={accordionItemClass}>
        <Accordion.Header className={accordionHeaderClass}>
            <Accordion.Trigger className={accordionTriggerClass}>
                <div className={css({ display: 'flex', flexDirection: 'column', gap: '0.5' })}>
                    <p className={accordionTitleClass}>{title}</p>
                    {description && <p className={accordionDescriptionClass}>{description}</p>}
                </div>
                <ChevronDownIcon aria-hidden className={accordionChevronClass} />
            </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content className={accordionContentClass}>{children}</Accordion.Content>
    </Accordion.Item>
);

const buildHistogramGradient = (
    facet: HistogramFacet | undefined,
    min: number,
    max: number,
    interval: number,
) => {
    const buckets = facet?.buckets ?? [];
    if (buckets.length === 0 || max <= min) return undefined;

    const domainMin = min;
    const domainMax = max + interval;
    const range = domainMax - domainMin || interval;
    const sortedBuckets = [...buckets].sort((a, b) => a.key - b.key);
    const stops = sortedBuckets
        .map((bucket) => {
            const bucketStart = Math.max(domainMin, bucket.key);
            const bucketEnd = Math.min(domainMax, bucket.key + interval);
            if (bucketEnd <= bucketStart) return null;
            const startPercent = ((bucketStart - domainMin) / range) * 100;
            const endPercent = ((bucketEnd - domainMin) / range) * 100;
            return `rgba(249,115,22,0.55) ${startPercent}% ${endPercent}%`;
        })
        .filter(Boolean);

    if (stops.length === 0) return undefined;
    return `linear-gradient(90deg, ${stops.join(', ')})`;
};

type RangeControlProps = {
    filters: RecipeFilterSearchParams;
    onFiltersChange: (next: Partial<RecipeFilterSearchParams>) => void;
    label: string;
    description?: string;
    minField: keyof RecipeFilterSearchParams;
    maxField?: keyof RecipeFilterSearchParams;
    fallback: { min: number; max: number; interval: number };
    facet?: HistogramFacet;
    step?: number;
    unit?: string;
    formatValue?: (value: number) => string;
};

const RangeControl = ({
    filters,
    onFiltersChange,
    label,
    description,
    minField,
    maxField,
    fallback,
    facet,
    step,
    unit,
    formatValue,
}: RangeControlProps) => {
    const sliderMin = Math.min(fallback.min, facet?.min ?? fallback.min);
    const sliderMax =
        Math.max(fallback.max, facet?.max ?? fallback.max) + (facet?.interval ?? fallback.interval);
    const interval = facet?.interval ?? fallback.interval;
    const lowerFilterValue =
        typeof filters[minField] === 'number' ? (filters[minField] as number) : undefined;
    const upperFilterValue =
        maxField && typeof filters[maxField] === 'number'
            ? (filters[maxField] as number)
            : undefined;
    const { lowerValue, upperValue } = useMemo(() => {
        const rawLower = typeof lowerFilterValue === 'number' ? lowerFilterValue : sliderMin;
        const rawUpper = typeof upperFilterValue === 'number' ? upperFilterValue : sliderMax;
        const boundedLower = Math.min(Math.max(rawLower, sliderMin), sliderMax);
        const boundedUpper = Math.min(Math.max(rawUpper, sliderMin), sliderMax);
        return {
            lowerValue: Math.min(boundedLower, boundedUpper),
            upperValue: Math.max(boundedUpper, boundedLower),
        };
    }, [lowerFilterValue, upperFilterValue, sliderMin, sliderMax]);

    const gradient = useMemo(
        () => buildHistogramGradient(facet, sliderMin, sliderMax, interval),
        [facet, sliderMin, sliderMax, interval],
    );

    const format = formatValue ?? ((value: number) => `${value}${unit ? ` ${unit}` : ''}`);

    const applyRange = (lower: number, upper: number) => {
        const update: Partial<RecipeFilterSearchParams> = {};
        (update as Record<string, number | undefined>)[minField as string] =
            lower > sliderMin ? lower : undefined;
        if (maxField) {
            (update as Record<string, number | undefined>)[maxField as string] =
                upper < sliderMax ? upper : undefined;
        }
        onFiltersChange(update);
    };

    const sliderValue = maxField ? [lowerValue, upperValue] : [lowerValue];

    const handleSliderChange = (values: number[]) => {
        if (values.length === 0) return;
        if (maxField) {
            const [first, second = first] = values;
            const nextLower = Math.min(first, second);
            const nextUpper = Math.max(first, second);
            applyRange(nextLower, nextUpper);
        } else {
            applyRange(values[0], sliderMax);
        }
    };

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '2' })}>
            <div className={css({ display: 'flex', justifyContent: 'space-between', gap: '4' })}>
                <p className={css({ fontWeight: '600', fontSize: 'sm' })}>{label}</p>
                {description && (
                    <p className={css({ fontSize: 'xs', color: 'text-muted' })}>{description}</p>
                )}
            </div>
            <Slider.Root
                className={sliderRootClass}
                min={sliderMin}
                max={sliderMax}
                step={step ?? interval}
                value={sliderValue}
                onValueChange={handleSliderChange}
                aria-label={label}
            >
                <Slider.Track
                    className={sliderTrackClass}
                    style={gradient ? { backgroundImage: gradient } : undefined}
                >
                    <Slider.Range className={sliderRangeClass} />
                </Slider.Track>
                {sliderValue.map((_, index) => (
                    <Slider.Thumb
                        key={index === 0 ? 'min' : 'max'}
                        aria-label={`${label} ${index === 0 ? 'Minimum' : 'Maximum'}`}
                        className={sliderThumbClass}
                    />
                ))}
            </Slider.Root>
            <div
                className={css({
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 'xs',
                    color: 'text-muted',
                })}
            >
                <span>{format(lowerValue)}</span>
                <span>{format(upperValue)}</span>
            </div>
        </div>
    );
};

export function FilterSidebar({ filters, options, facets, onFiltersChange }: FilterSidebarProps) {
    const [ingredientQuery, setIngredientQuery] = useState('');
    const [excludeQuery, setExcludeQuery] = useState('');
    const [tagQuery, setTagQuery] = useState('');
    const ingredients = options.ingredients;
    const tags = options.tags;

    // Sort and filter tags: selected first, then by count descending
    const tagFacets = facets?.tags;

    const tagCountMap = useMemo(() => {
        const map = new Map<string, number>();
        tagFacets?.forEach((facet) => {
            if (!facet.key) return;
            map.set(facet.key, facet.count);
            map.set(normalizeTag(facet.key), facet.count);
        });
        return map;
    }, [tagFacets]);

    const sortedTags = useMemo(() => {
        const selectedTags = filters.tags ?? [];
        const tagData = tags.map((tag) => {
            const normalized = normalizeTag(tag);
            const count = tagCountMap.get(tag) ?? tagCountMap.get(normalized) ?? 0;
            return {
                name: tag,
                count,
                selected: selectedTags.includes(tag),
            };
        });

        // If there's a search query, filter first
        let filtered = tagData;
        if (tagQuery.trim()) {
            const query = tagQuery.toLowerCase().trim();
            filtered = tagData.filter((t) => t.name.toLowerCase().includes(query));
        }

        // Sort: selected first, then by count descending
        return filtered.sort((a, b) => {
            if (a.selected && !b.selected) return -1;
            if (!a.selected && b.selected) return 1;
            return b.count - a.count;
        });
    }, [tags, tagCountMap, tagQuery, filters.tags]);

    const ingredientSuggestions = useMemo(() => {
        const query = ingredientQuery.toLowerCase().trim();
        return ingredients
            .filter(
                (name) =>
                    name.toLowerCase().includes(query) &&
                    !(filters.ingredients ?? []).includes(name),
            )
            .slice(0, 6);
    }, [ingredientQuery, ingredients, filters.ingredients]);

    const excludeSuggestions = useMemo(() => {
        const query = excludeQuery.toLowerCase().trim();
        return ingredients
            .filter(
                (name) =>
                    name.toLowerCase().includes(query) &&
                    !(filters.excludeIngredients ?? []).includes(name),
            )
            .slice(0, 6);
    }, [excludeQuery, ingredients, filters.excludeIngredients]);

    const addIngredient = (value: string, field: 'ingredients' | 'excludeIngredients') => {
        const trimmed = value.trim();
        if (!trimmed) return;
        const existing = filters[field] ?? [];
        if (existing.includes(trimmed)) return;
        onFiltersChange({ [field]: [...existing, trimmed] });
        if (field === 'ingredients') {
            setIngredientQuery('');
        } else {
            setExcludeQuery('');
        }
    };

    return (
        <div
            className={css({
                padding: '4',
                borderRadius: '2xl',
                border: '1px solid',
                borderColor: 'light',
                background: 'surface.elevated',
                boxShadow: '0 24px 60px rgba(45,52,54,0.12)',
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
                >
                    <input
                        type="text"
                        value={tagQuery}
                        onChange={(e) => setTagQuery(e.target.value)}
                        placeholder="Tags suchen..."
                        className={tagSearchInputClass}
                    />
                    <div className={tagScrollContainerClass}>
                        <ToggleGroup.Root
                            type="multiple"
                            className={css({
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '2',
                                width: '100%',
                            })}
                            aria-label="Tags filtern"
                            value={filters.tags ?? []}
                            onValueChange={(next) =>
                                onFiltersChange({ tags: next } as Partial<RecipeFilterSearchParams>)
                            }
                        >
                            {sortedTags.map((tag) => {
                                const itemClass = cx(
                                    chipItemClass,
                                    tag.count === 0 && !tag.selected && chipZeroClass,
                                );
                                const badgeClass =
                                    tag.count === 0 ? chipBadgeMutedClass : chipBadgeClass;
                                return (
                                    <ToggleGroup.Item
                                        key={`tag-${tag.name}`}
                                        value={tag.name}
                                        className={itemClass}
                                    >
                                        <span>{tag.name}</span>
                                        <span className={badgeClass}>{tag.count}</span>
                                    </ToggleGroup.Item>
                                );
                            })}
                        </ToggleGroup.Root>
                    </div>
                </FilterSection>

                <FilterSection
                    value={FILTER_SECTION_IDS.mealType}
                    title="Mahlzeit"
                    description="Abgestimmt auf deinen Rhythmus"
                >
                    <ToggleGroup.Root
                        type="multiple"
                        className={chipGroupClass}
                        aria-label="Mahlzeiten filtern"
                        value={filters.mealTypes ?? []}
                        onValueChange={(next) =>
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
                >
                    <div className={css({ display: 'flex', flexDirection: 'column', gap: '3' })}>
                        <div className={css({ display: 'flex', gap: '2' })}>
                            <input
                                type="text"
                                value={ingredientQuery}
                                onChange={(event) => setIngredientQuery(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' && ingredientQuery.trim()) {
                                        event.preventDefault();
                                        addIngredient(ingredientQuery, 'ingredients');
                                    }
                                }}
                                placeholder="Zutat eingeben"
                                className={css({
                                    flex: 1,
                                    borderRadius: 'lg',
                                    border: '1px solid',
                                    borderColor: 'light',
                                    background: 'surface',
                                    px: '3',
                                    py: '2.5',
                                    fontSize: 'sm',
                                })}
                            />
                            <button
                                type="button"
                                onClick={() => addIngredient(ingredientQuery, 'ingredients')}
                                className={css({
                                    borderRadius: 'lg',
                                    background: 'primary',
                                    color: 'light',
                                    px: '4',
                                    py: '2.5',
                                    fontSize: 'sm',
                                    fontWeight: '600',
                                })}
                            >
                                Hinzufügen
                            </button>
                        </div>
                        {ingredientSuggestions.length > 0 && (
                            <div className={css({ display: 'grid', gap: '2' })}>
                                {ingredientSuggestions.map((name) => (
                                    <button
                                        type="button"
                                        key={`suggestion-${name}`}
                                        onClick={() => addIngredient(name, 'ingredients')}
                                        className={css({
                                            textAlign: 'left',
                                            fontSize: 'xs',
                                            color: 'text-muted',
                                            padding: '2',
                                            borderRadius: 'md',
                                            border: '1px solid',
                                            borderColor: 'light',
                                        })}
                                    >
                                        {name}
                                    </button>
                                ))}
                            </div>
                        )}
                        <ToggleGroup.Root
                            type="multiple"
                            className={chipGroupClass}
                            aria-label="Ausgewählte Zutaten"
                            value={filters.ingredients ?? []}
                            onValueChange={(next) =>
                                onFiltersChange({
                                    ingredients: next,
                                } as Partial<RecipeFilterSearchParams>)
                            }
                        >
                            {(filters.ingredients ?? []).map((ingredient) => (
                                <ToggleGroup.Item
                                    key={`selected-${ingredient}`}
                                    value={ingredient}
                                    className={removableChipClass}
                                >
                                    <span>{ingredient}</span>
                                    <span className={chipRemoveIconClass} aria-hidden>
                                        ×
                                    </span>
                                </ToggleGroup.Item>
                            ))}
                        </ToggleGroup.Root>
                    </div>
                </FilterSection>

                <FilterSection value={FILTER_SECTION_IDS.exclude} title="Enthält nicht">
                    <div className={css({ display: 'flex', flexDirection: 'column', gap: '3' })}>
                        <div className={css({ display: 'flex', gap: '2' })}>
                            <input
                                type="text"
                                value={excludeQuery}
                                onChange={(event) => setExcludeQuery(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' && excludeQuery.trim()) {
                                        event.preventDefault();
                                        addIngredient(excludeQuery, 'excludeIngredients');
                                    }
                                }}
                                placeholder="Allergene oder Zutaten"
                                className={css({
                                    flex: 1,
                                    borderRadius: 'lg',
                                    border: '1px solid',
                                    borderColor: 'light',
                                    background: 'surface',
                                    px: '3',
                                    py: '2.5',
                                    fontSize: 'sm',
                                })}
                            />
                            <button
                                type="button"
                                onClick={() => addIngredient(excludeQuery, 'excludeIngredients')}
                                className={css({
                                    borderRadius: 'lg',
                                    background: 'primary-dark',
                                    color: 'light',
                                    px: '4',
                                    py: '2.5',
                                    fontSize: 'sm',
                                    fontWeight: '600',
                                })}
                            >
                                Hinzufügen
                            </button>
                        </div>
                        {excludeSuggestions.length > 0 && (
                            <div className={css({ display: 'grid', gap: '2' })}>
                                {excludeSuggestions.map((name) => (
                                    <button
                                        type="button"
                                        key={`exclude-${name}`}
                                        onClick={() => addIngredient(name, 'excludeIngredients')}
                                        className={css({
                                            textAlign: 'left',
                                            fontSize: 'xs',
                                            color: 'text-muted',
                                            padding: '2',
                                            borderRadius: 'md',
                                            border: '1px solid',
                                            borderColor: 'light',
                                        })}
                                    >
                                        {name}
                                    </button>
                                ))}
                            </div>
                        )}
                        <ToggleGroup.Root
                            type="multiple"
                            className={chipGroupClass}
                            aria-label="Ausgeschlossene Zutaten"
                            value={filters.excludeIngredients ?? []}
                            onValueChange={(next) =>
                                onFiltersChange({
                                    excludeIngredients: next,
                                } as Partial<RecipeFilterSearchParams>)
                            }
                        >
                            {(filters.excludeIngredients ?? []).map((ingredient) => (
                                <ToggleGroup.Item
                                    key={`exclude-selected-${ingredient}`}
                                    value={ingredient}
                                    className={removableChipClass}
                                >
                                    <span>{ingredient}</span>
                                    <span className={chipRemoveIconClass} aria-hidden>
                                        ×
                                    </span>
                                </ToggleGroup.Item>
                            ))}
                        </ToggleGroup.Root>
                    </div>
                </FilterSection>

                <FilterSection value={FILTER_SECTION_IDS.difficulty} title="Schwierigkeit">
                    <ToggleGroup.Root
                        type="multiple"
                        className={chipGroupClass}
                        aria-label="Schwierigkeitsgrad filtern"
                        value={filters.difficulty ?? []}
                        onValueChange={(next) =>
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
                >
                    <ToggleGroup.Root
                        type="multiple"
                        className={chipGroupClass}
                        aria-label="Tageszeit filtern"
                        value={filters.timeOfDay ?? []}
                        onValueChange={(next) =>
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

                <FilterSection value={FILTER_SECTION_IDS.rating} title="Bewertung & Beliebt">
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
                            unit="★"
                            formatValue={(value) => `${value.toFixed(1)} ★`}
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
                            formatValue={(value) => `${Math.round(value)}x`}
                        />
                    </div>
                </FilterSection>
            </Accordion.Root>
        </div>
    );
}
