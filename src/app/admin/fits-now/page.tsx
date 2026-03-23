import { Target } from 'lucide-react';

import { ensureModeratorSession } from '@app/lib/admin/ensure-moderator';
import { getFoodPeriodFilterSets, getTimeSeasonFilterSets } from '@app/lib/fits-now/db-queries';
import { prisma } from '@shared/prisma';

import { css } from 'styled-system/css';

import { PeriodsList } from './periods-list';
import { TimeSeasonGrid } from './time-season-grid';

export const dynamic = 'force-dynamic';

async function loadData() {
    const [timeSeason, foodPeriod, allCategories] = await Promise.all([
        getTimeSeasonFilterSets(),
        getFoodPeriodFilterSets(),
        prisma.category.findMany({
            select: { id: true, name: true, slug: true, color: true },
            orderBy: { sortOrder: 'asc' },
        }),
    ]);

    return { timeSeason, foodPeriod, allCategories };
}

export default async function FitsNowPage() {
    await ensureModeratorSession('fits-now');
    const { timeSeason, foodPeriod, allCategories } = await loadData();

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '6' })}>
            {/* Header */}
            <header
                className={css({
                    borderRadius: '2xl',
                    borderWidth: '1px',
                    borderColor: 'border.muted',
                    background: 'surface',
                    padding: { base: '4', md: '6' },
                    display: 'flex',
                    flexDirection: { base: 'column', md: 'row' },
                    alignItems: { md: 'flex-start' },
                    gap: '4',
                })}
            >
                <div
                    className={css({
                        padding: '2.5',
                        borderRadius: 'lg',
                        background: 'surface.elevated',
                        borderWidth: '1px',
                        borderColor: 'border',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                    })}
                >
                    <Target size={22} />
                </div>
                <div>
                    <p
                        className={css({
                            fontSize: 'xs',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5em',
                            color: 'foreground.muted',
                            marginBottom: '1',
                        })}
                    >
                        Admin &middot; Startseite
                    </p>
                    <h1
                        className={css({
                            fontSize: { base: '2xl', md: '3xl' },
                            fontWeight: 'semibold',
                            color: 'foreground',
                        })}
                    >
                        Passt zu jetzt
                    </h1>
                    <p
                        className={css({
                            marginTop: '2',
                            color: 'foreground.muted',
                            maxWidth: '3xl',
                        })}
                    >
                        Konfiguriere was Nutzer je nach Tageszeit und Saison sehen.
                    </p>
                </div>
            </header>

            {/* Time x Season Grid */}
            <section className={css({ display: 'flex', flexDirection: 'column', gap: '4' })}>
                <h2
                    className={css({
                        fontSize: 'xl',
                        fontWeight: 'semibold',
                        color: 'foreground',
                    })}
                >
                    Zeit &times; Saison Zuordnungen
                </h2>
                <TimeSeasonGrid filterSets={timeSeason} allCategories={allCategories} />
            </section>

            {/* Food Periods */}
            <section className={css({ display: 'flex', flexDirection: 'column', gap: '4' })}>
                <h2
                    className={css({
                        fontSize: 'xl',
                        fontWeight: 'semibold',
                        color: 'foreground',
                    })}
                >
                    Kulinarische Perioden
                </h2>
                <PeriodsList filterSets={foodPeriod} allCategories={allCategories} />
            </section>
        </div>
    );
}
