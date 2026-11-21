'use client';

import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useId, useState, useSyncExternalStore } from 'react';

import { savePlanSettings, saveWeekSlots } from '@app/app/plan/actions';
import {
    customSlotKey,
    isFixedSlot,
    slotLabel,
    sortSlots,
    type SlotConfig,
} from '@app/lib/meal-plan/slots';
import { weekdayNameLong } from '@app/lib/meal-plan/view';

import { css, cx } from 'styled-system/css';

import { ServingsStepper, Switch } from './FormParts';
import { actionButton, fieldLabel, input } from './styles';

export interface MealPlanSettingsValues {
    householdSize: number | null;
    weekStartDay: number;
    shoppingDay: number | null;
    timezone: string;
    mealPlanShowTime: boolean;
    mealPlanShowServings: boolean;
    mealPlanShowCalories: boolean;
    slots: SlotConfig[];
}

interface MealPlanSettingsFormProps {
    initial: MealPlanSettingsValues;
    /** Week mode: slot changes may apply to this week only (KUC-102) */
    week?: { startDate: string; slots: SlotConfig[]; hasOverride: boolean };
    onSaved?: () => void;
}

const DAYS = [1, 2, 3, 4, 5, 6, 7];
const noSubscribe = () => () => {};

function timezones(current: string): string[] {
    const all =
        typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
    return all.includes(current) ? all : [current, ...all];
}

