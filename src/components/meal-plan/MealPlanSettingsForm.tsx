'use client';

import { useState, useSyncExternalStore } from 'react';

import { savePlanSettings, saveWeekSlots } from '@app/app/plan/actions';
import { Button } from '@app/components/atoms/Button';
import { sortSlots, type SlotConfig } from '@app/lib/meal-plan/slots';

import { css } from 'styled-system/css';

import { DisplaySettings, HouseholdSettings, ReminderSettings } from './SettingsSections';
import { SlotSettings } from './SlotSettings';

export interface MealPlanSettingsValues {
    householdSize: number | null;
    weekStartDay: number;
    shoppingDay: number | null;
    timezone: string;
    mealPlanShowTime: boolean;
    mealPlanShowServings: boolean;
    mealPlanShowCalories: boolean;
    slots: SlotConfig[];
    /** Reminders (KUC-109): only passed by the profile settings, the section is hidden without them */
    notifyOnCookStart?: boolean;
    notifyOnWeeklyPlanReminder?: boolean;
    quietHoursStart?: string | null;
    quietHoursEnd?: string | null;
}

interface MealPlanSettingsFormProps {
    initial: MealPlanSettingsValues;
    /** Week mode: slot changes may apply to this week only (KUC-102) */
    week?: { startDate: string; slots: SlotConfig[]; hasOverride: boolean };
    onSaved?: () => void;
}

const noSubscribe = () => () => {};

const form = css({ display: 'flex', flexDirection: 'column' });
const footer = css({
    display: 'flex',
    alignItems: 'center',
    gap: '3',
    pt: '4',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderColor: 'border.muted',
});
const statusText = {
    ok: css({ fontSize: 'sm', color: 'status.success' }),
    error: css({ fontSize: 'sm', color: 'status.error' }),
};

/** Meal plan settings: household, week start, shopping day, time zone, slots, display. */
export function MealPlanSettingsForm({ initial, week, onSaved }: MealPlanSettingsFormProps) {
    const [values, setValues] = useState(initial);
    const [slots, setSlots] = useState<SlotConfig[]>(week?.slots ?? initial.slots);
    const [weekOnly, setWeekOnly] = useState(!!week?.hasOverride);
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
    const deviceZone = useSyncExternalStore(
        noSubscribe,
        () => Intl.DateTimeFormat().resolvedOptions().timeZone || null,
        () => null,
    );
    const browserZone = deviceZone && deviceZone !== initial.timezone ? deviceZone : null;
    const showReminders = initial.notifyOnCookStart !== undefined;

    const set = <K extends keyof MealPlanSettingsValues>(
        key: K,
        value: MealPlanSettingsValues[K],
    ) => {
        setValues((current) => ({ ...current, [key]: value }));
        setStatus(null);
    };
    const editSlots = (update: (current: SlotConfig[]) => SlotConfig[]) => {
        setSlots(update);
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

    return (
        <form onSubmit={save} className={form}>
            <HouseholdSettings values={values} set={set} browserZone={browserZone} />
            <SlotSettings
                slots={slots}
                setSlots={editSlots}
                onReset={() => {
                    setWeekOnly(false);
                    setSlots(initial.slots);
                }}
                week={week}
                weekOnly={weekOnly}
                setWeekOnly={setWeekOnly}
            />
            <DisplaySettings values={values} set={set} />
            {showReminders && (
                <ReminderSettings
                    values={values}
                    set={set}
                    onQuietHours={(on) => {
                        setValues((current) => ({
                            ...current,
                            quietHoursStart: on ? '22:00' : null,
                            quietHoursEnd: on ? '07:00' : null,
                        }));
                        setStatus(null);
                    }}
                />
            )}
            <div className={footer}>
                <Button variant="primary" type="submit" disabled={busy}>
                    Speichern
                </Button>
                {status && (
                    <span role="status" className={status.ok ? statusText.ok : statusText.error}>
                        {status.text}
                    </span>
                )}
            </div>
        </form>
    );
}
