import { getLeftoverNotices } from '@app/lib/meal-plan/intelligence/leftover-notices.server';
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
    const notices = await getLeftoverNotices(prisma, userId, { today, householdSize }).catch(
        (error) => {
            console.error('[plan] leftover hints failed', error);
            return [];
        },
    );
    return <LeftoverNotices notices={notices} />;
}
