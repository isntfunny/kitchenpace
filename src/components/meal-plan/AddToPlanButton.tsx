'use client';

import { CalendarPlus } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Popover } from 'radix-ui';
import { useEffect, useState, useSyncExternalStore } from 'react';

import {
    addPlanEntries,
    getPlanContext,
    getPlanMonth,
    type PlanContext,
} from '@app/app/plan/actions';
import { Button } from '@app/components/atoms/Button';
import { useToastContext } from '@app/components/providers/ToastProvider';
import { ServingsStepper } from '@app/components/ui/ServingsStepper';
import { Sheet } from '@app/components/ui/Sheet';
import { defaultServings, slotLabel } from '@app/lib/meal-plan/slots';
import { shortDate, weekParam } from '@app/lib/meal-plan/view';
import { weekStartFor } from '@app/lib/meal-plan/week';
import { weekdayShort } from '@shared/dates';
import { monthOf, suggestSlot, type CalendarEntry } from '@shared/meal-planning/calendar-days';

import { css } from 'styled-system/css';

import { SlotChoice } from './AddToPlanParts';
import { TimeField } from './FormParts';
import { HouseholdPrompt } from './HouseholdPrompt';
import { PlanMonthCalendar } from './PlanMonthCalendar';

const OPEN_PARAM = 'zumPlan';
const DESKTOP_QUERY = '(min-width: 768px)';

const column = css({ display: 'flex', flexDirection: 'column', gap: '4' });
const amounts = css({ display: 'flex', flexWrap: 'wrap', gap: '4', alignItems: 'flex-end' });
const errorText = css({ color: 'status.error', fontSize: 'sm' });
const planLink = css({ textAlign: 'center', fontSize: 'sm', color: 'primary', fontWeight: '600' });
const loading = css({ py: '6', textAlign: 'center', color: 'foreground.muted' });
const loadError = css({ py: '6', textAlign: 'center', color: 'status.error' });
const placedText = css({ fontSize: 'sm', color: 'primary', fontWeight: '500' });
const popover = css({
    width: '380px',
    maxWidth: '94vw',
    maxHeight: 'min(80dvh, 720px)',
    overflowY: 'auto',
    p: '4',
    borderRadius: 'surface',
    border: '1px solid',
    borderColor: 'border',
    bg: 'surface.elevated',
    color: 'text',
    boxShadow: 'shadow.medium',
    zIndex: 71,
    _focusVisible: { outline: 'none' },
});
const popoverHead = css({ mb: '4' });
const popoverTitle = css({ fontFamily: 'heading', fontSize: 'lg', fontWeight: '700' });
const popoverSubtitle = css({ fontSize: 'sm', color: 'foreground.muted', mt: '1' });

interface AddToPlanButtonProps {
    recipe: { id: string; title: string };
    isAuthenticated: boolean;
}

/** Phones get the sheet, from md a dropdown next to the button. */
function useIsDesktop(): boolean {
    return useSyncExternalStore(
        (notify) => {
            const query = window.matchMedia(DESKTOP_QUERY);
            query.addEventListener('change', notify);
            return () => query.removeEventListener('change', notify);
        },
        () => window.matchMedia(DESKTOP_QUERY).matches,
        () => false,
    );
}

/**
 * "Hinzufügen zu …" on the recipe page (KUC-130, was "Zum Plan" in KUC-100): month calendar
 * in a dropdown on desktop and in the sheet on phones.
 */
