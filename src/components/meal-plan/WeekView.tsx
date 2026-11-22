'use client';

import { ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useMemo, useRef, useState } from 'react';

import { cellKey, dayCalories } from '@app/lib/meal-plan/view';

import { css } from 'styled-system/css';

import { DesktopWeekGrid } from './DesktopWeekGrid';
import type { MealPlanSettingsValues } from './MealPlanSettingsForm';
import { MobileWeek } from './MobileWeek';
import { PlanCell } from './PlanCell';
import { PlanEditorProvider } from './PlanEditor';
import { SlotSearchDialog } from './SlotSearchDialog';
import { surfaceCard } from './styles';
import type { PlanDish, PlanExtensions, PlanSlot, PlanWeekData } from './types';
import { WeekToolbar } from './WeekToolbar';

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

const page = css({ display: 'flex', flexDirection: 'column', gap: '4' });
const layout = css({
    display: 'grid',
    gridTemplateColumns: { base: '1fr', xl: 'minmax(0, 1fr) 300px' },
    gap: '5',
    alignItems: 'start',
});
const placeholder = css(surfaceCard, {
    p: '4',
    display: 'flex',
    flexDirection: 'column',
    gap: '2',
});
const placeholderTitle = css({
    display: 'flex',
    alignItems: 'center',
    gap: '2',
    fontFamily: 'heading',
    fontWeight: '700',
    fontSize: 'lg',
});
const placeholderIcon = css({ color: 'primary' });
const placeholderText = css({ fontSize: 'sm', color: 'foreground.muted' });
const placeholderLink = css({ fontSize: 'sm', fontWeight: '600', color: 'primary' });

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

    const renderCell = (day: string, slot: PlanSlot, compact: boolean) => (
        <PlanCell
            day={day}
            slot={slot}
            dishes={cells.get(cellKey(day, slot.key)) ?? []}
            compact={compact}
            display={data.display}
            today={data.today}
            markers={markers}
            onAdd={() => setTarget({ date: day, slot })}
        />
    );

    const defaultDay = data.days.includes(data.today) ? data.today : data.days[0];
    const [pickedDay, setMobileDay] = useState(defaultDay);
    // After switching weeks the picked day belongs to the old week: fall back to today/Monday
    const mobileDay = data.days.includes(pickedDay) ? pickedDay : defaultDay;

    return (
        <div className={page}>
            <WeekToolbar
                data={data}
                settings={settings}
                freeSlots={freeSlots}
                actions={toolbarActions}
            />

            {inspiration}
            {notices}

            <div className={layout}>
                <DesktopWeekGrid data={data} calories={calories} renderCell={renderCell} />
                <MobileWeek
                    data={data}
                    day={mobileDay}
                    onDay={setMobileDay}
                    kcal={calories[mobileDay]}
                    renderCell={renderCell}
                />
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

function ShoppingPlaceholder() {
    return (
        <div className={placeholder}>
            <h2 className={placeholderTitle}>
                <ShoppingCart size={18} className={placeholderIcon} aria-hidden />
                Einkauf für diese Woche
            </h2>
            <p className={placeholderText}>
                Hier siehst du bald, welche Zutaten für deine Gerichte noch fehlen.
            </p>
            <Link href="/shopping-list" className={placeholderLink}>
                Einkaufsliste öffnen →
            </Link>
        </div>
    );
}
