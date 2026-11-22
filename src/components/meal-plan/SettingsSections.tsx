'use client';

import { useId } from 'react';

import { Button } from '@app/components/atoms/Button';
import { ServingsStepper } from '@app/components/ui/ServingsStepper';
import { weekdayNameLong } from '@shared/dates';

import { css } from 'styled-system/css';

import { Switch } from './FormParts';
import type { MealPlanSettingsValues } from './MealPlanSettingsForm';
import { field, hint, legend, section, select, startSelf, timeInput } from './settings-styles';

const DAYS = [1, 2, 3, 4, 5, 6, 7];
const twoColumns = css({
    display: 'grid',
    gridTemplateColumns: { base: '1fr', sm: '1fr 1fr' },
    gap: '3',
});
const quietRow = css({ display: 'flex', gap: '3', flexWrap: 'wrap' });

type SetValue = <K extends keyof MealPlanSettingsValues>(
    key: K,
    value: MealPlanSettingsValues[K],
) => void;

function timezones(current: string): string[] {
    const all =
        typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
    return all.includes(current) ? all : [current, ...all];
}

/** "Haushalt & Woche": household size, week start, shopping day, time zone. */
export function HouseholdSettings({
    values,
    set,
    browserZone,
}: {
    values: MealPlanSettingsValues;
    set: SetValue;
    /** Time zone of the device when it differs from the stored one */
    browserZone: string | null;
}) {
    const ids = { start: useId(), shopping: useId(), zone: useId() };
    return (
        <fieldset className={section}>
            <legend className={legend}>Haushalt & Woche</legend>
            <ServingsStepper
                label="Personen im Haushalt"
                value={values.householdSize ?? 2}
                onChange={(size) => set('householdSize', size)}
            />
            <div className={twoColumns}>
                <label htmlFor={ids.start} className={field}>
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
                <label htmlFor={ids.shopping} className={field}>
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
            <label htmlFor={ids.zone} className={field}>
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
                <Button
                    variant="ghost"
                    type="button"
                    className={startSelf}
                    onClick={() => set('timezone', browserZone)}
                >
                    Zeitzone deines Geräts übernehmen ({browserZone.replace(/_/g, ' ')})
                </Button>
            )}
            <p className={hint}>
                Ein anderer Wochenstart verschiebt keine Gerichte, nur die Ansicht.
            </p>
        </fieldset>
    );
}

/** "Anzeige": time, servings and calories in the plan. */
export function DisplaySettings({
    values,
    set,
}: {
    values: MealPlanSettingsValues;
    set: SetValue;
}) {
    return (
        <fieldset className={section}>
            <legend className={legend}>Anzeige</legend>
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
    );
}

/** "Erinnerungen" (KUC-109): cook start, weekly plan reminder, quiet hours. */
export function ReminderSettings({
    values,
    set,
    onQuietHours,
}: {
    values: MealPlanSettingsValues;
    set: SetValue;
    onQuietHours: (on: boolean) => void;
}) {
    const ids = { from: useId(), to: useId() };
    const quietOn = !!values.quietHoursStart && !!values.quietHoursEnd;
    return (
        <fieldset className={section}>
            <legend className={legend}>Erinnerungen</legend>
            <Switch
                checked={values.notifyOnCookStart ?? true}
                onChange={(v) => set('notifyOnCookStart', v)}
                label="Zeit anzufangen"
                description="Mitteilung vor der geplanten Mahlzeit, rechtzeitig vor dem Kochen"
            />
            <Switch
                checked={values.notifyOnWeeklyPlanReminder ?? true}
                onChange={(v) => set('notifyOnWeeklyPlanReminder', v)}
                label="Wochenplan erinnern"
                description="Am Tag vor dem Wochenstart um 17 Uhr, wenn die neue Woche noch leer ist"
            />
            <Switch
                checked={quietOn}
                onChange={onQuietHours}
                label="Ruhezeiten"
                description="In dieser Zeit kommen keine Erinnerungen"
            />
            {quietOn && (
                <div className={quietRow}>
                    <label htmlFor={ids.from} className={field}>
                        Von
                        <input
                            id={ids.from}
                            type="time"
                            required
                            value={values.quietHoursStart ?? ''}
                            onChange={(e) => set('quietHoursStart', e.target.value)}
                            className={timeInput}
                        />
                    </label>
                    <label htmlFor={ids.to} className={field}>
                        Bis
                        <input
                            id={ids.to}
                            type="time"
                            required
                            value={values.quietHoursEnd ?? ''}
                            onChange={(e) => set('quietHoursEnd', e.target.value)}
                            className={timeInput}
                        />
                    </label>
                </div>
            )}
            <p className={hint}>
                Erinnerungen kommen in der App und als Push-Mitteilung, sobald du Push im Bereich
                Benachrichtigungen aktiviert hast. Auf dem iPhone und iPad funktioniert Web-Push
                nur, wenn KochTakt als App zum Home-Bildschirm hinzugefügt ist. Eine Erinnerung, die
                in die Ruhezeiten fällt, kommt danach, sofern die Mahlzeit dann noch nicht begonnen
                hat.
            </p>
        </fieldset>
    );
}