/** Meal plan settings: household, week start, shopping day, time zone, slots, display. */
export function MealPlanSettingsForm({ initial, week, onSaved }: MealPlanSettingsFormProps) {
    const [values, setValues] = useState(initial);
    const [slots, setSlots] = useState<SlotConfig[]>(week?.slots ?? initial.slots);
    const [weekOnly, setWeekOnly] = useState(!!week?.hasOverride);
    const [newName, setNewName] = useState('');
    const [newTime, setNewTime] = useState('10:30');
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
    const deviceZone = useSyncExternalStore(
        noSubscribe,
        () => Intl.DateTimeFormat().resolvedOptions().timeZone || null,
        () => null,
    );
    const browserZone = deviceZone && deviceZone !== initial.timezone ? deviceZone : null;
    const ids = { start: useId(), shopping: useId(), zone: useId(), name: useId(), time: useId() };

    const set = <K extends keyof MealPlanSettingsValues>(
        key: K,
        value: MealPlanSettingsValues[K],
    ) => {
        setValues((current) => ({ ...current, [key]: value }));
        setStatus(null);
    };
    const updateSlot = (key: string, patch: Partial<SlotConfig>) => {
        setSlots((current) =>
            current.map((slot) => (slot.key === key ? { ...slot, ...patch } : slot)),
        );
        setStatus(null);
    };
    const addSlot = () => {
        const name = newName.trim();
        if (!name || !newTime) return;
        setSlots((current) =>
            sortSlots([
                ...current,
                {
                    key: customSlotKey(
                        name,
                        current.map((s) => s.key),
                    ),
                    name,
                    time: newTime,
                    enabled: true,
                },
            ]),
        );
        setNewName('');
        setStatus(null);
    };

    const save = async (event: React.FormEvent) => {
        event.preventDefault();
        setBusy(true);
        setStatus(null);
        const { slots: _defaultSlots, ...rest } = values;
        const sortedSlots = sortSlots(slots);
        const profileResult = await savePlanSettings({
            ...rest,
            householdSize: rest.householdSize ?? 2,
            ...(!week || !weekOnly ? { mealPlanSlots: sortedSlots } : {}),
        });
        let ok = profileResult.ok;
        let message = profileResult.ok ? null : profileResult.error;
        if (ok && week) {
            // Week override: set when "only this week", otherwise cleared
            const weekResult = await saveWeekSlots({
                startDate: week.startDate,
                slots: weekOnly ? sortedSlots : null,
            });
            ok = weekResult.ok;
            message = weekResult.ok ? null : weekResult.error;
        }
        setBusy(false);
        setStatus(
            ok ? { ok, text: 'Gespeichert' } : { ok, text: message ?? 'Speichern fehlgeschlagen' },
        );
        if (ok) onSaved?.();
    };

    const section = css({
        display: 'flex',
        flexDirection: 'column',
        gap: '3',
        py: '4',
        borderTop: '1px solid',
        borderColor: 'border.muted',
        _first: { borderTop: 0, pt: 0 },
    });
    const select = cx(input, css({ width: '100%' }));

    return (
        <form onSubmit={save} className={css({ display: 'flex', flexDirection: 'column' })}>
            <fieldset className={section}>
                <legend className={cx(fieldLabel, css({ mb: '2' }))}>Haushalt & Woche</legend>
                <ServingsStepper
                    label="Personen im Haushalt"
                    value={values.householdSize ?? 2}
                    onChange={(size) => set('householdSize', size)}
                />
                <div
                    className={css({
                        display: 'grid',
                        gridTemplateColumns: { base: '1fr', sm: '1fr 1fr' },
                        gap: '3',
                    })}
                >
                    <label
                        htmlFor={ids.start}
                        className={css({
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1.5',
                            fontSize: 'sm',
                        })}
                    >
                        Woche beginnt am
                        <select
                            id={ids.start}
                            className={select}
                            value={values.weekStartDay}
                            onChange={(e) => set('weekStartDay', Number(e.target.value))}
                        >
                            {DAYS.map((day) => (
                                <option key={day} value={day}>
                                    {weekdayNameLong(day)}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label
                        htmlFor={ids.shopping}
                        className={css({
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1.5',
                            fontSize: 'sm',
                        })}
                    >
                        Einkaufstag
                        <select
                            id={ids.shopping}
                            className={select}
                            value={values.shoppingDay ?? ''}
                            onChange={(e) =>
                                set('shoppingDay', e.target.value ? Number(e.target.value) : null)
                            }
                        >
                            <option value="">Kein fester Tag</option>
                            {DAYS.map((day) => (
                                <option key={day} value={day}>
                                    {weekdayNameLong(day)}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
                <label
                    htmlFor={ids.zone}
                    className={css({
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.5',
                        fontSize: 'sm',
                    })}
                >
                    Zeitzone
                    <select
                        id={ids.zone}
                        className={select}
                        value={values.timezone}
                        onChange={(e) => set('timezone', e.target.value)}
                    >
                        {timezones(values.timezone).map((zone) => (
                            <option key={zone} value={zone}>
                                {zone.replace(/_/g, ' ')}
                            </option>
                        ))}
                    </select>
                </label>
                {browserZone && values.timezone !== browserZone && (
                    <button
                        type="button"
                        className={cx(
                            actionButton({ variant: 'ghost' }),
                            css({ alignSelf: 'flex-start' }),
                        )}
                        onClick={() => set('timezone', browserZone)}
                    >
                        Zeitzone deines Geräts übernehmen ({browserZone.replace(/_/g, ' ')})
                    </button>
                )}
                <p className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                    Ein anderer Wochenstart verschiebt keine Gerichte, nur die Ansicht.
                </p>
            </fieldset>

            <fieldset className={section}>
                <legend className={cx(fieldLabel, css({ mb: '2' }))}>Mahlzeiten</legend>
                {week && (
                    <Switch
                        checked={weekOnly}
                        onChange={setWeekOnly}
                        label="Nur für diese Woche"
                        description={
                            weekOnly
                                ? 'Die Mahlzeiten gelten nur für diese Woche.'
                                : 'Änderungen gelten für alle Wochen.'
                        }
                    />
                )}
                <ul
                    className={css({
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2',
                        listStyle: 'none',
                    })}
                >
                    {sortSlots(slots).map((slot) => (
                        <li
                            key={slot.key}
                            className={css({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3',
                                minH: '44px',
                            })}
                        >
                            <input
                                type="checkbox"
                                checked={slot.enabled}
                                onChange={(e) =>
                                    updateSlot(slot.key, { enabled: e.target.checked })
                                }
                                aria-label={`${slotLabel(slot)} anzeigen`}
                                className={css({
                                    w: '5',
                                    h: '5',
                                    accentColor: 'var(--colors-primary)',
                                    flexShrink: 0,
                                })}
                            />
                            <span
                                className={css({
                                    flex: 1,
                                    fontSize: 'sm',
                                    fontWeight: '500',
                                    opacity: slot.enabled ? 1 : 0.5,
                                })}
                            >
                                {slotLabel(slot)}
                            </span>
                            <input
                                type="time"
                                value={slot.time}
                                required
                                onChange={(e) => updateSlot(slot.key, { time: e.target.value })}
                                aria-label={`Uhrzeit ${slotLabel(slot)}`}
                                className={cx(input, css({ w: '120px' }))}
                            />
                            {isFixedSlot(slot.key) ? (
                                <span className={css({ w: '40px' })} />
                            ) : (
                                <button
                                    type="button"
                                    className={actionButton({ variant: 'ghost' })}
                                    onClick={() =>
                                        setSlots((current) =>
                                            current.filter((s) => s.key !== slot.key),
                                        )
                                    }
                                    aria-label={`${slotLabel(slot)} entfernen`}
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
                <p className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                    Ausgeblendete Mahlzeiten mit Gerichten bleiben sichtbar; es geht nichts
                    verloren.
                </p>
                <div
                    className={css({
                        display: 'flex',
                        gap: '2',
                        alignItems: 'flex-end',
                        flexWrap: 'wrap',
                    })}
                >
                    <label
                        htmlFor={ids.name}
                        className={css({
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1.5',
                            fontSize: 'sm',
                            flex: '1 1 180px',
                        })}
                    >
                        Eigene Mahlzeit
                        <input
                            id={ids.name}
                            className={input}
                            value={newName}
                            maxLength={40}
                            placeholder="z. B. Brunch"
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addSlot();
                                }
                            }}
                        />
                    </label>
                    <input
                        type="time"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        aria-label="Uhrzeit der eigenen Mahlzeit"
                        className={cx(input, css({ w: '120px' }))}
                    />
                    <button
                        type="button"
                        className={actionButton()}
                        onClick={addSlot}
                        disabled={!newName.trim() || slots.length >= 12}
                    >
                        <Plus size={16} /> Hinzufügen
                    </button>
                </div>
                {week?.hasOverride && weekOnly && (
                    <button
                        type="button"
                        className={cx(
                            actionButton({ variant: 'ghost' }),
                            css({ alignSelf: 'flex-start' }),
                        )}
                        onClick={() => {
                            setWeekOnly(false);
                            setSlots(initial.slots);
                        }}
                    >
                        <RotateCcw size={16} /> Auf deine Standard-Mahlzeiten zurücksetzen
                    </button>
                )}
            </fieldset>

            <fieldset className={section}>
                <legend className={cx(fieldLabel, css({ mb: '2' }))}>Anzeige</legend>
                <Switch
                    checked={values.mealPlanShowTime}
                    onChange={(v) => set('mealPlanShowTime', v)}
                    label="Uhrzeiten anzeigen"
                    description="Kleine Zeit über jedem Gericht"
                />
                <Switch
                    checked={values.mealPlanShowServings}
                    onChange={(v) => set('mealPlanShowServings', v)}
                    label="Portionen anzeigen"
                    description="Anzahl Portionen je Gericht"
                />
                <Switch
                    checked={values.mealPlanShowCalories}
                    onChange={(v) => set('mealPlanShowCalories', v)}
                    label="Kalorien im Tageskopf"
                    description="Ungefähre kcal pro Person und Tag"
                />
            </fieldset>

            <div
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3',
                    pt: '4',
                    borderTop: '1px solid',
                    borderColor: 'border.muted',
                })}
            >
                <button
                    type="submit"
                    className={actionButton({ variant: 'primary' })}
                    disabled={busy}
                >
                    Speichern
                </button>
                {status && (
                    <span
                        role="status"
                        className={css({
                            fontSize: 'sm',
                            color: status.ok ? 'status.success' : 'status.error',
                        })}
                    >
                        {status.text}
                    </span>
                )}
            </div>
        </form>
    );
}
