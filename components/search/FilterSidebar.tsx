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

const CollapsibleSection = ({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: ReactNode;
}) => (
    <details open className={css({ mb: '5' })}>
        <summary
            className={css({
                display: 'flex',
                flexDirection: 'column',
                gap: '1',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: 'sm',
                color: 'text',
                listStyle: 'none',
                _marker: { display: 'none' },
            })}
        >
            <span>{title}</span>
            {description && (
                <span className={css({ fontSize: 'xs', color: 'text-muted' })}>{description}</span>
            )}
        </summary>
        <div className={css({ pt: '2' })}>{children}</div>
    </details>
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
            borderRadius: 'full',
            px: '3',
            py: '1.5',
            fontSize: 'xs',
            border: '1px solid',
            borderColor: active ? '#e07b53' : 'rgba(0,0,0,0.1)',
            background: active ? 'rgba(224,123,83,0.15)' : 'white',
            fontFamily: 'body',
            cursor: 'pointer',
            transition: 'all 150ms ease',
            color: active ? 'primary' : 'text',
            _hover: {
                borderColor: '#e07b53',
            },
        })}
    >
        {children}
    </button>
);

type ArrayFieldKey =
    | 'tags'
    | 'mealTypes'
    | 'ingredients'
    | 'excludeIngredients'
    | 'difficulty'
    | 'timeOfDay';

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
    <label className={css({ display: 'flex', flexDirection: 'column', fontSize: 'xs', gap: '1' })}>
        <span className={css({ color: 'text-muted' })}>{label}</span>
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
                borderColor: 'rgba(0,0,0,0.1)',
                background: 'white',
                px: '3',
                py: '2',
                fontSize: 'sm',
                fontFamily: 'body',
            })}
        />
    </label>
);

export function FilterSidebar({ filters, options, onFiltersChange }: FilterSidebarProps) {
    const [ingredientQuery, setIngredientQuery] = useState('');
    const [excludeQuery, setExcludeQuery] = useState('');

    const ingredientSuggestions = useMemo(() => {
        const query = ingredientQuery.toLowerCase().trim();
        return options.ingredients
            .filter(
                (name) =>
                    name.toLowerCase().includes(query) &&
                    !(filters.ingredients ?? []).includes(name),
            )
            .slice(0, 6);
    }, [ingredientQuery, options.ingredients, filters.ingredients]);

    const excludeSuggestions = useMemo(() => {
        const query = excludeQuery.toLowerCase().trim();
        return options.ingredients
            .filter(
                (name) =>
                    name.toLowerCase().includes(query) &&
                    !(filters.excludeIngredients ?? []).includes(name),
            )
            .slice(0, 6);
    }, [excludeQuery, options.ingredients, filters.excludeIngredients]);

    const getArrayValues = (field: ArrayFieldKey) => (filters[field] as string[] | undefined) ?? [];

    const toggleArray = (field: ArrayFieldKey, value: string) => {
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
        if (field === 'ingredients') setIngredientQuery('');
        else setExcludeQuery('');
    };

    const removeFromArray = (field: ArrayFieldKey, value: string) => {
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
                borderColor: 'rgba(0,0,0,0.08)',
                background: 'white',
                boxShadow: '0 20px 40px rgba(0,0,0,0.06)',
            })}
        >
            <CollapsibleSection title="Tags">
                <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '2' })}>
                    {options.tags.map((tag) => (
                        <Chip
                            key={`tag-${tag}`}
                            active={(filters.tags ?? []).includes(tag)}
                            onClick={() => toggleArray('tags', tag)}
                        >
                            {tag}
                        </Chip>
                    ))}
                </div>
            </CollapsibleSection>
            <CollapsibleSection title="Mahlzeit" description="Abgestimmt auf deinen Rhythmus">
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
            </CollapsibleSection>
            <CollapsibleSection
                title="Zutaten"
                description="Nur Gerichte mit den richtigen Zutaten"
            >
                <div className={css({ display: 'flex', flexDirection: 'column', gap: '2' })}>
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
                                borderColor: 'rgba(0,0,0,0.1)',
                                px: '3',
                                py: '2',
                            })}
                        />
                        <button
                            type="button"
                            onClick={() => addIngredient(ingredientQuery, 'ingredients')}
                            className={css({
                                borderRadius: 'lg',
                                background: 'primary',
                                color: 'white',
                                px: '4',
                                py: '2',
                                fontSize: 'sm',
                                fontWeight: '600',
                            })}
                        >
                            Hinzufügen
                        </button>
                    </div>
                    {ingredientSuggestions.length > 0 && (
                        <div className={css({ display: 'grid', gap: '1' })}>
                            {ingredientSuggestions.map((name) => (
                                <button
                                    type="button"
                                    key={`suggestion-${name}`}
                                    onClick={() => addIngredient(name, 'ingredients')}
                                    className={css({
                                        textAlign: 'left',
                                        fontSize: 'xs',
                                        color: 'text-muted',
                                        padding: '1',
                                        borderRadius: 'md',
                                        border: '1px solid',
                                        borderColor: 'rgba(0,0,0,0.08)',
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
            </CollapsibleSection>
            <CollapsibleSection title="Enthält nicht">
                <div className={css({ display: 'flex', flexDirection: 'column', gap: '2' })}>
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
                                borderColor: 'rgba(0,0,0,0.1)',
                                px: '3',
                                py: '2',
                            })}
                        />
                        <button
                            type="button"
                            onClick={() => addIngredient(excludeQuery, 'excludeIngredients')}
                            className={css({
                                borderRadius: 'lg',
                                background: 'rgba(224,123,83,0.85)',
                                color: 'white',
                                px: '4',
                                py: '2',
                                fontSize: 'sm',
                                fontWeight: '600',
                            })}
                        >
                            Hinzufügen
                        </button>
                    </div>
                    {excludeSuggestions.length > 0 && (
                        <div className={css({ display: 'grid', gap: '1' })}>
                            {excludeSuggestions.map((name) => (
                                <button
                                    type="button"
                                    key={`exclude${name}`}
                                    onClick={() => addIngredient(name, 'excludeIngredients')}
                                    className={css({
                                        textAlign: 'left',
                                        fontSize: 'xs',
                                        color: 'text-muted',
                                        padding: '1',
                                        borderRadius: 'md',
                                        border: '1px solid',
                                        borderColor: 'rgba(0,0,0,0.08)',
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
            </CollapsibleSection>
            <CollapsibleSection title="Schwierigkeit">
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
            </CollapsibleSection>
            <CollapsibleSection
                title="Tageszeit & Dauer"
                description="Zeitfenster schnell auswählen"
            >
                <div
                    className={css({
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '2',
                        marginBottom: '3',
                    })}
                >
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
            </CollapsibleSection>
            <CollapsibleSection title="Bewertung & Beliebt">
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
            </CollapsibleSection>
        </div>
    );
}
