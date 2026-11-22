import Link from 'next/link';

import type { SharedMealPlanWeek } from '@app/lib/meal-plan/share';
import { cellKey, shortDate, weekdayLong } from '@app/lib/meal-plan/view';

import { css } from 'styled-system/css';

/** Read-only week of a share link (KUC-110): days with their meals, no editing. */
export function SharedWeekView({ week }: { week: SharedMealPlanWeek }) {
    const cells = new Map<string, SharedMealPlanWeek['entries']>();
    for (const entry of week.entries) {
        const key = cellKey(entry.date, entry.slot);
        cells.set(key, [...(cells.get(key) ?? []), entry]);
    }
    const used = new Set(week.entries.map((entry) => entry.slot));
    const slots = week.slots.filter((slot) => slot.enabled || used.has(slot.key));

    if (week.entries.length === 0)
        return (
            <p className={css({ color: 'foreground.muted' })}>
                In dieser Woche ist noch nichts geplant.
            </p>
        );

    return (
        <div
            className={css({
                display: 'grid',
                gridTemplateColumns: {
                    base: '1fr',
                    md: 'repeat(2, minmax(0, 1fr))',
                    xl: 'repeat(4, minmax(0, 1fr))',
                },
                gap: '3',
            })}
        >
            {week.days.map((day) => (
                <section
                    key={day}
                    aria-label={`${weekdayLong(day)}, ${shortDate(day)}`}
                    className={css({
                        bg: 'surface',
                        borderRadius: 'surface',
                        border: '1px solid',
                        borderColor: 'border.muted',
                        boxShadow: 'shadow.small',
                        p: '3',
                    })}
                >
                    <h2
                        className={css({
                            fontFamily: 'heading',
                            fontWeight: '700',
                            fontSize: 'lg',
                        })}
                    >
                        {weekdayLong(day)}{' '}
                        <span
                            className={css({
                                fontSize: 'sm',
                                fontWeight: '400',
                                color: 'foreground.muted',
                            })}
                        >
                            {shortDate(day)}
                        </span>
                    </h2>
                    {slots.map((slot) => {
                        const dishes = cells.get(cellKey(day, slot.key)) ?? [];
                        return (
                            <div
                                key={slot.key}
                                className={css({
                                    display: 'grid',
                                    gridTemplateColumns: '84px minmax(0, 1fr)',
                                    gap: '2',
                                    py: '2',
                                    borderTop: '1px solid',
                                    borderColor: 'border.muted',
                                })}
                            >
                                <span
                                    className={css({
                                        pt: '1',
                                        fontSize: '10px',
                                        fontWeight: '700',
                                        color: 'foreground.muted',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        overflowWrap: 'anywhere',
                                    })}
                                >
                                    {slot.label}
                                </span>
                                <div
                                    className={css({
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '1.5',
                                    })}
                                >
                                    {dishes.length === 0 && (
                                        <span
                                            className={css({
                                                fontSize: 'sm',
                                                color: 'foreground.muted',
                                            })}
                                        >
                                            –
                                        </span>
                                    )}
                                    {dishes.map((dish) => (
                                        <Link
                                            key={`${dish.recipe.id}-${dish.position}`}
                                            href={`/recipe/${dish.recipe.slug}?portionen=${dish.servings}`}
                                            className={css({
                                                display: 'block',
                                                px: '2.5',
                                                py: '1.5',
                                                borderRadius: 'lg',
                                                border: '1px solid',
                                                borderColor: 'border.muted',
                                                bg: 'surface.muted',
                                                color: 'text',
                                                textDecoration: 'none',
                                                _hover: { borderColor: 'primary' },
                                                _focusVisible: {
                                                    outline: '2px solid',
                                                    outlineColor: 'primary',
                                                    outlineOffset: '2px',
                                                },
                                            })}
                                        >
                                            <span
                                                className={css({
                                                    display: 'block',
                                                    fontSize: '11px',
                                                    color: 'foreground.muted',
                                                })}
                                            >
                                                {dish.time ?? slot.time} · {dish.servings} Port.
                                            </span>
                                            <span
                                                className={css({
                                                    display: 'block',
                                                    fontSize: 'sm',
                                                    fontWeight: '600',
                                                    overflowWrap: 'anywhere',
                                                })}
                                            >
                                                {dish.recipe.title}
                                            </span>
                                            {'notes' in dish && dish.notes && (
                                                <span
                                                    className={css({
                                                        display: 'block',
                                                        fontSize: '11px',
                                                        color: 'foreground.muted',
                                                    })}
                                                >
                                                    {dish.notes}
                                                </span>
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </section>
            ))}
        </div>
    );
}
