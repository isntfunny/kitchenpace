'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { button, iconButton } from '@app/components/atoms/recipes';

import { css } from 'styled-system/css';

import type { MealPlanSettingsValues } from './MealPlanSettingsForm';
import type { PlanWeekData } from './types';
import { WeekSettingsDialog } from './WeekSettingsDialog';
import { WeekTools } from './WeekTools';

const bar = css({ display: 'flex', alignItems: 'center', gap: '2.5', flexWrap: 'wrap' });
const nav = css({ display: 'flex', alignItems: 'center', gap: '2' });
const titleBox = css({ px: '1' });
const title = css({
    fontFamily: 'heading',
    fontSize: { base: '2xl', md: '3xl' },
    fontWeight: '700',
    lineHeight: '1.1',
});
const range = css({ fontSize: 'sm', color: 'foreground.muted' });
const freeHint = css({ display: { base: 'inline', lg: 'none' } });
const spacer = css({ flex: 1 });

/** Week switcher with KW and range, "Heute", extra actions, tools and settings. */
export function WeekToolbar({
    data,
    settings,
    freeSlots,
    actions,
}: {
    data: PlanWeekData;
    settings: MealPlanSettingsValues;
    freeSlots: number;
    actions?: ReactNode;
}) {
    return (
        <div className={bar}>
            <nav aria-label="Woche wechseln" className={nav}>
                <Link
                    href={`/plan?week=${data.prevParam}`}
                    className={iconButton()}
                    aria-label="Vorherige Woche"
                >
                    <ChevronLeft size={18} />
                </Link>
                <div className={titleBox}>
                    <h1 className={title}>KW {data.weekNumber}</h1>
                    <p className={range}>
                        {data.rangeLabel}
                        {freeSlots > 0 && (
                            <span className={freeHint}>
                                {' '}
                                · {freeSlots} {freeSlots === 1 ? 'Platz' : 'Plätze'} frei
                            </span>
                        )}
                    </p>
                </div>
                <Link
                    href={`/plan?week=${data.nextParam}`}
                    className={iconButton()}
                    aria-label="Nächste Woche"
                >
                    <ChevronRight size={18} />
                </Link>
            </nav>
            {!data.isCurrentWeek && (
                <Link
                    href={`/plan?week=${data.todayParam}`}
                    className={button({ variant: 'ghost' })}
                >
                    Heute
                </Link>
            )}
            <div className={spacer} />
            {actions}
            <WeekTools data={data} />
            <WeekSettingsDialog data={data} settings={settings} />
        </div>
    );
}