export function AddToPlanButton({ recipe, isAuthenticated }: AddToPlanButtonProps) {
    const router = useRouter();
    const pathname = usePathname();
    const desktop = useIsDesktop();
    const [open, setOpen] = useState(false);

    // Back from sign-in with ?zumPlan=1: open it right away
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
        // Guests sign in first and come back with the calendar open
        event.preventDefault();
        const back = `${pathname}?${OPEN_PARAM}=1`;
        router.push(`/auth/signin?callbackUrl=${encodeURIComponent(back)}`);
    };

    const trigger = (
        <Button type="button" variant="ghost" onClick={start}>
            <CalendarPlus size={16} />
            Hinzufügen zu …
        </Button>
    );
    const body = open && <AddToPlanBody recipe={recipe} onDone={() => setOpen(false)} />;

    if (desktop) {
        return (
            <Popover.Root open={open} onOpenChange={setOpen}>
                <Popover.Trigger asChild>{trigger}</Popover.Trigger>
                <Popover.Portal>
                    <Popover.Content
                        className={popover}
                        sideOffset={8}
                        collisionPadding={12}
                        aria-label="Hinzufügen zu …"
                    >
                        <div className={popoverHead}>
                            <p className={popoverTitle}>Hinzufügen zu …</p>
                            <p className={popoverSubtitle}>{recipe.title}</p>
                        </div>
                        {body}
                    </Popover.Content>
                </Popover.Portal>
            </Popover.Root>
        );
    }

    return (
        <Sheet
            open={open}
            onOpenChange={setOpen}
            title="Hinzufügen zu …"
            subtitle={recipe.title}
            trigger={trigger}
        >
            {body}
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
    const [month, setMonth] = useState<string | null>(null);
    const [monthData, setMonthData] = useState<{ month: string; entries: CalendarEntry[] } | null>(
        null,
    );
    const [date, setDate] = useState<string | null>(null);
    // The user's own choice; null follows the suggestion for the free meals of the day
    const [slotChoice, setSlotChoice] = useState<string | null>(null);
    const [servings, setServings] = useState<number | null>(null);
    const [timeChoice, setTimeChoice] = useState<{ slot: string; value: string } | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        getPlanContext({}).then((result) => {
            if (!active) return;
            if (!result.ok) return setError(result.error);
            const data = result.data;
            setContext(data);
            setMonth(monthOf(data.today));
            setDate(data.today);
            setServings(defaultServings(data.settings.householdSize));
        });
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!month) return;
        let active = true;
        getPlanMonth({ month }).then((result) => {
            if (!active) return;
            if (!result.ok) return setError(result.error);
            setMonthData({ month, entries: result.data.entries });
        });
        return () => {
            active = false;
        };
    }, [month]);

    const entries = monthData?.entries ?? [];
    const onDay = date ? entries.filter((entry) => entry.date === date) : [];
    const taken = new Set(onDay.map((entry) => entry.slot));
    const slots =
        context?.settings.slots.filter((slot) => slot.enabled || slot.key === slotChoice) ?? [];
    const wanted = slotChoice ?? 'DINNER';
    const slotKey = slotChoice ?? suggestSlot(slots, taken, wanted);
    const slot = context?.settings.slots.find((item) => item.key === slotKey) ?? null;
    const effectiveTime =
        timeChoice && timeChoice.slot === slot?.key ? timeChoice.value : (slot?.time ?? '');
    const plannedHere = onDay
        .filter((entry) => entry.recipeId === recipe.id)
        .map((entry) => {
            const config = context?.settings.slots.find((item) => item.key === entry.slot);
            return config ? slotLabel(config) : 'Mahlzeit';
        });

    const submit = async () => {
        if (!date || !slot || !servings || !context) return;
        setBusy(true);
        setError(null);
        const result = await addPlanEntries([
            {
                recipeId: recipe.id,
                date,
                slot: slot.key,
                servings,
                time: effectiveTime !== slot.time ? effectiveTime : null,
            },
        ]);
        setBusy(false);
        if (!result.ok) return setError(result.error);
        const weekStart = weekStartFor(date, context.settings.weekStartDay);
        showToast({
            type: 'success',
            title: `„${recipe.title}“ eingeplant`,
            message: `${weekdayShort(date)}, ${shortDate(date)} · ${slotLabel(slot)}`,
            action: { label: 'Zum Wochenplan', href: `/plan?week=${weekParam(weekStart)}` },
        });
        onDone();
        router.refresh();
    };

    if (!context || !month || !date) {
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
            <PlanMonthCalendar
                month={month}
                onMonth={setMonth}
                weekStartDay={context.settings.weekStartDay}
                today={context.today}
                value={date}
                onChange={(day) => {
                    setDate(day);
                    setSlotChoice(null);
                    // A day from the neighbouring month shows that month
                    if (monthOf(day) !== month) setMonth(monthOf(day));
                }}
                entries={entries}
                recipeId={recipe.id}
                loading={monthData?.month !== month}
            />
            {plannedHere.length > 0 && (
                <p className={placedText}>Schon geplant: {plannedHere.join(', ')}</p>
            )}
            <SlotChoice slots={slots} value={slotKey} taken={taken} onChange={setSlotChoice} />
            <div className={amounts}>
                <ServingsStepper
                    value={servings ?? 2}
                    onChange={setServings}
                    householdSize={context.settings.householdSize}
                />
                <TimeField
                    value={effectiveTime}
                    onChange={(value) => slot && setTimeChoice({ slot: slot.key, value })}
                />
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
                Hinzufügen · {weekdayShort(date)}, {shortDate(date)}
            </Button>
            <Link
                href={`/plan?week=${weekParam(weekStartFor(date, context.settings.weekStartDay))}`}
                className={planLink}
            >
                Wochenplan öffnen
            </Link>
        </div>
    );
}
