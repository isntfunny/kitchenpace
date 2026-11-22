'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { addPlanEntries, getPickerLists, type PickerRecipe } from '@app/app/plan/actions';
import { useToastContext } from '@app/components/providers/ToastProvider';
import { Sheet } from '@app/components/ui/Sheet';
import { useMultiSearch } from '@app/lib/hooks/useMultiSearch';
import { recipesForSlot } from '@app/lib/meal-plan/picker';
import { defaultServings } from '@app/lib/meal-plan/slots';
import { weekdayLong } from '@shared/dates';

import { css } from 'styled-system/css';

import { HouseholdPrompt } from './HouseholdPrompt';
import { RecipePickList } from './RecipePickList';
import {
    ListTabs,
    SearchField,
    SelectedChips,
    SlotSearchFooter,
    type PickerTab,
} from './SlotSearchParts';
import type { PlanDish, PlanSlot } from './types';

const column = css({ display: 'flex', flexDirection: 'column', gap: '4' });
const errorText = css({ color: 'status.error', fontSize: 'sm' });

interface SlotSearchDialogProps {
    target: { date: string; slot: PlanSlot } | null;
    onClose: () => void;
    householdSize: number | null;
    weekDishes: PlanDish[];
    /** Element to focus after closing (the "+ hinzufügen" button that opened it) */
    returnFocus?: () => HTMLElement | null;
}

/** Slot search (KUC-100): pick one or more recipes for a day and meal. */
export function SlotSearchDialog({
    target,
    onClose,
    householdSize,
    weekDishes,
    returnFocus,
}: SlotSearchDialogProps) {
    return (
        <Sheet
            open={!!target}
            onOpenChange={(open) => !open && onClose()}
            title={target ? `${weekdayLong(target.date)} · ${target.slot.label}` : ''}
            subtitle={target && `Standardzeit ${target.slot.time}`}
            size="lg"
            onCloseAutoFocus={(event) => {
                const element = returnFocus?.();
                if (element?.isConnected) {
                    event.preventDefault();
                    element.focus();
                }
            }}
        >
            {target && (
                <SlotSearchBody
                    key={`${target.date}|${target.slot.key}`}
                    target={target}
                    onClose={onClose}
                    householdSize={householdSize}
                    weekDishes={weekDishes}
                />
            )}
        </Sheet>
    );
}

/** Text of an empty recipe list */
function emptyText(state: {
    searching: boolean;
    loading: boolean;
    loaded: boolean;
    tab: PickerTab;
}) {
    if (state.searching) return state.loading ? 'Suche …' : 'Keine Rezepte gefunden.';
    if (!state.loaded) return 'Lade …';
    return state.tab === 'favorites'
        ? 'Noch keine Favoriten. Suche oben nach einem Rezept.'
        : 'Noch nichts gekocht. Suche oben nach einem Rezept.';
}

function SlotSearchBody({
    target,
    onClose,
    householdSize: initialHousehold,
    weekDishes,
}: Omit<SlotSearchDialogProps, 'returnFocus' | 'target'> & {
    target: NonNullable<SlotSearchDialogProps['target']>;
}) {
    const router = useRouter();
    const { showToast } = useToastContext();
    const [household, setHousehold] = useState(initialHousehold);
    const [query, setQuery] = useState('');
    const [tab, setTab] = useState<PickerTab>('favorites');
    const [lists, setLists] = useState<{
        favorites: PickerRecipe[];
        recentlyCooked: PickerRecipe[];
    } | null>(null);
    const [selected, setSelected] = useState<PickerRecipe[]>([]);
    const [servings, setServings] = useState(defaultServings(initialHousehold));
    const [time, setTime] = useState(target.slot.time);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const trimmed = query.trim();
    const { recipes: found, loading } = useMultiSearch(trimmed, {
        enabled: trimmed.length >= 2,
        types: 'recipes',
    });

    useEffect(() => {
        let active = true;
        getPickerLists({ slotKey: target.slot.key, time: target.slot.time }).then((result) => {
            if (active && result.ok) setLists(result.data);
        });
        return () => {
            active = false;
        };
    }, [target.slot.key, target.slot.time]);

    const plannedOn = useMemo(() => {
        const map = new Map<string, string[]>();
        for (const dish of weekDishes)
            map.set(dish.recipeId, [...(map.get(dish.recipeId) ?? []), dish.date]);
        return map;
    }, [weekDishes]);

    const results: PickerRecipe[] =
        trimmed.length >= 2
            ? recipesForSlot(
                  found,
                  { slotKey: target.slot.key, time: target.slot.time },
                  { keepUnknown: true },
              ).map((recipe) => ({
                  id: recipe.id,
                  slug: recipe.slug,
                  title: recipe.title,
                  imageKey: recipe.imageKey,
                  totalTime: recipe.totalTime,
                  rating: recipe.rating,
              }))
            : tab === 'favorites'
              ? (lists?.favorites ?? [])
              : (lists?.recentlyCooked ?? []);

    const toggle = (recipe: PickerRecipe) =>
        setSelected((current) =>
            current.some((item) => item.id === recipe.id)
                ? current.filter((item) => item.id !== recipe.id)
                : [...current, recipe].slice(0, 10),
        );

    const submit = async () => {
        if (selected.length === 0) return;
        setBusy(true);
        setError(null);
        const result = await addPlanEntries(
            selected.map((recipe) => ({
                recipeId: recipe.id,
                date: target.date,
                slot: target.slot.key,
                servings,
                // null keeps following the slot's default time
                time: time === target.slot.time ? null : time,
            })),
        );
        setBusy(false);
        if (!result.ok) {
            setError(result.error);
            return;
        }
        showToast({
            type: 'success',
            title:
                selected.length === 1
                    ? `„${selected[0].title}“ eingeplant`
                    : `${selected.length} Gerichte eingeplant`,
            message: `${weekdayLong(target.date)} · ${target.slot.label}`,
        });
        onClose();
        router.refresh();
    };

    if (household === null)
        return (
            <div className={column}>
                <HouseholdPrompt
                    onSaved={(size) => {
                        setHousehold(size);
                        setServings(size);
                    }}
                />
            </div>
        );

    return (
        <div className={column}>
            <SearchField value={query} onChange={setQuery} />
            {trimmed.length < 2 && <ListTabs tab={tab} onTab={setTab} />}
            <RecipePickList
                recipes={results}
                selectedIds={selected.map((item) => item.id)}
                plannedOn={plannedOn}
                busy={loading || (trimmed.length < 2 && !lists)}
                emptyText={emptyText({
                    searching: trimmed.length >= 2,
                    loading,
                    loaded: !!lists,
                    tab,
                })}
                onToggle={toggle}
            />
            {selected.length > 0 && <SelectedChips selected={selected} onRemove={toggle} />}
            <SlotSearchFooter
                servings={servings}
                onServings={setServings}
                household={household}
                time={time}
                onTime={setTime}
                count={selected.length}
                disabled={busy || selected.length === 0 || !time}
                onSubmit={submit}
            />
            {error && (
                <p role="alert" className={errorText}>
                    {error}
                </p>
            )}
        </div>
    );
}
