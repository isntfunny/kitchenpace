'use client';

import { Check, Search, Star, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Dialog } from 'radix-ui';
import { useEffect, useMemo, useState } from 'react';

import { addPlanEntries, getPickerLists, type PickerRecipe } from '@app/app/plan/actions';
import {
    button,
    chip,
    fieldLabel,
    input,
    sheet,
    sheetOverlay,
} from '@app/components/atoms/recipes';
import { SmartImage } from '@app/components/atoms/SmartImage';
import { useToastContext } from '@app/components/providers/ToastProvider';
import { ServingsStepper } from '@app/components/ui/ServingsStepper';
import { useMultiSearch } from '@app/lib/hooks/useMultiSearch';
import { recipesForSlot } from '@app/lib/meal-plan/picker';
import { defaultServings } from '@app/lib/meal-plan/slots';
import { weekdayLong, weekdayShort } from '@app/lib/meal-plan/view';


import { css, cx } from 'styled-system/css';

import { TimeField } from './FormParts';
import { HouseholdPrompt } from './HouseholdPrompt';
import type { PlanDish, PlanSlot } from './types';

type Tab = 'favorites' | 'cooked';
const TABS: Array<{ id: Tab; label: string }> = [
    { id: 'favorites', label: 'Favoriten' },
    { id: 'cooked', label: 'Zuletzt gekocht' },
];

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
        <Dialog.Root open={!!target} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className={sheetOverlay} />
                <Dialog.Content
                    className={sheet({ size: 'lg' })}
                    aria-describedby={undefined}
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
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
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
    const [tab, setTab] = useState<Tab>('favorites');
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

    const title = `${weekdayLong(target.date)} · ${target.slot.label}`;

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '4' })}>
            <header className={css({ display: 'flex', alignItems: 'flex-start', gap: '3' })}>
                <div className={css({ flex: 1 })}>
                    <Dialog.Title
                        className={css({
                            fontFamily: 'heading',
                            fontSize: 'xl',
                            fontWeight: '700',
                        })}
                    >
                        {title}
                    </Dialog.Title>
                    <p className={css({ fontSize: 'sm', color: 'foreground.muted' })}>
                        Standardzeit {target.slot.time}
                    </p>
                </div>
                <Dialog.Close className={button({ variant: 'ghost' })} aria-label="Schließen">
                    <X size={18} />
                </Dialog.Close>
            </header>

            {household === null ? (
                <HouseholdPrompt
                    onSaved={(size) => {
                        setHousehold(size);
                        setServings(size);
                    }}
                />
            ) : (
                <>
                    <div className={css({ position: 'relative' })}>
                        <Search
                            size={16}
                            aria-hidden
                            className={css({
                                position: 'absolute',
                                left: '3',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'foreground.muted',
                            })}
                        />
                        <input
                            type="search"
                            autoFocus
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Rezept suchen …"
                            aria-label="Rezept suchen"
                            className={cx(input, css({ width: '100%', pl: '9', minH: '44px' }))}
                        />
                    </div>

                    {trimmed.length < 2 && (
                        <div
                            role="tablist"
                            aria-label="Rezeptlisten"
                            className={css({ display: 'flex', gap: '2', flexWrap: 'wrap' })}
                        >
                            {TABS.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={tab === item.id}
                                    className={chip({ active: tab === item.id })}
                                    onClick={() => setTab(item.id)}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    )}

                    <ul
                        aria-label="Rezepte"
                        aria-busy={loading || (trimmed.length < 2 && !lists)}
                        className={css({
                            display: 'grid',
                            gridTemplateColumns: { base: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                            gap: '2',
                            maxH: { base: '38dvh', md: '320px' },
                            overflowY: 'auto',
                            listStyle: 'none',
                            p: '0.5',
                        })}
                    >
                        {results.map((recipe) => {
                            const isSelected = selected.some((item) => item.id === recipe.id);
                            const days = plannedOn.get(recipe.id);
                            return (
                                <li key={recipe.id}>
                                    <button
                                        type="button"
                                        aria-pressed={isSelected}
                                        onClick={() => toggle(recipe)}
                                        className={css({
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '3',
                                            width: '100%',
                                            minH: '56px',
                                            p: '2',
                                            textAlign: 'left',
                                            borderRadius: 'xl',
                                            border: '1.5px solid',
                                            borderColor: isSelected ? 'primary' : 'border.muted',
                                            bg: isSelected ? 'accent.soft' : 'surface',
                                            color: 'text',
                                            cursor: 'pointer',
                                            _hover: { borderColor: 'primary' },
                                            _focusVisible: {
                                                outline: '2px solid',
                                                outlineColor: 'primary',
                                            },
                                        })}
                                    >
                                        <span
                                            className={css({
                                                position: 'relative',
                                                w: '44px',
                                                h: '44px',
                                                flexShrink: 0,
                                                borderRadius: 'lg',
                                                overflow: 'hidden',
                                                bg: 'surface.muted',
                                            })}
                                        >
                                            <SmartImage
                                                imageKey={recipe.imageKey}
                                                alt=""
                                                aspect="1:1"
                                                sizes="44px"
                                            />
                                        </span>
                                        <span className={css({ minW: 0, flex: 1 })}>
                                            <span
                                                className={css({
                                                    display: 'block',
                                                    fontWeight: '600',
                                                    fontSize: 'sm',
                                                    lineClamp: 2,
                                                })}
                                            >
                                                {recipe.title}
                                            </span>
                                            <span
                                                className={css({
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '1',
                                                    fontSize: 'xs',
                                                    color: 'foreground.muted',
                                                })}
                                            >
                                                {recipe.totalTime} Min
                                                {recipe.rating > 0 && (
                                                    <>
                                                        {' · '}
                                                        <Star size={11} aria-hidden />
                                                        {recipe.rating.toLocaleString('de-DE', {
                                                            maximumFractionDigits: 1,
                                                        })}
                                                    </>
                                                )}
                                            </span>
                                            {days && (
                                                <span
                                                    className={css({
                                                        display: 'block',
                                                        fontSize: '11px',
                                                        color: 'primary',
                                                        fontWeight: '600',
                                                    })}
                                                >
                                                    schon am {days.map(weekdayShort).join(', ')}{' '}
                                                    geplant
                                                </span>
                                            )}
                                        </span>
                                        {isSelected && (
                                            <Check
                                                size={18}
                                                aria-hidden
                                                className={css({ color: 'primary', flexShrink: 0 })}
                                            />
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                        {results.length === 0 && (
                            <li
                                className={css({
                                    gridColumn: '1 / -1',
                                    py: '6',
                                    textAlign: 'center',
                                    fontSize: 'sm',
                                    color: 'foreground.muted',
                                })}
                            >
                                {trimmed.length >= 2
                                    ? loading
                                        ? 'Suche …'
                                        : 'Keine Rezepte gefunden.'
                                    : !lists
                                      ? 'Lade …'
                                      : tab === 'favorites'
                                        ? 'Noch keine Favoriten. Suche oben nach einem Rezept.'
                                        : 'Noch nichts gekocht. Suche oben nach einem Rezept.'}
                            </li>
                        )}
                    </ul>

                    {selected.length > 0 && (
                        <div
                            aria-live="polite"
                            className={css({
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '1.5',
                                alignItems: 'center',
                            })}
                        >
                            <span className={fieldLabel}>Ausgewählt</span>
                            {selected.map((recipe) => (
                                <button
                                    key={recipe.id}
                                    type="button"
                                    className={chip({ active: true })}
                                    onClick={() => toggle(recipe)}
                                    aria-label={`${recipe.title} entfernen`}
                                >
                                    {recipe.title}
                                    <X size={14} aria-hidden />
                                </button>
                            ))}
                        </div>
                    )}

                    <footer
                        className={css({
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'flex-end',
                            gap: '4',
                            pt: '3',
                            borderTopWidth: '1px',
                            borderTopStyle: 'solid',
                            borderColor: 'border.muted',
                        })}
                    >
                        <ServingsStepper
                            value={servings}
                            onChange={setServings}
                            householdSize={household}
                        />
                        <TimeField value={time} onChange={setTime} />
                        <div className={css({ flex: 1 })} />
                        <div
                            className={css({
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1',
                                alignItems: 'flex-end',
                            })}
                        >
                            {selected.length === 0 && (
                                <span
                                    className={css({ fontSize: 'xs', color: 'foreground.muted' })}
                                >
                                    Wähle ein oder mehrere Rezepte
                                </span>
                            )}
                            <button
                                type="button"
                                className={button({ variant: 'primary' })}
                                disabled={busy || selected.length === 0 || !time}
                                onClick={submit}
                            >
                                {selected.length > 1
                                    ? `${selected.length} Gerichte einplanen`
                                    : 'Einplanen'}
                            </button>
                        </div>
                    </footer>
                    {error && (
                        <p role="alert" className={css({ color: 'status.error', fontSize: 'sm' })}>
                            {error}
                        </p>
                    )}
                </>
            )}
        </div>
    );
}
