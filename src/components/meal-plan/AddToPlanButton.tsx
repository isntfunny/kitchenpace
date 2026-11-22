'use client';

import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { addPlanEntries, getPlanContext, type PlanContext } from '@app/app/plan/actions';
import { Button, IconButton } from '@app/components/atoms/Button';
import { chip, fieldLabel } from '@app/components/atoms/recipes';
import { useToastContext } from '@app/components/providers/ToastProvider';
import { ServingsStepper } from '@app/components/ui/ServingsStepper';
import { Sheet } from '@app/components/ui/Sheet';
import { defaultServings, slotLabel } from '@app/lib/meal-plan/slots';
import { shortDate, weekNumber, weekParam, weekdayShort } from '@app/lib/meal-plan/view';
import { addDays, weekDays } from '@app/lib/meal-plan/week';

import { css, cx } from 'styled-system/css';

import { TimeField } from './FormParts';
import { HouseholdPrompt } from './HouseholdPrompt';

const OPEN_PARAM = 'zumPlan';

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
            <p
                role={error ? 'alert' : 'status'}
                className={css({
                    py: '6',
                    textAlign: 'center',
                    color: error ? 'status.error' : 'foreground.muted',
                })}
            >
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

    const placements = context.placements;
    const days = weekDays(weekStart);

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '4' })}>
            <div className={css({ display: 'flex', flexDirection: 'column', gap: '2' })}>
                <div className={css({ display: 'flex', alignItems: 'center', gap: '2' })}>
                    <span className={cx(fieldLabel, css({ flex: 1 }))}>Tag</span>
                    <IconButton
                        aria-label="Vorherige Woche"
                        onClick={() => load(addDays(weekStart, -7))}
                    >
                        <ChevronLeft size={16} />
                    </IconButton>
                    <span
                        className={css({
                            fontSize: 'sm',
                            fontWeight: '600',
                            minW: '14',
                            textAlign: 'center',
                        })}
                    >
                        KW {weekNumber(weekStart)}
                    </span>
                    <IconButton
                        aria-label="Nächste Woche"
                        onClick={() => load(addDays(weekStart, 7))}
                    >
                        <ChevronRight size={16} />
                    </IconButton>
                </div>
                <div
                    role="radiogroup"
                    aria-label="Tag"
                    className={css({
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                        gap: '1',
                    })}
                >
                    {days.map((day) => {
                        const active = day === date;
                        const past = day < context.today;
                        const planned = placements.some((item) => item.date === day);
                        return (
                            <button
                                key={day}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                aria-label={`${weekdayShort(day)}, ${shortDate(day)}${planned ? ', schon geplant' : ''}`}
                                onClick={() => setDate(day)}
                                className={css({
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    minH: '56px',
                                    py: '1.5',
                                    borderRadius: 'xl',
                                    border: '1px solid',
                                    borderColor: active ? 'primary' : 'border.muted',
                                    bg: active ? 'primary' : 'surface',
                                    color: active ? 'white' : 'text',
                                    opacity: past && !active ? 0.45 : 1,
                                    cursor: 'pointer',
                                    fontSize: 'xs',
                                    _focusVisible: {
                                        outline: '2px solid',
                                        outlineColor: 'primary',
                                        outlineOffset: '2px',
                                    },
                                })}
                            >
                                <span className={css({ fontWeight: '700' })}>
                                    {weekdayShort(day)}
                                </span>
                                <span className={css({ fontSize: 'md' })}>
                                    {Number(day.slice(8))}
                                </span>
                                <span
                                    aria-hidden
                                    className={css({
                                        w: '1.5',
                                        h: '1.5',
                                        borderRadius: 'full',
                                        bg: planned
                                            ? active
                                                ? 'white'
                                                : 'primary'
                                            : 'transparent',
                                    })}
                                />
                            </button>
                        );
                    })}
                </div>
                {placements.length > 0 && (
                    <p className={css({ fontSize: 'sm', color: 'primary', fontWeight: '500' })}>
                        Liegt schon am{' '}
                        {placements
                            .map((item) => {
                                const config = context.settings.slots.find(
                                    (s) => s.key === item.slot,
                                );
                                return `${weekdayShort(item.date)} (${config ? slotLabel(config) : 'Mahlzeit'})`;
                            })
                            .join(', ')}
                    </p>
                )}
            </div>

            <div className={css({ display: 'flex', flexDirection: 'column', gap: '2' })}>
                <span className={fieldLabel}>Mahlzeit</span>
                <div
                    role="radiogroup"
                    aria-label="Mahlzeit"
                    className={css({ display: 'flex', flexWrap: 'wrap', gap: '2' })}
                >
                    {slots.map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            role="radio"
                            aria-checked={item.key === slotKey}
                            className={chip({ active: item.key === slotKey })}
                            onClick={() => {
                                setSlotKey(item.key);
                                setTime(null);
                            }}
                        >
                            {slotLabel(item)}
                        </button>
                    ))}
                </div>
            </div>

            <div
                className={css({
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4',
                    alignItems: 'flex-end',
                })}
            >
                <ServingsStepper
                    value={servings ?? 2}
                    onChange={setServings}
                    householdSize={context.settings.householdSize}
                />
                <TimeField value={effectiveTime} onChange={setTime} />
            </div>

            {error && (
                <p role="alert" className={css({ color: 'status.error', fontSize: 'sm' })}>
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
            <Link
                href={`/plan?week=${weekParam(weekStart)}`}
                className={css({
                    textAlign: 'center',
                    fontSize: 'sm',
                    color: 'primary',
                    fontWeight: '600',
                })}
            >
                Wochenplan öffnen
            </Link>
        </div>
    );
}
