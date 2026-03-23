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
