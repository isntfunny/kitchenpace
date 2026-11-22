import { Bell, Check, Clock, RefreshCw, ShoppingCart } from 'lucide-react';
import Link from 'next/link';

import { builtInMarkers, type DishMarker } from '@app/lib/meal-plan/view';

import { css, cx } from 'styled-system/css';

import { marker } from './styles';
import type { PlanDish, PlanDisplay } from './types';

const ICONS = { check: Check, clock: Clock, cart: ShoppingCart, refresh: RefreshCw, bell: Bell };

export function DishMarkers({ markers }: { markers: DishMarker[] }) {
    if (markers.length === 0) return null;
    return (
        <span className={css({ display: 'flex', flexWrap: 'wrap', columnGap: '1' })}>
            {markers.map((item) => {
                const Icon = item.icon ? ICONS[item.icon] : null;
                return (
                    <span key={item.label} className={marker({ tone: item.tone })}>
                        {Icon && <Icon size={11} aria-hidden />}
                        {item.label}
                    </span>
                );
            })}
        </span>
    );
}

/** What the card shows of a dish; the shared week passes the same fields */
export type DishCardDish = Pick<
    PlanDish,
    | 'date'
    | 'time'
    | 'servings'
    | 'status'
    | 'notes'
    | 'isLeftover'
    | 'leftoverOfDate'
    | 'leftoverForDate'
    | 'recipeAvailable'
> & { recipe: Pick<PlanDish['recipe'], 'slug' | 'title'> };

interface DishCardProps {
    dish: DishCardDish;
    slotTime: string;
    display: PlanDisplay;
    /** Second and further dishes of a slot are sides, shown indented */
    side?: boolean;
    extraMarkers?: DishMarker[];
    compact?: boolean;
    /** The user's today, for the "Gekocht?" question on past days (KUC-103) */
    today?: string;
    /** Room on the right for the menu button of the editing layer (KUC-101) */
    menuSpace?: boolean;
}

export function DishCard({
    dish,
    slotTime,
    display,
    side,
    extraMarkers = [],
    compact,
    today,
    menuSpace,
}: DishCardProps) {
    const cooked = dish.status === 'COMPLETED';
    const gone = !dish.recipeAvailable;
    const markers = [...builtInMarkers(dish, today), ...extraMarkers];
    const time = dish.time ?? slotTime;
    const label = [
        dish.recipe.title,
        dish.isLeftover ? 'Rest' : null,
        display.showTime && !side ? `${time} Uhr` : null,
        display.showServings ? `${dish.servings} Portionen` : null,
    ]
        .filter(Boolean)
        .join(', ');

    return (
        <Link
            href={`/recipe/${dish.recipe.slug}?portionen=${dish.servings}`}
            aria-label={label}
            className={cx(
                css({
                    display: 'block',
                    position: 'relative',
                    minW: 0,
                    minH: '44px',
                    px: compact ? '2' : '2.5',
                    py: '1.5',
                    borderRadius: 'lg',
                    border: '1px solid',
                    borderColor: 'border.muted',
                    bg: side ? 'surface' : 'surface.muted',
                    color: 'text',
                    textDecoration: 'none',
                    transition: 'border-color 150ms ease',
                    _hover: { borderColor: 'primary' },
                    _focusVisible: {
                        outline: '2px solid',
                        outlineColor: 'primary',
                        outlineOffset: '2px',
                    },
                    '& + &': { mt: '1.5' },
                }),
                side && css({ ml: compact ? '1.5' : '3.5' }),
                menuSpace && css({ pr: compact ? '7' : '10' }),
                (cooked || gone) && css({ opacity: 0.65 }),
            )}
        >
            {display.showTime && !side && (
                <span
                    className={css({
                        display: 'block',
                        fontSize: '10px',
                        color: 'foreground.muted',
                    })}
                >
                    {time}
                </span>
            )}
            <span
                className={css({
                    display: 'block',
                    fontSize: compact ? 'xs' : 'sm',
                    fontWeight: side ? '500' : '600',
                    lineHeight: '1.25',
                    overflowWrap: 'anywhere',
                    textDecoration: cooked || gone ? 'line-through' : 'none',
                    textDecorationColor: 'foreground.muted',
                    color: gone ? 'foreground.muted' : 'text',
                })}
            >
                {dish.recipe.title}
            </span>
            {dish.notes && !compact && (
                <span
                    className={css({
                        display: 'block',
                        fontSize: '11px',
                        color: 'foreground.muted',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    })}
                >
                    {dish.notes}
                </span>
            )}
            {display.showServings && (
                <span
                    className={css({
                        display: 'block',
                        fontSize: '11px',
                        color: 'foreground.muted',
                    })}
                >
                    {dish.servings} Port.
                </span>
            )}
            <DishMarkers markers={markers} />
        </Link>
    );
}
