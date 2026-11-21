'use client';

import { ChefHat } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { addMealPlanEntriesToShoppingList } from '@app/app/shopping-list/actions';
import { SmartImage } from '@app/components/atoms/SmartImage';
import {
    addMissingLabel,
    planStateLabel,
    planStateShortLabel,
    type PlanEntryStatus,
    type PlanStatus,
} from '@app/lib/shopping/plan-status';

import { css, cx } from 'styled-system/css';

export type ShoppingPlanData = PlanStatus & { startDate: string };

const panel = css({
    bg: 'surface',
    color: 'foreground',
    fontFamily: 'body',
    border: '1px solid',
    borderColor: 'border.muted',
    borderRadius: '2xl',
    p: '5',
    boxShadow: 'shadow.medium',
});
const heading = css({ fontFamily: 'heading', fontSize: 'lg', fontWeight: '700', m: '0' });
const hint = css({ color: 'foreground.muted', fontSize: 'sm', m: '0' });
const day = css({
    display: 'flex',
    gap: '3',
    py: '3',
    borderTop: '1px solid',
    borderColor: 'border.muted',
});
const dayLabel = css({ w: '10', flexShrink: 0, textAlign: 'center', lineHeight: '1.2' });
const dayName = css({ display: 'block', fontWeight: '700', fontSize: 'sm' });
const dayNameToday = css({ color: 'primary' });
const dayNumber = css({ fontSize: 'xs', color: 'foreground.muted' });
const dish = css({ display: 'flex', alignItems: 'center', gap: '3', minW: 0, flex: '1' });
const thumb = css({
    position: 'relative',
    w: '11',
    h: '11',
    flexShrink: 0,
    borderRadius: 'lg',
    overflow: 'hidden',
    bg: 'accent.soft',
});
const dishTitle = css({
    display: 'block',
    fontWeight: '600',
    fontSize: 'sm',
    color: 'foreground',
    textDecoration: 'none',
    lineClamp: '2',
    _hover: { color: 'primary' },
});
const state = css({ fontSize: 'xs', mt: '0.5' });
const stateOk = css({ color: 'status.success' });
const stateMissing = css({ color: 'primary', fontWeight: '600' });
const stateMuted = css({ color: 'foreground.muted' });
const cta = css({
    width: '100%',
    minH: '11',
    mt: '4',
    px: '4',
    bg: 'primary',
    color: 'white',
    border: 'none',
    borderRadius: 'lg',
    fontWeight: '600',
    fontFamily: 'body',
    cursor: 'pointer',
    _hover: { bg: 'button.primary-hover' },
    _disabled: { opacity: 0.6, cursor: 'wait' },
    _focusVisible: { outline: '3px solid', outlineColor: 'foreground', outlineOffset: '2px' },
});
const strip = css({
    display: 'flex',
    gap: '2',
    overflowX: 'auto',
    m: '0',
    p: '0',
    pb: '1',
    listStyle: 'none',
    scrollSnapType: 'x proximity',
});
const stripCard = css({
    flex: '0 0 124px',
    scrollSnapAlign: 'start',
    bg: 'surface',
    border: '1px solid',
    borderColor: 'border.muted',
    borderRadius: 'xl',
    p: '2.5',
    boxShadow: 'shadow.small',
});
const stripToday = css({ borderColor: 'primary' });

function stateClass(entry: PlanEntryStatus) {
    return entry.state === 'ok' ? stateOk : entry.state === 'missing' ? stateMissing : stateMuted;
}

/**
 * "Diese Woche": the dishes of the plan week with what each still needs on the
 * shopping list, and the button that adds the missing ingredients. Used as the
 * right column of the list page (variant "column"), as the week strip on phones
 * ("strip") and in the plan view. Data comes from loadShoppingPlanStatus().
 */
