import { loadTimeSeasonSets } from '@app/lib/meal-plan/intelligence/sets';
import { getLeftoverNotices } from '@app/lib/meal-plan/intelligence/week-planner';
import { prisma } from '@shared/prisma';

import { LeftoverNotices } from './LeftoverNotices';

/** Server component: leftover hints for the plan page; failures show nothing. */
export async function LeftoverSection({
    userId,
    today,
    householdSize,
}: {
    userId: string;
    today: string;
    householdSize: number;
}) {
    const notices = await loadTimeSeasonSets()
        .then((sets) => getLeftoverNotices(prisma, userId, sets, { today, householdSize }))
        .catch((error) => {
            console.error('[plan] leftover hints failed', error);
            return [];
        });
    return <LeftoverNotices notices={notices} />;
}
