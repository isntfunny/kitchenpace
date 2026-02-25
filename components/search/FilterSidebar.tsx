'use client';

import { useMemo, useState, type ReactNode } from 'react';

import type { CategoryOption } from '@/app/actions/filters';
import type { RecipeFilterSearchParams } from '@/lib/recipeFilters';
import { css } from 'styled-system/css';

type FilterSidebarProps = {
    filters: RecipeFilterSearchParams;
    options: {
        tags: string[];
        ingredients: string[];
        categories: CategoryOption[];
    };
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
    onClick,
}: {
    active?: boolean;
    children: ReactNode;
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
            _hover: {
                borderColor: 'primary-dark',
                boxShadow: '0 8px 16px rgba(0,0,0,0.08)',
            },
        })}
        aria-pressed={active || undefined}
    >
        {children}
    </button>
);

const NumberInput = ({
    label,
    value,
    placeholder,
    onChange,
}: {
    label: string;
    value?: number;
    placeholder?: string;
    onChange: (next?: number) => void;
}) => (
    <label
        className={css({
            display: 'flex',
            flexDirection: 'column',
            gap: '1',
            fontSize: 'xs',
            color: 'text-muted',
        })}
    >
        <span>{label}</span>
        <input
            type="number"
            min={0}
            value={value ?? ''}
            placeholder={placeholder}
            onChange={(event) => {
                const text = event.target.value;
                if (text === '') {
                    onChange(undefined);
                    return;
                }
                const parsed = Number(text);
                if (Number.isNaN(parsed)) return;
                onChange(parsed);
            }}
            className={css({
                borderRadius: 'lg',
                border: '1px solid',
                borderColor: 'light',
                background: 'surface',
                px: '3',
                py: '2.5',
                fontSize: 'sm',
                fontFamily: 'body',
            })}
        />
    </label>
);

export function FilterSidebar({ filters, options, onFiltersChange }: FilterSidebarProps) {
    const [ingredientQuery, setIngredientQuery] = useState('');
    const [excludeQuery, setExcludeQuery] = useState('');
    const tags = options.tags;
    const ingredients = options.ingredients;

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
                    {tags.map((tag) => (
                        <Chip
                            key={`tag-${tag}`}
                            active={(filters.tags ?? []).includes(tag)}
                            onClick={() => toggleArray('tags', tag)}
                        >
                            {tag}
                        </Chip>
                    ))}
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
                    <div className={css({ display: 'flex', gap: '2' })}>
                        <NumberInput
                            label="Min. Dauer (Min)"
                            value={filters.minTotalTime}
                            onChange={(value) => onFiltersChange({ minTotalTime: value })}
                        />
                        <NumberInput
                            label="Max. Dauer (Min)"
                            value={filters.maxTotalTime}
                            onChange={(value) => onFiltersChange({ maxTotalTime: value })}
                        />
                    </div>
                    <div className={css({ display: 'flex', gap: '2' })}>
                        <NumberInput
                            label="Min. Vorbereitung"
                            value={filters.minPrepTime}
                            onChange={(value) => onFiltersChange({ minPrepTime: value })}
                        />
                        <NumberInput
                            label="Max. Vorbereitung"
                            value={filters.maxPrepTime}
                            onChange={(value) => onFiltersChange({ maxPrepTime: value })}
                        />
                    </div>
                    <div className={css({ display: 'flex', gap: '2' })}>
                        <NumberInput
                            label="Min. Kochzeit"
                            value={filters.minCookTime}
                            onChange={(value) => onFiltersChange({ minCookTime: value })}
                        />
                        <NumberInput
                            label="Max. Kochzeit"
                            value={filters.maxCookTime}
                            onChange={(value) => onFiltersChange({ maxCookTime: value })}
                        />
                    </div>
                </div>
            </FilterSection>

            <FilterSection title="Bewertung & Beliebt">
                <div className={css({ display: 'grid', gap: '3' })}>
                    <NumberInput
                        label="Min. Bewertung"
                        value={filters.minRating}
                        placeholder="z. B. 4"
                        onChange={(value) => onFiltersChange({ minRating: value })}
                    />
                    <NumberInput
                        label="Min. gekocht"
                        value={filters.minCookCount}
                        placeholder="z. B. 10"
                        onChange={(value) => onFiltersChange({ minCookCount: value })}
                    />
                </div>
            </FilterSection>
        </div>
    );
}