export function ShoppingPlanWidget({
    plan,
    variant = 'column',
    onAdded,
}: {
    plan: ShoppingPlanData;
    variant?: 'column' | 'strip';
    /** Called after the missing ingredients were added; default: refresh the route */
    onAdded?: (result: { added: number; skipped: number }) => void;
}) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [message, setMessage] = useState('');
    const label = addMissingLabel(plan);

    const addMissing = () =>
        startTransition(async () => {
            setMessage('');
            const result = await addMealPlanEntriesToShoppingList(plan.missingEntryIds);
            if (!result.ok) {
                setMessage(result.error);
                return;
            }
            const skipped = result.data.skipped.length;
            setMessage(
                skipped > 0
                    ? `Hinzugefügt. ${skipped} Gericht${skipped === 1 ? '' : 'e'} übersprungen: Rezept nicht mehr verfügbar.`
                    : 'Fehlende Zutaten sind auf der Liste.',
            );
            if (onAdded) onAdded({ added: result.data.added, skipped });
            else router.refresh();
        });

    const addButton = label && (
        <button type="button" className={cta} onClick={addMissing} disabled={pending}>
            {pending ? 'Wird hinzugefügt …' : label}
        </button>
    );
    const status = message && (
        <p className={cx(hint, css({ mt: '2' }))} role="status">
            {message}
        </p>
    );

    if (plan.entries.length === 0) {
        return (
            <section className={panel} aria-labelledby="shopping-plan-title">
                <h2 id="shopping-plan-title" className={heading}>
                    Diese Woche
                </h2>
                <p className={cx(hint, css({ mt: '2' }))}>
                    Noch nichts geplant.{' '}
                    <Link href="/plan" className={css({ color: 'primary', fontWeight: '600' })}>
                        Zum Wochenplan
                    </Link>
                </p>
            </section>
        );
    }

    if (variant === 'strip') {
        return (
            <section aria-label="Diese Woche">
                <ul className={strip}>
                    {plan.entries.map((entry) => (
                        <li
                            key={entry.entryId}
                            className={cx(stripCard, entry.isToday && stripToday)}
                        >
                            <span className={cx(dayNumber, entry.isToday && dayNameToday)}>
                                {entry.isToday
                                    ? 'HEUTE'
                                    : `${entry.weekday.toUpperCase()} ${entry.day}.`}
                            </span>
                            <Link
                                href={`/recipe/${entry.recipeId}`}
                                className={cx(dishTitle, css({ my: '1' }))}
                            >
                                {entry.title}
                            </Link>
                            <span className={cx(state, stateClass(entry))}>
                                {planStateShortLabel(entry)}
                            </span>
                        </li>
                    ))}
                </ul>
                {addButton}
                {status}
            </section>
        );
    }

    return (
        <section className={panel} aria-labelledby="shopping-plan-title">
            <h2 id="shopping-plan-title" className={heading}>
                Diese Woche
            </h2>
            <p className={cx(hint, css({ mb: '2' }))}>Was dein Plan noch braucht</p>
            <ul className={css({ m: '0', p: '0', listStyle: 'none' })}>
                {plan.entries.map((entry) => (
                    <li key={entry.entryId} className={day}>
                        <span className={dayLabel}>
                            <b className={cx(dayName, entry.isToday && dayNameToday)}>
                                {entry.weekday}
                            </b>
                            <span className={dayNumber}>
                                {entry.isToday ? 'Heute' : `${entry.day}.`}
                            </span>
                        </span>
                        <div className={dish}>
                            <span className={thumb}>
                                {!entry.imageKey && (
                                    <ChefHat
                                        size={20}
                                        aria-hidden="true"
                                        className={css({
                                            position: 'absolute',
                                            inset: '0',
                                            m: 'auto',
                                            color: 'foreground.muted',
                                        })}
                                    />
                                )}
                                {entry.imageKey && (
                                    <SmartImage
                                        imageKey={entry.imageKey}
                                        alt=""
                                        fill
                                        sizes="44px"
                                        className={css({ objectFit: 'cover' })}
                                    />
                                )}
                            </span>
                            <div className={css({ minW: 0 })}>
                                <Link href={`/recipe/${entry.recipeId}`} className={dishTitle}>
                                    {entry.title}
                                </Link>
                                <div className={cx(state, stateClass(entry))}>
                                    {planStateLabel(entry)}
                                </div>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
            {addButton}
            {status}
        </section>
    );
}
