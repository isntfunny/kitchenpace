import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';

import { PageShell } from '@app/components/layouts/PageShell';
import { InspirationSection } from '@app/components/meal-plan/intelligence/InspirationSection';
import { IntelligentWeekView } from '@app/components/meal-plan/intelligence/IntelligentWeekView';
import { LeftoverSection } from '@app/components/meal-plan/intelligence/LeftoverSection';
import type { PlanSlot, PlanWeekData } from '@app/components/meal-plan/types';
import { getServerAuthSession } from '@app/lib/auth';
import { getFreshnessMarkers } from '@app/lib/meal-plan/intelligence/week-planner';
import { getMealPlanSettings, getMealPlanWeek } from '@app/lib/meal-plan/repository';
import { slotLabel, visibleSlots, type SlotConfig } from '@app/lib/meal-plan/slots';
import { resolveWeekStart, weekNumber, weekParam, weekRangeLabel } from '@app/lib/meal-plan/view';
import { addDays, formatIsoDate, todayIn, weekStartFor } from '@app/lib/meal-plan/week';
import { prisma } from '@shared/prisma';

import { css } from 'styled-system/css';

export const metadata: Metadata = {
    title: 'Wochenplan',
    robots: { index: false, follow: false },
};

type PlanPageProps = { searchParams: Promise<{ week?: string | string[] }> };

const toPlanSlot = (slot: SlotConfig): PlanSlot => ({
    key: slot.key,
    name: slot.name,
    label: slotLabel(slot),
    time: slot.time,
    enabled: slot.enabled,
});

export default async function PlanPage({ searchParams }: PlanPageProps) {
    const { week } = await searchParams;
    const session = await getServerAuthSession('plan');
    if (!session?.user?.id) {
        const query = typeof week === 'string' ? `?week=${encodeURIComponent(week)}` : '';
        redirect(`/auth/signin?callbackUrl=${encodeURIComponent(`/plan${query}`)}`);
    }
    if (Array.isArray(week)) notFound();
    const userId = session.user.id;

    // Week start and today depend on the user's settings; read them first
    const settings = await getMealPlanSettings(prisma, userId);
    const today = todayIn(settings.timezone);
    const startDate = resolveWeekStart(week, settings.weekStartDay, today);
    if (!startDate) notFound();

    // Freshness markers (KUC-96) load next to the week; a failure only drops the markers
    const [view, markers] = await Promise.all([
        getMealPlanWeek(prisma, userId, startDate),
        getFreshnessMarkers(prisma, userId, startDate).catch((error) => {
            console.error('[plan] freshness markers failed', error);
            return {};
        }),
    ]);
    const used = new Set(view.entries.map((entry) => entry.slot));
    const leftoverDates = new Map(
        view.entries.map((entry) => [entry.id, formatIsoDate(entry.date)]),
    );

    const data: PlanWeekData = {
        startDate,
        days: view.days,
        today,
        weekNumber: weekNumber(startDate),
        rangeLabel: weekRangeLabel(startDate),
        prevParam: weekParam(addDays(startDate, -7)),
        nextParam: weekParam(addDays(startDate, 7)),
        todayParam: weekParam(weekStartFor(today, settings.weekStartDay)),
        isCurrentWeek: view.days.includes(today),
        slots: visibleSlots(view.slots, used).map(toPlanSlot),
        allSlots: view.slots.map(toPlanSlot),
        hasWeekOverride: view.hasWeekOverride,
        householdSize: settings.householdSize,
        display: {
            showTime: settings.mealPlanShowTime,
            showServings: settings.mealPlanShowServings,
            showCalories: settings.mealPlanShowCalories,
        },
        dishes: view.entries.map((entry) => ({
            id: entry.id,
            recipeId: entry.recipeId,
            date: formatIsoDate(entry.date),
            slot: entry.slot,
            position: entry.position,
            time: entry.time,
            servings: entry.servings,
            status: entry.status,
            // Leftover of an entry outside this week shows no day
            leftoverOfDate: entry.leftoverOfId
                ? (leftoverDates.get(entry.leftoverOfId) ?? null)
                : null,
            recipeAvailable: entry.recipeAvailable,
            recipe: {
                slug: entry.recipe.slug,
                title: entry.recipe.title,
                imageKey: entry.recipe.imageKey,
                totalTime: entry.recipe.totalTime,
                caloriesPerServing: entry.recipe.caloriesPerServing,
                nutritionCompleteness: entry.recipe.nutritionCompleteness,
            },
        })),
    };

    return (
        <PageShell>
            <div className={css({ maxW: '1400px', mx: 'auto', py: { base: '4', md: '6' } })}>
                <IntelligentWeekView
                    data={data}
                    markers={markers}
                    inspiration={
                        <Suspense fallback={null}>
                            <InspirationSection userId={userId} today={today} />
                        </Suspense>
                    }
                    notices={
                        <Suspense fallback={null}>
                            <LeftoverSection
                                userId={userId}
                                today={today}
                                householdSize={settings.householdSize ?? 2}
                            />
                        </Suspense>
                    }
                    settings={{
                        householdSize: settings.householdSize,
                        weekStartDay: settings.weekStartDay,
                        shoppingDay: settings.shoppingDay,
                        timezone: settings.timezone,
                        mealPlanShowTime: settings.mealPlanShowTime,
                        mealPlanShowServings: settings.mealPlanShowServings,
                        mealPlanShowCalories: settings.mealPlanShowCalories,
                        slots: settings.slots,
                    }}
                />
            </div>
        </PageShell>
    );
}
