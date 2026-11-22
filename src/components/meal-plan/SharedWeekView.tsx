import type { SharedMealPlanWeek } from '@app/lib/meal-plan/share';
import { cellKey, shortDate } from '@app/lib/meal-plan/view';
import { weekdayLong } from '@shared/dates';

import { css } from 'styled-system/css';

import { DayCard, DaySlotRow } from './DayCard';
import { DishCard, type DishCardDish } from './DishCard';
import type { PlanDisplay } from './types';

type SharedEntry = SharedMealPlanWeek['entries'][number];

const DISPLAY: PlanDisplay = { showTime: true, showServings: true, showCalories: false };

const empty = css({ color: 'foreground.muted' });
const grid = css({
    display: 'grid',
    gridTemplateColumns: {
        base: '1fr',
        md: 'repeat(2, minmax(0, 1fr))',
        xl: 'repeat(4, minmax(0, 1fr))',
    },
    gap: '3',
});
const dishes = css({ display: 'flex', flexDirection: 'column', minW: 0 });
const none = css({ pt: '2.5', fontSize: 'sm', color: 'foreground.muted' });

/** A shared entry as a plan dish: planned, available, no leftover links. */
function asDish(entry: SharedEntry): DishCardDish {
    return {
        date: entry.date,
        time: entry.time,
        servings: entry.servings,
        status: 'PLANNED',
        notes: 'notes' in entry && entry.notes ? entry.notes : null,
        isLeftover: false,
        leftoverOfDate: null,
        leftoverForDate: null,
        recipeAvailable: true,
        recipe: entry.recipe,
    };
}

/** Read-only week of a share link (KUC-110): the day cards of the plan, no editing. */
export function SharedWeekView({ week }: { week: SharedMealPlanWeek }) {
    const cells = new Map<string, SharedEntry[]>();
    for (const entry of week.entries) {
        const key = cellKey(entry.date, entry.slot);
        cells.set(key, [...(cells.get(key) ?? []), entry]);
    }
    const used = new Set(week.entries.map((entry) => entry.slot));
    const slots = week.slots.filter((slot) => slot.enabled || used.has(slot.key));

    if (week.entries.length === 0)
        return <p className={empty}>In dieser Woche ist noch nichts geplant.</p>;

    return (
        <div className={grid}>
            {week.days.map((day) => (
                <DayCard
                    key={day}
                    role="region"
                    aria-label={`${weekdayLong(day)}, ${shortDate(day)}`}
                    heading="h2"
                    title={weekdayLong(day)}
                    date={shortDate(day)}
                >
                    {slots.map((slot) => {
                        const entries = cells.get(cellKey(day, slot.key)) ?? [];
                        return (
                            <DaySlotRow key={slot.key} label={slot.label}>
                                <div className={dishes}>
                                    {entries.length === 0 && <span className={none}>–</span>}
                                    {entries.map((entry, index) => (
                                        <DishCard
                                            key={`${entry.recipe.id}-${entry.position}`}
                                            dish={asDish(entry)}
                                            slotTime={slot.time}
                                            display={DISPLAY}
                                            side={index > 0}
                                        />
                                    ))}
                                </div>
                            </DaySlotRow>
                        );
                    })}
                </DayCard>
            ))}
        </div>
    );
}
