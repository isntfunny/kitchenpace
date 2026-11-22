'use client';

import { ChevronLeft, ChevronRight, Plus, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useMemo, useRef, useState } from 'react';

import {
    cellKey,
    dayCalories,
    formatKcal,
    shortDate,
    weekdayLong,
    weekdayShort,
} from '@app/lib/meal-plan/view';

import { css, cx } from 'styled-system/css';

import type { MealPlanSettingsValues } from './MealPlanSettingsForm';
import { EditableDish, PlanEditorProvider, usePlanEditor } from './PlanEditor';
import { SlotSearchDialog } from './SlotSearchDialog';
import { actionButton, emptySlot, iconButton } from './styles';
import type { PlanDish, PlanExtensions, PlanSlot, PlanWeekData } from './types';
import { WeekSettingsDialog } from './WeekSettingsDialog';
import { WeekTools } from './WeekTools';

export interface WeekViewProps extends PlanExtensions {
    data: PlanWeekData;
    settings: MealPlanSettingsValues;
    /** Inspiration strip below the toolbar (KUC-112) */
    inspiration?: ReactNode;
    /** Extra toolbar buttons, e.g. "Plan mir die Woche" (KUC-113) or "Teilen" (KUC-110) */
    toolbarActions?: ReactNode;
    /** Hints above the grid, e.g. leftovers (KUC-108) or freshness (KUC-96) */
    notices?: ReactNode;
    /** Right column; a placeholder until the shopping widget exists (KUC-104) */
    shoppingPanel?: ReactNode;
}

type Target = { date: string; slot: PlanSlot } | null;

/** Week view with the editing layer (KUC-101); see WeekGrid for the layout. */
export function WeekView(props: WeekViewProps) {
    return (
        <PlanEditorProvider data={props.data}>
            <WeekGrid {...props} />
        </PlanEditorProvider>
    );
}

