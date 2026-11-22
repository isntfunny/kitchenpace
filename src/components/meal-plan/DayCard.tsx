import type { HTMLAttributes, ReactNode } from 'react';

import { css } from 'styled-system/css';

import { slotName, surfaceCard } from './styles';

const card = css(surfaceCard, { p: '3' });
const highlightedCard = css(surfaceCard, { border: '2px solid', borderColor: 'primary', p: '3' });
const head = css({ display: 'flex', alignItems: 'baseline', gap: '2', mb: '1' });
const titleText = css({ fontFamily: 'heading', fontWeight: '700', fontSize: 'lg', color: 'text' });
const todayTitle = css({
    fontFamily: 'heading',
    fontWeight: '700',
    fontSize: 'lg',
    color: 'primary',
});
const dateText = css({ fontSize: 'sm', color: 'foreground.muted' });
const row = css({
    display: 'grid',
    gridTemplateColumns: '76px minmax(0, 1fr)',
    gap: '2',
    py: '2',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderColor: 'border.muted',
    _first: { borderTop: 0 },
});
const rowLabel = css(slotName, { pt: '2.5', overflowWrap: 'anywhere' });

/**
 * Card of one day with its meals as rows (the plan on phones, the shared week).
 * `highlighted` marks today; `extra` sits right in the head (e.g. calories).
 */
export function DayCard({
    title,
    date,
    highlighted = false,
    heading = 'span',
    extra,
    children,
    ...props
}: {
    title: ReactNode;
    date: ReactNode;
    highlighted?: boolean;
    /** Element of the title; `h2` where the day is a section of the page */
    heading?: 'span' | 'h2';
    extra?: ReactNode;
    children: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'className'>) {
    const Title = heading;
    return (
        <div {...props} className={highlighted ? highlightedCard : card}>
            <div className={head}>
                <Title className={highlighted ? todayTitle : titleText}>{title}</Title>
                <span className={dateText}>{date}</span>
                {extra}
            </div>
            {children}
        </div>
    );
}

/** One meal of a day card: slot name left, its dishes right. */
export function DaySlotRow({ label, children }: { label: ReactNode; children: ReactNode }) {
    return (
        <div className={row}>
            <div className={rowLabel}>{label}</div>
            {children}
        </div>
    );
}
