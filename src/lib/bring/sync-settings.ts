// State and switches of the Bring! sync (KUC-106), shared by the list page and the settings.
// No Bring! calls here; verifying the chosen list happens in `service.enableSync`.
import type { Db } from '@app/lib/meal-plan/db';

export type BringSyncStatusName = 'IDLE' | 'OK' | 'ERROR' | 'AUTH_FAILED';

export interface BringSyncState {
    connected: boolean;
    enabled: boolean;
    listUuid: string | null;
    status: BringSyncStatusName;
    /** ISO time of the last successful sync */
    lastSyncAt: string | null;
    /** User-facing text of the last failure */
    error: string | null;
}

export const NO_BRING_SYNC: BringSyncState = {
    connected: false,
    enabled: false,
    listUuid: null,
    status: 'IDLE',
    lastSyncAt: null,
    error: null,
};

export async function loadBringSyncState(db: Db, userId: string): Promise<BringSyncState> {
    const connection = await db.bringConnection.findUnique({
        where: { userId },
        select: {
            syncEnabled: true,
            syncListUuid: true,
            syncStatus: true,
            lastSyncAt: true,
            lastSyncError: true,
        },
    });
    if (!connection) return NO_BRING_SYNC;
    return {
        connected: true,
        enabled: connection.syncEnabled,
        listUuid: connection.syncListUuid,
        status: connection.syncStatus,
        lastSyncAt: connection.lastSyncAt?.toISOString() ?? null,
        error: connection.lastSyncError,
    };
}

/** Forgets what was synced: items lose their Bring! link, the connection its base. */
export async function resetSyncData(db: Db, userId: string) {
    await db.shoppingItem.updateMany({
        where: { shoppingList: { userId } },
        data: { bringName: null, bringSpec: null, bringSyncHash: null, bringSyncedAt: null },
    });
}

export async function disableBringSync(db: Db, userId: string) {
    await db.bringConnection.updateMany({
        where: { userId },
        data: {
            syncEnabled: false,
            syncStatus: 'IDLE',
            syncSnapshot: {},
            lastSyncError: null,
            syncErrorCount: 0,
        },
    });
    await resetSyncData(db, userId);
}
