'use client';

import { useMemo, useState, type ChangeEvent, type ReactNode } from 'react';

import type { CategoryOption } from '@/app/actions/filters';
import type { RecipeFilterSearchParams } from '@/lib/recipeFilters';
import { css } from 'styled-system/css';

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

const FilterSection = ({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: ReactNode;
}) => (
    <section className={css({ display: 'flex', flexDirection: 'column', gap: '2.5' })}>
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '0.5' })}>
            <p
                className={css({
                    fontSize: 'xs',
                    letterSpacing: 'widest',
                    color: 'text-muted',
                    textTransform: 'uppercase',
                })}
            >
                {title}
            </p>
            {description && (
                <p className={css({ fontSize: 'xs', color: 'text-muted' })}>{description}</p>
            )}
        </div>
        <div>{children}</div>
    </section>
);

const Chip = ({
    active,
    children,
    badge,
    onClick,
}: {
    active?: boolean;
    children: ReactNode;
    badge?: ReactNode;
    onClick: () => void;
}) => (
    <button
        type="button"
        onClick={onClick}
        className={css({
            borderRadius: '999px',
            px: '3',
            py: '2',
            minHeight: '44px',
            fontSize: 'xs',
            border: '1px solid',
            borderColor: active ? 'primary-dark' : 'light',
            background: active ? 'primary' : 'surface',
            color: active ? 'light' : 'text',
            fontFamily: 'body',
            cursor: 'pointer',
            transition: 'border 150ms ease, box-shadow 150ms ease',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '1',
            _hover: {
                borderColor: 'primary-dark',
                boxShadow: '0 8px 16px rgba(0,0,0,0.08)',
            },
        })}
        aria-pressed={active || undefined}
    >
        <span>{children}</span>
        {badge && (
            <span
                className={css({
                    fontSize: 'xs',
                    background: 'rgba(249,115,22,0.12)',
                    borderRadius: 'full',
                    px: '2',
                    py: '0.5',
                })}
            >
                {badge}
            </span>
        )}
    </button>
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
        update[minField] = lower > sliderMin ? lower : undefined;
        const maxKey = maxField;
        if (maxKey) {
            update[maxKey] = upper < sliderMax ? upper : undefined;
        }
        onFiltersChange(update);
    };

    const handleLowerChange = (event: ChangeEvent<HTMLInputElement>) => {
        const nextValue = Number(event.target.value);
        if (Number.isNaN(nextValue)) return;
        const clamped = Math.min(
            Math.max(nextValue, sliderMin),
            Math.max(upperValue - interval, sliderMin),
        );
        applyRange(clamped, upperValue);
    };

    const handleUpperChange = (event: ChangeEvent<HTMLInputElement>) => {
        const nextValue = Number(event.target.value);
        if (Number.isNaN(nextValue)) return;
        const clamped = Math.max(
            Math.min(nextValue, sliderMax),
            Math.min(lowerValue + interval, sliderMax),
        );
        applyRange(lowerValue, clamped);
    };

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '2' })}>
            <div className={css({ display: 'flex', justifyContent: 'space-between', gap: '4' })}>
                <p className={css({ fontWeight: '600', fontSize: 'sm' })}>{label}</p>
                {description && (
                    <p className={css({ fontSize: 'xs', color: 'text-muted' })}>{description}</p>
                )}
            </div>
            <div
                className={css({
                    position: 'relative',
                    height: '3',
                    borderRadius: '2xl',
                    border: '1px solid',
                    borderColor: 'light',
                    background: 'surface',
                    overflow: 'hidden',
                })}
            >
                {gradient && (
                    <div
                        aria-hidden
                        className={css({ position: 'absolute', inset: 0 })}
                        style={{ backgroundImage: gradient }}
                    />
                )}
                <div className={css({ position: 'relative', height: '100%' })}>
                    <input
                        type="range"
                        min={sliderMin}
                        max={sliderMax}
                        step={step ?? interval}
                        value={lowerValue}
                        onChange={handleLowerChange}
                        className="range-slider-input range-slider-input-lower"
                        aria-label={`${label} Minimum`}
                    />
                    <input
                        type="range"
                        min={sliderMin}
                        max={sliderMax}
                        step={step ?? interval}
                        value={upperValue}
                        onChange={handleUpperChange}
                        className="range-slider-input range-slider-input-upper"
                        aria-label={`${label} Maximum`}
                    />
                </div>
            </div>
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
    const ingredients = options.ingredients;
    const tags = options.tags;

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

    const getArrayValues = (field: keyof RecipeFilterSearchParams): string[] =>
        (filters[field] as string[] | undefined) ?? [];

    const toggleArray = (field: keyof RecipeFilterSearchParams, value: string) => {
        const current = getArrayValues(field);
        const next = current.includes(value)
            ? current.filter((entry) => entry !== value)
            : [...current, value];
        onFiltersChange({ [field]: next } as Partial<RecipeFilterSearchParams>);
    };

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

    const removeFromArray = (field: keyof RecipeFilterSearchParams, value: string) => {
        const current = getArrayValues(field);
        onFiltersChange({
            [field]: current.filter((entry) => entry !== value),
        } as Partial<RecipeFilterSearchParams>);
    };

    const findCount = (collection?: Array<{ key: string; count: number }>, key?: string) =>
        collection?.find((entry) => entry.key === key)?.count ?? 0;

    return (
        <div
            className={css({
                padding: '5',
                borderRadius: '2xl',
                border: '1px solid',
                borderColor: 'light',
                background: 'surface.elevated',
                boxShadow: '0 24px 60px rgba(45,52,54,0.12)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4',
                width: 'full',
            })}
        >
            <FilterSection title="Tags" description="Beliebte Themen">
                <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '2' })}>
                    {tags.map((tag) => {
                        const count = findCount(facets?.tags, tag);
                        return (
                            <Chip
                                key={`tag-${tag}`}
                                active={(filters.tags ?? []).includes(tag)}
                                onClick={() => toggleArray('tags', tag)}
                                badge={count > 0 ? count : undefined}
                            >
                                {tag}
                            </Chip>
                        );
                    })}
                </div>
            </FilterSection>

            <FilterSection title="Mahlzeit" description="Abgestimmt auf deinen Rhythmus">
                <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '2' })}>
                    {MEAL_TYPE_OPTIONS.map((option) => (
                        <Chip
                            key={option.value}
                            active={(filters.mealTypes ?? []).includes(option.value)}
                            onClick={() => toggleArray('mealTypes', option.value)}
                        >
                            {option.label}
                        </Chip>
                    ))}
                </div>
            </FilterSection>

            <FilterSection title="Zutaten" description="Nur Gerichte mit den richtigen Zutaten">
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
                    <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '2' })}>
                        {(filters.ingredients ?? []).map((ingredient) => (
                            <Chip
                                key={`selected-${ingredient}`}
                                onClick={() => removeFromArray('ingredients', ingredient)}
                            >
                                {ingredient}
                            </Chip>
                        ))}
                    </div>
                </div>
            </FilterSection>

            <FilterSection title="Enthält nicht">
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
                    <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '2' })}>
                        {(filters.excludeIngredients ?? []).map((ingredient) => (
                            <Chip
                                key={`exclude-selected-${ingredient}`}
                                onClick={() => removeFromArray('excludeIngredients', ingredient)}
                            >
                                {ingredient}
                            </Chip>
                        ))}
                    </div>
                </div>
            </FilterSection>

            <FilterSection title="Schwierigkeit">
                <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '2' })}>
                    {DIFFICULTY_OPTIONS.map((option) => (
                        <Chip
                            key={option.value}
                            active={(filters.difficulty ?? []).includes(option.value)}
                            onClick={() => toggleArray('difficulty', option.value)}
                        >
                            {option.label}
                        </Chip>
                    ))}
                </div>
            </FilterSection>

            <FilterSection title="Tageszeit & Dauer" description="Zeitfenster schnell auswählen">
                <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '2' })}>
                    {TIME_OF_DAY_OPTIONS.map((option) => (
                        <Chip
                            key={option.value}
                            active={(filters.timeOfDay ?? []).includes(option.value)}
                            onClick={() => toggleArray('timeOfDay', option.value)}
                        >
                            {option.label}
                        </Chip>
                    ))}
                </div>
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

            <FilterSection title="Bewertung & Beliebt">
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
        </div>
    );
}
