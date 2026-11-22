// Starts a Bring! sync after local list changes and when the list page opens (KUC-106).
// Never throws: a missing queue or Bring! must not break the KochTakt list.
import type { Db } from '@app/lib/meal-plan/db';
import { addBringSyncJob } from '@worker/queues/index';

const STALE_MS = 60_000;

/** @param onlyIfStale page opens skip the sync when the last one just ran */
export async function requestBringSync(
    db: Db,
    userId: string,
    options: { onlyIfStale?: boolean; delayMs?: number } = {},
): Promise<boolean> {
    try {
        const connection = await db.bringConnection.findUnique({
            where: { userId },
            select: { syncEnabled: true, syncStatus: true, lastSyncAt: true },
        });
        if (!connection?.syncEnabled || connection.syncStatus === 'AUTH_FAILED') return false;
        if (
            options.onlyIfStale &&
            connection.lastSyncAt &&
            Date.now() - connection.lastSyncAt.getTime() < STALE_MS
        )
            return false;
        await addBringSyncJob(userId, options.delayMs);
        return true;
    } catch (error) {
        console.error('[BringSync] could not queue a sync', error);
        return false;
    }
}