function WeekGrid({
    data,
    settings,
    inspiration,
    toolbarActions,
    notices,
    shoppingPanel,
    markers = {},
    suggestions = {},
}: WeekViewProps) {
    const [target, setTargetState] = useState<Target>(null);
    const opener = useRef<HTMLElement | null>(null);
    const setTarget = (next: Target) => {
        if (next) opener.current = document.activeElement as HTMLElement | null;
        setTargetState(next);
    };

    const cells = useMemo(() => {
        const map = new Map<string, PlanDish[]>();
        for (const dish of data.dishes) {
            const key = cellKey(dish.date, dish.slot);
            map.set(key, [...(map.get(key) ?? []), dish]);
        }
        for (const list of map.values()) list.sort((a, b) => a.position - b.position);
        return map;
    }, [data.dishes]);

    const calories = useMemo(
        () =>
            Object.fromEntries(
                data.days.map((day) => [
                    day,
                    dayCalories(
                        data.dishes.filter((dish) => dish.date === day && dish.recipeAvailable),
                    ),
                ]),
            ),
        [data.days, data.dishes],
    );

    const freeSlots = data.days.reduce(
        (count, day) =>
            count +
            data.slots.filter((slot) => slot.enabled && !cells.has(cellKey(day, slot.key))).length,
        0,
    );

    const renderCell = (day: string, slot: PlanSlot, compact: boolean) => {
        const dishes = cells.get(cellKey(day, slot.key)) ?? [];
        const suggestion = suggestions[cellKey(day, slot.key)];
        const label = `${weekdayLong(day)}, ${slot.label}: Gericht hinzufügen`;
        return (
            <div className={css({ display: 'flex', flexDirection: 'column', minW: 0 })}>
                {dishes.map((dish, index) => (
                    <EditableDish
                        key={dish.id}
                        dish={dish}
                        slotTime={slot.time}
                        display={data.display}
                        side={index > 0}
                        compact={compact}
                        extraMarkers={markers[dish.id]}
                        today={data.today}
                    />
                ))}
                {dishes.length === 0 && suggestion}
                {dishes.length === 0 && !suggestion ? (
                    <button
                        type="button"
                        className={emptySlot}
                        onClick={() => setTarget({ date: day, slot })}
                        aria-label={label}
                    >
                        + hinzufügen
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => setTarget({ date: day, slot })}
                        aria-label={label}
                        className={css({
                            alignSelf: 'flex-start',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '1',
                            mt: '1',
                            minH: '32px',
                            px: '1.5',
                            borderRadius: 'md',
                            bg: 'transparent',
                            border: 0,
                            fontSize: 'xs',
                            color: 'foreground.muted',
                            cursor: 'pointer',
                            _hover: { color: 'primary' },
                            _focusVisible: { outline: '2px solid', outlineColor: 'primary' },
                        })}
                    >
                        <Plus size={13} aria-hidden />{' '}
                        {dishes.length === 0 ? 'Eigenes Gericht' : 'Beilage'}
                    </button>
                )}
            </div>
        );
    };

    const dayHead = (day: string) => {
        const isToday = day === data.today;
        const kcal = calories[day];
        return (
            <>
                <div
                    className={css({
                        fontFamily: 'heading',
                        fontWeight: '700',
                        fontSize: 'md',
                        color: isToday ? 'primary' : 'text',
                    })}
                >
                    {isToday ? 'Heute' : weekdayShort(day)}
                </div>
                <div className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                    {shortDate(day)}
                </div>
                {data.display.showCalories && kcal.kcal !== null && (
                    <div
                        className={css({
                            fontSize: '11px',
                            fontWeight: '600',
                            color: { base: '#8a6a00', _dark: 'palette.gold' },
                        })}
                        title={
                            kcal.incomplete
                                ? 'Nicht für alle Gerichte gibt es vollständige Nährwerte.'
                                : 'Kalorien pro Person'
                        }
                    >
                        ~{formatKcal(kcal.kcal)} kcal{kcal.incomplete ? ' · unvollst.' : ''}
                    </div>
                )}
            </>
        );
    };

    const [mobileDay, setMobileDay] = useState(() =>
        data.days.includes(data.today) ? data.today : data.days[0],
    );

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '4' })}>
            {/* Toolbar */}
            <div
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2.5',
                    flexWrap: 'wrap',
                })}
            >
                <nav
                    aria-label="Woche wechseln"
                    className={css({ display: 'flex', alignItems: 'center', gap: '2' })}
                >
                    <Link
                        href={`/plan?week=${data.prevParam}`}
                        className={iconButton}
                        aria-label="Vorherige Woche"
                    >
                        <ChevronLeft size={18} />
                    </Link>
                    <div className={css({ px: '1' })}>
                        <h1
                            className={css({
                                fontFamily: 'heading',
                                fontSize: { base: '2xl', md: '3xl' },
                                fontWeight: '700',
                                lineHeight: '1.1',
                            })}
                        >
                            KW {data.weekNumber}
                        </h1>
                        <p className={css({ fontSize: 'sm', color: 'foreground.muted' })}>
                            {data.rangeLabel}
                            {freeSlots > 0 && (
                                <span className={css({ display: { base: 'inline', lg: 'none' } })}>
                                    {' '}
                                    · {freeSlots} {freeSlots === 1 ? 'Platz' : 'Plätze'} frei
                                </span>
                            )}
                        </p>
                    </div>
                    <Link
                        href={`/plan?week=${data.nextParam}`}
                        className={iconButton}
                        aria-label="Nächste Woche"
                    >
                        <ChevronRight size={18} />
                    </Link>
                </nav>
                {!data.isCurrentWeek && (
                    <Link
                        href={`/plan?week=${data.todayParam}`}
                        className={actionButton({ variant: 'ghost' })}
                    >
                        Heute
                    </Link>
                )}
                <div className={css({ flex: 1 })} />
                {toolbarActions}
                <WeekTools data={data} />
                <WeekSettingsDialog data={data} settings={settings} />
            </div>

            {inspiration}
            {notices}

            <div
                className={css({
                    display: 'grid',
                    gridTemplateColumns: { base: '1fr', xl: 'minmax(0, 1fr) 300px' },
                    gap: '5',
                    alignItems: 'start',
                })}
            >
                {/* Desktop: calendar grid, days as columns, slots as rows */}
                <section
                    aria-label="Wochenplan"
                    className={css({
                        display: { base: 'none', lg: 'grid' },
                        gridTemplateColumns: '44px repeat(7, minmax(0, 1fr))',
                        bg: 'surface',
                        borderRadius: 'surface',
                        border: '1px solid',
                        borderColor: 'border.muted',
                        boxShadow: 'shadow.small',
                        overflow: 'hidden',
                    })}
                >
                    <div />
                    {data.days.map((day) => (
                        <div
                            key={day}
                            className={cx(
                                css({
                                    px: '2',
                                    pt: '3',
                                    pb: '2.5',
                                    borderLeft: '1px solid',
                                    borderColor: 'border.muted',
                                    minW: 0,
                                }),
                                day === data.today &&
                                    css({
                                        bg: 'accent.soft',
                                        boxShadow: 'inset 0 3px 0 token(colors.primary)',
                                    }),
                            )}
                        >
                            {dayHead(day)}
                        </div>
                    ))}
                    {data.slots.map((slot) => (
                        <SlotRow
                            key={slot.key}
                            slot={slot}
                            days={data.days}
                            today={data.today}
                            renderCell={renderCell}
                        />
                    ))}
                </section>

                {/* Mobile: day tabs and one day as a list */}
                <section
                    aria-label="Wochenplan"
                    className={css({ display: { base: 'block', lg: 'none' } })}
                >
                    <div
                        role="tablist"
                        aria-label="Tag"
                        className={css({
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                            gap: '1',
                            mb: '3',
                        })}
                    >
                        {data.days.map((day) => {
                            const active = day === mobileDay;
                            const planned = data.dishes.some((dish) => dish.date === day);
                            return (
                                <button
                                    key={day}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    aria-controls="plan-day-panel"
                                    onClick={() => setMobileDay(day)}
                                    className={css({
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        minH: '52px',
                                        borderRadius: 'xl',
                                        border: '1px solid',
                                        borderColor: active
                                            ? 'primary'
                                            : day === data.today
                                              ? 'primary'
                                              : 'border.muted',
                                        bg: active ? 'primary' : 'surface',
                                        color: active ? 'white' : 'text',
                                        cursor: 'pointer',
                                        fontSize: 'xs',
                                        opacity: !active && day < data.today ? 0.6 : 1,
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
                                    <span>{Number(day.slice(8))}</span>
                                    <span
                                        aria-hidden
                                        className={css({
                                            w: '1',
                                            h: '1',
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
                    <div
                        id="plan-day-panel"
                        role="tabpanel"
                        className={css({
                            bg: 'surface',
                            borderRadius: 'surface',
                            border: mobileDay === data.today ? '2px solid' : '1px solid',
                            borderColor: mobileDay === data.today ? 'primary' : 'border.muted',
                            boxShadow: 'shadow.small',
                            p: '3',
                        })}
                    >
                        <div
                            className={css({
                                display: 'flex',
                                alignItems: 'baseline',
                                gap: '2',
                                mb: '1',
                            })}
                        >
                            <span
                                className={css({
                                    fontFamily: 'heading',
                                    fontWeight: '700',
                                    fontSize: 'lg',
                                    color: mobileDay === data.today ? 'primary' : 'text',
                                })}
                            >
                                {mobileDay === data.today ? 'Heute' : weekdayLong(mobileDay)}
                            </span>
                            <span className={css({ fontSize: 'sm', color: 'foreground.muted' })}>
                                {shortDate(mobileDay)}
                            </span>
                            {data.display.showCalories && calories[mobileDay].kcal !== null && (
                                <span
                                    className={css({
                                        ml: 'auto',
                                        fontSize: 'xs',
                                        fontWeight: '600',
                                        color: { base: '#8a6a00', _dark: 'palette.gold' },
                                    })}
                                >
                                    ~{formatKcal(calories[mobileDay].kcal!)} kcal
                                    {calories[mobileDay].incomplete ? ' · unvollst.' : ''}
                                </span>
                            )}
                        </div>
                        {data.slots.map((slot) => (
                            <div
                                key={slot.key}
                                className={css({
                                    display: 'grid',
                                    gridTemplateColumns: '76px minmax(0, 1fr)',
                                    gap: '2',
                                    py: '2',
                                    borderTop: '1px solid',
                                    borderColor: 'border.muted',
                                    _first: { borderTop: 0 },
                                })}
                            >
                                <div
                                    className={css({
                                        pt: '2.5',
                                        fontSize: '10px',
                                        fontWeight: '700',
                                        color: 'foreground.muted',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                    })}
                                >
                                    {slot.label}
                                </div>
                                {renderCell(mobileDay, slot, false)}
                            </div>
                        ))}
                    </div>
                </section>

                <aside aria-label="Einkauf für diese Woche">
                    {shoppingPanel ?? <ShoppingPlaceholder />}
                </aside>
            </div>

            <SlotSearchDialog
                target={target}
                onClose={() => setTarget(null)}
                householdSize={data.householdSize}
                weekDishes={data.dishes}
                returnFocus={() => opener.current}
            />
        </div>
    );
}

function SlotRow({
    slot,
    days,
    today,
    renderCell,
}: {
    slot: PlanSlot;
    days: string[];
    today: string;
    renderCell: (day: string, slot: PlanSlot, compact: boolean) => ReactNode;
}) {
    const editor = usePlanEditor();
    return (
        <>
            <div
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderTop: '1px solid',
                    borderColor: 'border.muted',
                    fontSize: '10px',
                    fontWeight: '700',
                    color: 'foreground.muted',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                    py: '2',
                    opacity: slot.enabled ? 1 : 0.6,
                })}
                title={slot.enabled ? undefined : 'Ausgeblendet, enthält aber Gerichte'}
            >
                {slot.label}
            </div>
            {days.map((day) => (
                <div
                    key={day}
                    {...editor?.dropTarget({ date: day, slot: slot.key })}
                    className={cx(
                        css({
                            p: '1.5',
                            borderTop: '1px solid',
                            borderLeft: '1px solid',
                            borderColor: 'border.muted',
                            minW: 0,
                            '&[data-drop-over]': {
                                outline: '2px dashed',
                                outlineColor: 'primary',
                                outlineOffset: '-3px',
                                bg: 'accent.soft',
                            },
                        }),
                        day === today && css({ bg: 'accent.soft' }),
                    )}
                >
                    {renderCell(day, slot, true)}
                </div>
            ))}
        </>
    );
}

function ShoppingPlaceholder() {
    return (
        <div
            className={css({
                bg: 'surface',
                borderRadius: 'surface',
                border: '1px solid',
                borderColor: 'border.muted',
                boxShadow: 'shadow.small',
                p: '4',
                display: 'flex',
                flexDirection: 'column',
                gap: '2',
            })}
        >
            <h2
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2',
                    fontFamily: 'heading',
                    fontWeight: '700',
                    fontSize: 'lg',
                })}
            >
                <ShoppingCart size={18} className={css({ color: 'primary' })} aria-hidden />
                Einkauf für diese Woche
            </h2>
            <p className={css({ fontSize: 'sm', color: 'foreground.muted' })}>
                Hier siehst du bald, welche Zutaten für deine Gerichte noch fehlen.
            </p>
            <Link
                href="/shopping-list"
                className={css({ fontSize: 'sm', fontWeight: '600', color: 'primary' })}
            >
                Einkaufsliste öffnen →
            </Link>
        </div>
    );
}
