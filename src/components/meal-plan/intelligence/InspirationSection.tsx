import { getInspirationItems } from '@app/lib/meal-plan/intelligence/inspiration';

import { InspirationStrip } from './InspirationStrip';

/** Server component: loads (cached per user and week) and renders the strip; failures show nothing. */
export async function InspirationSection({ userId, today }: { userId: string; today: string }) {
    const items = await getInspirationItems(userId, today).catch((error) => {
        console.error('[plan] inspiration failed', error);
        return [];
    });
    return <InspirationStrip items={items} />;
}
