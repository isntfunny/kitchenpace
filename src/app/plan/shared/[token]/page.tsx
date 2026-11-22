import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PageShell } from '@app/components/layouts/PageShell';
import { ImportSharedWeek } from '@app/components/meal-plan/ImportSharedWeek';
import { SharedWeekView } from '@app/components/meal-plan/SharedWeekView';
import { getServerAuthSession } from '@app/lib/auth';
import { getMealPlanSettings } from '@app/lib/meal-plan/repository';
import { getSharedMealPlanWeek } from '@app/lib/meal-plan/share';
import { slotLabel } from '@app/lib/meal-plan/slots';
import { weekNumber, weekRangeLabel } from '@app/lib/meal-plan/view';
import { weekStartFor } from '@app/lib/meal-plan/week';
import { addDays, todayIn } from '@shared/dates';
import { prisma } from '@shared/prisma';

import { css } from 'styled-system/css';

// Read-only shared week (KUC-110): no login, never indexed, gone after revoking.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Geteilter Wochenplan',
    robots: { index: false, follow: false, nocache: true },
    referrer: 'same-origin',
};

type SharedPlanPageProps = { params: Promise<{ token: string }> };

export default async function SharedPlanPage({ params }: SharedPlanPageProps) {
    const { token } = await params;
    const week = await getSharedMealPlanWeek(prisma, token);
    if (!week) notFound();

    const session = await getServerAuthSession('plan-shared');
    const viewerId = session?.user?.id;
    let targets: string[] = [];
    let slotLabels: Record<string, string> = {};
    if (viewerId) {
        const settings = await getMealPlanSettings(prisma, viewerId);
        const start = weekStartFor(todayIn(settings.timezone), settings.weekStartDay);
        targets = [start, addDays(start, 7)];
        slotLabels = Object.fromEntries(settings.slots.map((slot) => [slot.key, slotLabel(slot)]));
    }

    return (
        <PageShell>
            <div
                className={css({
                    maxW: '1400px',
                    mx: 'auto',
                    py: { base: '4', md: '6' },
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5',
                })}
            >
                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: '3',
                        flexWrap: 'wrap',
                    })}
                >
                    <div className={css({ flex: 1, minW: '220px' })}>
                        <p
                            className={css({
                                fontSize: 'xs',
                                fontWeight: '700',
                                color: 'primary',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                            })}
                        >
                            Geteilter Wochenplan
                        </p>
                        <h1
                            className={css({
                                fontFamily: 'heading',
                                fontSize: { base: '2xl', md: '3xl' },
                                fontWeight: '700',
                                lineHeight: '1.1',
                            })}
                        >
                            KW {weekNumber(week.startDate)}
                        </h1>
                        <p className={css({ fontSize: 'sm', color: 'foreground.muted' })}>
                            {weekRangeLabel(week.startDate)} · nur zum Ansehen
                        </p>
                    </div>
                    {week.entries.length > 0 && (
                        <ImportSharedWeek
                            token={token}
                            signedIn={!!viewerId}
                            targets={targets}
                            slotLabels={slotLabels}
                        />
                    )}
                </div>
                <SharedWeekView week={week} />
            </div>
        </PageShell>
    );
}
