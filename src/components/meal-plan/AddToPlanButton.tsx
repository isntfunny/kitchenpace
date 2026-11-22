'use client';

import { CalendarPlus } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { addPlanEntries, getPlanContext, type PlanContext } from '@app/app/plan/actions';
import { Button } from '@app/components/atoms/Button';
import { useToastContext } from '@app/components/providers/ToastProvider';
import { ServingsStepper } from '@app/components/ui/ServingsStepper';
import { Sheet } from '@app/components/ui/Sheet';
import { defaultServings, slotLabel } from '@app/lib/meal-plan/slots';
import { shortDate, weekParam } from '@app/lib/meal-plan/view';
import { weekDays } from '@app/lib/meal-plan/week';
import { addDays, weekdayShort } from '@shared/dates';

import { css } from 'styled-system/css';

import { PlanDayPicker, SlotChoice } from './AddToPlanParts';
import { TimeField } from './FormParts';
import { HouseholdPrompt } from './HouseholdPrompt';

const OPEN_PARAM = 'zumPlan';

const column = css({ display: 'flex', flexDirection: 'column', gap: '4' });
const amounts = css({ display: 'flex', flexWrap: 'wrap', gap: '4', alignItems: 'flex-end' });
const errorText = css({ color: 'status.error', fontSize: 'sm' });
const planLink = css({ textAlign: 'center', fontSize: 'sm', color: 'primary', fontWeight: '600' });
const loading = css({ py: '6', textAlign: 'center', color: 'foreground.muted' });
const loadError = css({ py: '6', textAlign: 'center', color: 'status.error' });

interface AddToPlanButtonProps {
    recipe: { id: string; title: string };
    isAuthenticated: boolean;
}

/** "Zum Plan" on the recipe page (KUC-100): bottom sheet on phones, dialog on desktop. */
export function AddToPlanButton({ recipe, isAuthenticated }: AddToPlanButtonProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    // Back from sign-in with ?zumPlan=1: open the sheet right away
    useEffect(() => {
        const url = new URL(window.location.href);
        if (!isAuthenticated || url.searchParams.get(OPEN_PARAM) !== '1') return;
        url.searchParams.delete(OPEN_PARAM);
        window.history.replaceState(null, '', url.toString());
        const timer = window.setTimeout(() => setOpen(true), 0);
        return () => window.clearTimeout(timer);
    }, [isAuthenticated]);

    const start = (event: React.MouseEvent) => {
        if (isAuthenticated) return;
        // Guests sign in first and come back with the sheet open
        event.preventDefault();
        const back = `${pathname}?${OPEN_PARAM}=1`;
        router.push(`/auth/signin?callbackUrl=${encodeURIComponent(back)}`);
    };

    return (
        <Sheet
            open={open}
            onOpenChange={setOpen}
            title="Zum Plan"
            subtitle={recipe.title}
            trigger={
                <Button type="button" variant="ghost" onClick={start}>
                    <CalendarPlus size={16} />
                    Zum Plan
                </Button>
            }
        >
            {open && <AddToPlanBody recipe={recipe} onDone={() => setOpen(false)} />}
        </Sheet>
    );
}

function AddToPlanBody({
    recipe,
    onDone,
}: {
    recipe: AddToPlanButtonProps['recipe'];
    onDone: () => void;
}) {
    const router = useRouter();
    const { showToast } = useToastContext();
    const [context, setContext] = useState<PlanContext | null>(null);
    const [weekStart, setWeekStart] = useState<string | null>(null);
    const [date, setDate] = useState<string | null>(null);
    const [slotKey, setSlotKey] = useState<string | null>(null);
    const [servings, setServings] = useState<number | null>(null);
    const [time, setTime] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const apply = useCallback((result: Awaited<ReturnType<typeof getPlanContext>>) => {
        if (!result.ok) {
            setError(result.error);
            return;
        }
        const data = result.data;
        setContext(data);
        setWeekStart(data.weekStart);
        setDate((current) => current ?? data.today);
        setServings((current) => current ?? defaultServings(data.settings.householdSize));
        setSlotKey((current) => {
            if (current) return current;
            const enabled = data.settings.slots.filter((slot) => slot.enabled);
            return (
                enabled.find((slot) => slot.key === 'DINNER') ??
                enabled[0] ??
                data.settings.slots[0]
            ).key;
        });
    }, []);

    const load = (day: string) => getPlanContext({ recipeId: recipe.id, date: day }).then(apply);

    useEffect(() => {
        let active = true;
        getPlanContext({ recipeId: recipe.id }).then((result) => active && apply(result));
        return () => {
            active = false;
        };
    }, [recipe.id, apply]);

    const slots =
        context?.settings.slots.filter((slot) => slot.enabled || slot.key === slotKey) ?? [];
    const slot = context?.settings.slots.find((item) => item.key === slotKey) ?? null;
    const effectiveTime = time ?? slot?.time ?? '';

    const submit = async () => {
        if (!date || !slot || !servings) return;
        setBusy(true);
        setError(null);
        const result = await addPlanEntries([
            {
                recipeId: recipe.id,
                date,
                slot: slot.key,
                servings,
                time: time && time !== slot.time ? time : null,
            },
        ]);
        setBusy(false);
        if (!result.ok) return setError(result.error);
        showToast({
            type: 'success',
            title: `„${recipe.title}“ eingeplant`,
            message: `${weekdayShort(date)}, ${shortDate(date)} · ${slotLabel(slot)}`,
            action: { label: 'Zum Wochenplan', href: `/plan?week=${weekParam(weekStart ?? date)}` },
        });
        onDone();
        router.refresh();
    };

    if (!context || !weekStart || !date) {
        return (
            <p role={error ? 'alert' : 'status'} className={error ? loadError : loading}>
                {error ?? 'Lade …'}
            </p>
        );
    }

    if (context.settings.householdSize === null) {
        return (
            <HouseholdPrompt
                onSaved={(size) => {
                    setServings(size);
                    setContext({
                        ...context,
                        settings: { ...context.settings, householdSize: size },
                    });
                }}
            />
        );
    }

    return (
        <div className={column}>
            <PlanDayPicker
                weekStart={weekStart}
                days={weekDays(weekStart)}
                today={context.today}
                value={date}
                onChange={setDate}
                onWeek={(delta) => load(addDays(weekStart, delta))}
                placements={context.placements}
                slots={context.settings.slots}
            />
            <SlotChoice
                slots={slots}
                value={slotKey}
                onChange={(key) => {
                    setSlotKey(key);
                    setTime(null);
                }}
            />
            <div className={amounts}>
                <ServingsStepper
                    value={servings ?? 2}
                    onChange={setServings}
                    householdSize={context.settings.householdSize}
                />
                <TimeField value={effectiveTime} onChange={setTime} />
            </div>
            {error && (
                <p role="alert" className={errorText}>
                    {error}
                </p>
            )}
            <Button
                type="button"
                variant="primary"
                size="lg"
                disabled={busy || !slot || !effectiveTime}
                onClick={submit}
            >
                Zum Plan · {weekdayShort(date)}, {shortDate(date)}
            </Button>
            <Link href={`/plan?week=${weekParam(weekStart)}`} className={planLink}>
                Wochenplan öffnen
            </Link>
        </div>
    );
}
