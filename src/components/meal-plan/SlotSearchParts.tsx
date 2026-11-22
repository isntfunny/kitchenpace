'use client';

import { Search, X } from 'lucide-react';

import type { PickerRecipe } from '@app/app/plan/actions';
import { Button } from '@app/components/atoms/Button';
import { chip, fieldLabel, input } from '@app/components/atoms/recipes';
import { ServingsStepper } from '@app/components/ui/ServingsStepper';

import { css, cx } from 'styled-system/css';

import { TimeField } from './FormParts';

export type PickerTab = 'favorites' | 'cooked';
const TABS: Array<{ id: PickerTab; label: string }> = [
    { id: 'favorites', label: 'Favoriten' },
    { id: 'cooked', label: 'Zuletzt gekocht' },
];

const searchBox = css({ position: 'relative' });
const searchIcon = css({
    position: 'absolute',
    left: '3',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'foreground.muted',
});
const searchInput = cx(input, css({ width: '100%', pl: '9', minH: '44px' }));
const tabs = css({ display: 'flex', gap: '2', flexWrap: 'wrap' });
const chosen = css({ display: 'flex', flexWrap: 'wrap', gap: '1.5', alignItems: 'center' });
const footer = css({
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: '4',
    pt: '3',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderColor: 'border.muted',
});
const spacer = css({ flex: 1 });
const submitColumn = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '1',
    alignItems: 'flex-end',
});
const submitHint = css({ fontSize: 'xs', color: 'foreground.muted' });

export function SearchField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <div className={searchBox}>
            <Search size={16} aria-hidden className={searchIcon} />
            <input
                type="search"
                autoFocus
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder="Rezept suchen …"
                aria-label="Rezept suchen"
                className={searchInput}
            />
        </div>
    );
}

export function ListTabs({ tab, onTab }: { tab: PickerTab; onTab: (tab: PickerTab) => void }) {
    return (
        <div role="tablist" aria-label="Rezeptlisten" className={tabs}>
            {TABS.map((item) => (
                <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={tab === item.id}
                    className={chip({ active: tab === item.id })}
                    onClick={() => onTab(item.id)}
                >
                    {item.label}
                </button>
            ))}
        </div>
    );
}

/** The picked recipes as chips; a tap removes one. */
export function SelectedChips({
    selected,
    onRemove,
}: {
    selected: PickerRecipe[];
    onRemove: (recipe: PickerRecipe) => void;
}) {
    return (
        <div aria-live="polite" className={chosen}>
            <span className={fieldLabel}>Ausgewählt</span>
            {selected.map((recipe) => (
                <button
                    key={recipe.id}
                    type="button"
                    className={chip({ active: true })}
                    onClick={() => onRemove(recipe)}
                    aria-label={`${recipe.title} entfernen`}
                >
                    {recipe.title}
                    <X size={14} aria-hidden />
                </button>
            ))}
        </div>
    );
}

/** Servings, time and "Einplanen" of the slot search. */
export function SlotSearchFooter({
    servings,
    onServings,
    household,
    time,
    onTime,
    count,
    disabled,
    onSubmit,
}: {
    servings: number;
    onServings: (value: number) => void;
    household: number;
    time: string;
    onTime: (value: string) => void;
    count: number;
    disabled: boolean;
    onSubmit: () => void;
}) {
    return (
        <footer className={footer}>
            <ServingsStepper value={servings} onChange={onServings} householdSize={household} />
            <TimeField value={time} onChange={onTime} />
            <div className={spacer} />
            <div className={submitColumn}>
                {count === 0 && <span className={submitHint}>Wähle ein oder mehrere Rezepte</span>}
                <Button type="button" variant="primary" disabled={disabled} onClick={onSubmit}>
                    {count > 1 ? `${count} Gerichte einplanen` : 'Einplanen'}
                </Button>
            </div>
        </footer>
    );
}
