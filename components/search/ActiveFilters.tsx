'use client';

import type { RecipeFilterSearchParams } from '@/lib/recipeFilters';
import { css } from 'styled-system/css';

type ActiveFiltersProps = {
    filters: RecipeFilterSearchParams;
    onRemove: (update: Partial<RecipeFilterSearchParams>) => void;
};

type FilterChip = {
    id: string;
    label: string;
    onRemove: () => void;
};

const Chip = ({ label, onRemove }: Omit<FilterChip, 'id'>) => (
    <button
        type="button"
        onClick={onRemove}
        className={css({
            borderRadius: 'full',
            px: '3',
            py: '1.5',
            fontSize: 'xs',
            border: '1px solid',
            borderColor: 'rgba(0,0,0,0.12)',
            background: 'white',
            fontFamily: 'body',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '1',
            transition: 'all 150ms ease',
            _hover: {
                borderColor: 'rgba(224,123,83,0.4)',
            },
        })}
    >
        <span>{label}</span>
        <span aria-hidden>×</span>
    </button>
);

export function ActiveFilters({ filters, onRemove }: ActiveFiltersProps) {
    const chips: FilterChip[] = [];

    const push = (chip: FilterChip) => chips.push(chip);

    if (filters.query) {
        push({
            id: `query-${filters.query}`,
            label: `Suche: ${filters.query}`,
            onRemove: () => onRemove({ query: undefined }),
        });
    }

    (filters.tags ?? []).forEach((tag) => {
        push({
            id: `tag-${tag}`,
            label: `Tag: ${tag}`,
            onRemove: () =>
                onRemove({ tags: (filters.tags ?? []).filter((entry) => entry !== tag) }),
        });
    });

    (filters.mealTypes ?? []).forEach((meal) => {
        push({
            id: `meal-${meal}`,
            label: `Mahlzeit: ${meal}`,
            onRemove: () =>
                onRemove({
                    mealTypes: (filters.mealTypes ?? []).filter((entry) => entry !== meal),
                }),
        });
    });

    (filters.ingredients ?? []).forEach((ingredient) => {
        push({
            id: `ingredient-${ingredient}`,
            label: `Zutat: ${ingredient}`,
            onRemove: () =>
                onRemove({
                    ingredients: (filters.ingredients ?? []).filter(
                        (entry) => entry !== ingredient,
                    ),
                }),
        });
    });

    (filters.excludeIngredients ?? []).forEach((ingredient) => {
        push({
            id: `exclude-${ingredient}`,
            label: `Ohne: ${ingredient}`,
            onRemove: () =>
                onRemove({
                    excludeIngredients: (filters.excludeIngredients ?? []).filter(
                        (entry) => entry !== ingredient,
                    ),
                }),
        });
    });

    (filters.difficulty ?? []).forEach((difficulty) => {
        push({
            id: `difficulty-${difficulty}`,
            label: `Schwierig: ${difficulty}`,
            onRemove: () =>
                onRemove({
                    difficulty: (filters.difficulty ?? []).filter((entry) => entry !== difficulty),
                }),
        });
    });

    (filters.timeOfDay ?? []).forEach((slot) => {
        push({
            id: `time-${slot}`,
            label: `Tageszeit: ${slot}`,
            onRemove: () =>
                onRemove({
                    timeOfDay: (filters.timeOfDay ?? []).filter((entry) => entry !== slot),
                }),
        });
    });

    if (typeof filters.minTotalTime === 'number') {
        push({
            id: 'minTotalTime',
            label: `Dauer ≥ ${filters.minTotalTime} Min.`,
            onRemove: () => onRemove({ minTotalTime: undefined }),
        });
    }

    if (typeof filters.maxTotalTime === 'number') {
        push({
            id: 'maxTotalTime',
            label: `Dauer ≤ ${filters.maxTotalTime} Min.`,
            onRemove: () => onRemove({ maxTotalTime: undefined }),
        });
    }

    if (typeof filters.minPrepTime === 'number') {
        push({
            id: 'minPrepTime',
            label: `Vorbereitung ≥ ${filters.minPrepTime} Min.`,
            onRemove: () => onRemove({ minPrepTime: undefined }),
        });
    }

    if (typeof filters.maxPrepTime === 'number') {
        push({
            id: 'maxPrepTime',
            label: `Vorbereitung ≤ ${filters.maxPrepTime} Min.`,
            onRemove: () => onRemove({ maxPrepTime: undefined }),
        });
    }

    if (typeof filters.minCookTime === 'number') {
        push({
            id: 'minCookTime',
            label: `Kochen ≥ ${filters.minCookTime} Min.`,
            onRemove: () => onRemove({ minCookTime: undefined }),
        });
    }

    if (typeof filters.maxCookTime === 'number') {
        push({
            id: 'maxCookTime',
            label: `Kochen ≤ ${filters.maxCookTime} Min.`,
            onRemove: () => onRemove({ maxCookTime: undefined }),
        });
    }

    if (typeof filters.minRating === 'number') {
        push({
            id: 'minRating',
            label: `Bewertung ≥ ${filters.minRating}`,
            onRemove: () => onRemove({ minRating: undefined }),
        });
    }

    if (typeof filters.minCookCount === 'number') {
        push({
            id: 'minCookCount',
            label: `Gekocht ≥ ${filters.minCookCount}x`,
            onRemove: () => onRemove({ minCookCount: undefined }),
        });
    }

    if (chips.length === 0) return null;

    return (
        <div
            className={css({
                display: 'flex',
                flexWrap: 'wrap',
                gap: '2',
                mb: '4',
            })}
        >
            {chips.map((chip) => (
                <Chip key={chip.id} label={chip.label} onRemove={chip.onRemove} />
            ))}
        </div>
    );
}
