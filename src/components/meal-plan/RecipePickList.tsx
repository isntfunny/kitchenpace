'use client';

import { Check, Star } from 'lucide-react';

import type { PickerRecipe } from '@app/app/plan/actions';
import { SmartImage } from '@app/components/atoms/SmartImage';
import { weekdayShort } from '@shared/dates';

import { css } from 'styled-system/css';

const list = css({
    display: 'grid',
    gridTemplateColumns: { base: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
    gap: '2',
    maxH: { base: '38dvh', md: '320px' },
    overflowY: 'auto',
    listStyle: 'none',
    p: '0.5',
});
const itemBase = {
    display: 'flex',
    alignItems: 'center',
    gap: '3',
    width: '100%',
    minH: '56px',
    p: '2',
    textAlign: 'left',
    borderRadius: 'xl',
    border: '1.5px solid',
    color: 'text',
    cursor: 'pointer',
    _hover: { borderColor: 'primary' },
    _focusVisible: { outline: '2px solid', outlineColor: 'primary' },
} as const;
const item = css(itemBase, { borderColor: 'border.muted', bg: 'surface' });
const selectedItem = css(itemBase, { borderColor: 'primary', bg: 'accent.soft' });
const thumb = css({
    position: 'relative',
    w: '44px',
    h: '44px',
    flexShrink: 0,
    borderRadius: 'lg',
    overflow: 'hidden',
    bg: 'surface.muted',
});
const body = css({ minW: 0, flex: 1 });
const title = css({ display: 'block', fontWeight: '600', fontSize: 'sm', lineClamp: 2 });
const meta = css({
    display: 'flex',
    alignItems: 'center',
    gap: '1',
    fontSize: 'xs',
    color: 'foreground.muted',
});
const planned = css({ display: 'block', fontSize: '11px', color: 'primary', fontWeight: '600' });
const check = css({ color: 'primary', flexShrink: 0 });
const empty = css({
    gridColumn: '1 / -1',
    py: '6',
    textAlign: 'center',
    fontSize: 'sm',
    color: 'foreground.muted',
});

/** Recipes to pick in the slot search; a tap selects or deselects one. */
export function RecipePickList({
    recipes,
    selectedIds,
    plannedOn,
    busy,
    emptyText,
    onToggle,
}: {
    recipes: PickerRecipe[];
    selectedIds: string[];
    /** Days of this week the recipe is already planned on */
    plannedOn: Map<string, string[]>;
    busy: boolean;
    emptyText: string;
    onToggle: (recipe: PickerRecipe) => void;
}) {
    return (
        <ul aria-label="Rezepte" aria-busy={busy} className={list}>
            {recipes.map((recipe) => (
                <li key={recipe.id}>
                    <RecipePick
                        recipe={recipe}
                        selected={selectedIds.includes(recipe.id)}
                        days={plannedOn.get(recipe.id)}
                        onToggle={() => onToggle(recipe)}
                    />
                </li>
            ))}
            {recipes.length === 0 && <li className={empty}>{emptyText}</li>}
        </ul>
    );
}

function RecipePick({
    recipe,
    selected,
    days,
    onToggle,
}: {
    recipe: PickerRecipe;
    selected: boolean;
    days: string[] | undefined;
    onToggle: () => void;
}) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={onToggle}
            className={selected ? selectedItem : item}
        >
            <span className={thumb}>
                <SmartImage imageKey={recipe.imageKey} alt="" aspect="1:1" sizes="44px" />
            </span>
            <span className={body}>
                <span className={title}>{recipe.title}</span>
                <span className={meta}>
                    {recipe.totalTime} Min
                    {recipe.rating > 0 && (
                        <>
                            {' · '}
                            <Star size={11} aria-hidden />
                            {recipe.rating.toLocaleString('de-DE', { maximumFractionDigits: 1 })}
                        </>
                    )}
                </span>
                {days && (
                    <span className={planned}>
                        schon am {days.map(weekdayShort).join(', ')} geplant
                    </span>
                )}
            </span>
            {selected && <Check size={18} aria-hidden className={check} />}
        </button>
    );
}
