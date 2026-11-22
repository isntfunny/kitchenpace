// Two-way sync of one user's KochTakt list with a Bring! list (KUC-106).
//
// `syncConnection` reads both sides, lets `planSync` decide (checking off wins, otherwise
// the newest change), applies the writes and stores the new common base on the connection.
// It runs in the worker, so nothing here may import 'server-only'. Bring! and the catalog
// are injected: unit tests pass fakes, nothing talks to the real service.
import type { Prisma } from '@prisma/client';

import type { Db } from '@app/lib/meal-plan/db';
import {
    addShoppingItems,
    deleteShoppingItem,
    setShoppingItemStatus,
} from '@app/lib/shopping/repository';

import { BringError } from './client';
import { decryptCredentials } from './crypto';
import { resolveCatalogItem, type CatalogEntry } from './items';
import {
    entryHash,
    planSync,
    type LocalEntry,
    type LocalOp,
    type Snapshot,
    type SyncPlan,
} from './sync-plan';
import { parseSpec, specFromItem } from './sync-spec';
import { requireList } from './transfer';
import type { BringCredentials, BringItems, BringList, BringOperation } from './types';

export interface BringSyncClient {
    lists(): Promise<BringList[]>;
    items(listUuid: string): Promise<BringItems>;
    write(
        listUuid: string,
        operation: BringOperation,
        name: string,
        specification: string,
    ): Promise<void>;
}

export interface SyncDeps {
    login: (credentials: BringCredentials) => Promise<BringSyncClient>;
    loadCatalog: () => Promise<CatalogEntry[]>;
    /** Exact (case-insensitive) ingredient by name, so Bring! items merge with recipe items */
    findIngredientId: (name: string) => Promise<string | null>;
    now?: () => Date;
    dryRun?: boolean;
}

export type SyncOutcome = 'ok' | 'partial' | 'skipped' | 'error' | 'auth-failed';

export interface SyncReport {
    userId: string;
    outcome: SyncOutcome;
    dryRun: boolean;
    pushed: number;
    pulled: number;
    conflicts: number;
    unchanged: number;
    failed: number;
    message?: string;
}

/** Consecutive login failures before the sync stops and the user is asked to reconnect */
export const AUTH_FAILURE_LIMIT = 3;
const BACKOFF_BASE_MS = 5 * 60_000;
const BACKOFF_MAX_MS = 6 * 3_600_000;

/** Wait after `errorCount` consecutive failures: 5, 10, 20 … minutes, at most 6 hours. */
export function backoffMs(errorCount: number): number {
    if (errorCount <= 0) return 0;
    return Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** (errorCount - 1));
}

/** Whether the background job should sync this connection now. */
export function isDueForSync(
    connection: {
        syncEnabled: boolean;
        syncStatus: string;
        syncErrorCount: number;
        updatedAt: Date;
    },
    now: Date,
): boolean {
    if (!connection.syncEnabled || connection.syncStatus === 'AUTH_FAILED') return false;
    return now.getTime() - connection.updatedAt.getTime() >= backoffMs(connection.syncErrorCount);
}

const STATE_OF = { OPEN: 'open', PURCHASED: 'done', DORMANT: 'none' } as const;

function report(userId: string, dryRun: boolean, patch: Partial<SyncReport>): SyncReport {
    return {
        userId,
        outcome: 'ok',
        dryRun,
        pushed: 0,
        pulled: 0,
        conflicts: 0,
        unchanged: 0,
        failed: 0,
        ...patch,
    };
}

function errorText(error: unknown): string {
    if (error instanceof BringError) return error.message;
    return 'Der Abgleich mit Bring! ist fehlgeschlagen.';
}

async function recordFailure(db: Db, userId: string, error: unknown, authFailures: number) {
    const authError = error instanceof BringError && error.code === 'AUTH';
    const current = await db.bringConnection.findUnique({
        where: { userId },
        select: { syncErrorCount: true },
    });
    const count = (current?.syncErrorCount ?? 0) + 1;
    const authFailed = authError && count >= authFailures;
    await db.bringConnection.update({
        where: { userId },
        data: {
            syncStatus: authFailed ? 'AUTH_FAILED' : 'ERROR',
            lastSyncError: errorText(error),
            syncErrorCount: count,
        },
    });
    return authFailed;
}

async function loadLocal(db: Db, userId: string): Promise<LocalEntry[]> {
    const items = await db.shoppingItem.findMany({
        where: { shoppingList: { userId } },
        select: {
            id: true,
            name: true,
            status: true,
            quantity: true,
            baseUnit: true,
            displayUnit: true,
            quantityText: true,
            note: true,
            bringName: true,
            bringSyncHash: true,
            updatedAt: true,
        },
    });
    return items.map((item) => ({
        id: item.id,
        name: item.name,
        bringName: item.bringName,
        state: STATE_OF[item.status as keyof typeof STATE_OF],
        spec: specFromItem(item),
        syncedHash: item.bringSyncHash,
        updatedAt: item.updatedAt,
    }));
}

function quantityData(spec: string | undefined) {
    const parsed = parseSpec(spec);
    return {
        quantity: parsed.quantity,
        baseUnit: parsed.baseUnit,
        displayUnit: parsed.displayUnit,
        quantityText: parsed.quantityText,
        note: parsed.note,
    };
}

/** Applies one local operation; returns the id of the item it created or changed. */
async function applyLocal(
    db: Db,
    userId: string,
    op: LocalOp,
    deps: SyncDeps,
    at: Date,
): Promise<string | null> {
    if (op.type === 'delete') {
        await deleteShoppingItem(db, userId, op.itemId);
        return null;
    }
    let itemId: string;
    if (op.type === 'create') {
        const ingredientId = await deps.findIngredientId(op.name);
        const [created] = await addShoppingItems(db, userId, [
            { name: op.name, ingredientId, kind: 'BRING' },
        ]);
        itemId = created.id;
    } else {
        itemId = op.itemId;
        const item = await db.shoppingItem.findFirst({
            where: { id: itemId, shoppingList: { userId } },
            select: { name: true, ingredientId: true, status: true },
        });
        if (!item) return null;
        if (op.state === 'open' && item.status !== 'OPEN')
            // Needed again: same path as adding it, so sources and history stay consistent
            await addShoppingItems(db, userId, [
                { name: item.name, ingredientId: item.ingredientId, kind: 'BRING' },
            ]);
    }
    if (op.spec !== undefined)
        await db.shoppingItem.update({ where: { id: itemId }, data: quantityData(op.spec) });
    if (op.state === 'done')
        // Bought on Bring!: history origin BRING, pantry booking happens in the same call
        await setShoppingItemStatus(db, userId, itemId, {
            status: 'PURCHASED',
            origin: 'BRING',
            at,
        });
    return itemId;
}

async function applyRemote(
    client: BringSyncClient,
    listUuid: string,
    plan: SyncPlan,
    failed: Set<string>,
): Promise<number> {
    let done = 0;
    for (const op of plan.remote) {
        try {
            await client.write(listUuid, op.op, op.name, op.spec);
            done += 1;
        } catch (error) {
            // No connection or login: stop here, the whole run counts as failed
            if (
                error instanceof BringError &&
                (error.code === 'AUTH' || error.code === 'UNAVAILABLE')
            )
                throw error;
            failed.add(op.name);
        }
    }
    return done;
}

export async function syncConnection(db: Db, userId: string, deps: SyncDeps): Promise<SyncReport> {
    const dryRun = deps.dryRun === true;
    const now = (deps.now ?? (() => new Date()))();
    const connection = await db.bringConnection.findUnique({ where: { userId } });
    if (!connection || !connection.syncEnabled || !connection.syncListUuid)
        return report(userId, dryRun, { outcome: 'skipped', message: 'Sync ist nicht aktiv.' });
    if (connection.syncStatus === 'AUTH_FAILED')
        return report(userId, dryRun, {
            outcome: 'auth-failed',
            message: 'Bring! muss neu verbunden werden.',
        });
    const listUuid = connection.syncListUuid;

    try {
        const client = await deps.login(decryptCredentials(userId, connection.credentials));
        requireList(await client.lists(), listUuid);
        const [remoteItems, catalog, local] = await Promise.all([
            client.items(listUuid),
            deps.loadCatalog(),
            loadLocal(db, userId),
        ]);
        const labels = new Map(catalog.map((entry) => [entry.itemId, entry.name]));
        const toRemote = (items: BringItems['purchase']) =>
            items.map((item) => ({
                name: item.name,
                displayName: labels.get(item.name) ?? item.name,
                spec: item.specification.trim(),
            }));

        const lastSync = connection.lastSyncAt;
        const plan = planSync({
            local,
            remote: {
                purchase: toRemote(remoteItems.purchase),
                recently: toRemote(remoteItems.recently),
            },
            snapshot: (connection.syncSnapshot as Snapshot | null) ?? null,
            // Bring! sends no change times: assume the middle of the window since the last sync
            remoteChangedAt: lastSync
                ? new Date((lastSync.getTime() + now.getTime()) / 2)
                : new Date(0),
            resolveName: (name) => resolveCatalogItem(name, catalog),
        });
        const summary = {
            pushed: plan.remote.length,
            pulled: plan.local.length,
            conflicts: plan.conflicts.length,
            unchanged: plan.unchanged,
        };
        if (dryRun) return report(userId, true, summary);

        const failed = new Set<string>();
        const pushed = await applyRemote(client, listUuid, plan, failed);

        const itemIdByName = new Map<string, string>();
        let pulled = 0;
        for (const op of plan.local) {
            try {
                const id = await applyLocal(db, userId, op, deps, now);
                if (id) itemIdByName.set(op.bringName, id);
                pulled += 1;
            } catch {
                failed.add(op.bringName);
            }
        }

        // Link the items and remember what both sides agreed on
        const localOpNames = new Set(plan.local.map((op) => op.bringName));
        const byId = new Map(local.map((entry) => [entry.id, entry]));
        for (const touched of plan.touched) {
            if (failed.has(touched.bringName)) continue;
            const itemId = touched.itemId ?? itemIdByName.get(touched.bringName);
            if (!itemId) continue;
            let spec: string;
            let state: 'open' | 'done' | 'none';
            const planned = byId.get(itemId);
            if (planned && !localOpNames.has(touched.bringName)) {
                // Untouched locally: the state that was planned from, so a change made
                // while the sync ran is still seen as new next time
                spec = planned.spec;
                state = planned.state;
            } else {
                const fresh = await db.shoppingItem.findFirst({
                    where: { id: itemId, shoppingList: { userId } },
                    select: {
                        status: true,
                        quantity: true,
                        baseUnit: true,
                        displayUnit: true,
                        quantityText: true,
                        note: true,
                    },
                });
                if (!fresh) continue;
                spec = specFromItem(fresh);
                state = STATE_OF[fresh.status as keyof typeof STATE_OF];
            }
            await db.shoppingItem.update({
                where: { id: itemId },
                data: {
                    bringName: touched.bringName,
                    bringSpec: touched.spec || null,
                    bringSyncHash: entryHash(touched.bringName, spec, state),
                    bringSyncedAt: now,
                },
            });
        }

        for (const conflict of plan.conflicts) {
            if (failed.has(conflict.bringName)) continue;
            await db.bringSyncConflict.create({
                data: {
                    userId,
                    shoppingItemId: conflict.itemId ?? itemIdByName.get(conflict.bringName) ?? null,
                    field: conflict.field,
                    localValue: conflict.localValue,
                    remoteValue: conflict.remoteValue,
                    resolution: conflict.resolution,
                },
            });
        }

        // Failed names keep their old base, so the next run tries them again
        const snapshot: Snapshot = { ...plan.snapshot };
        const previous = (connection.syncSnapshot as Snapshot | null) ?? {};
        for (const name of failed) {
            if (previous[name]) snapshot[name] = previous[name];
            else delete snapshot[name];
        }
        const partial = failed.size > 0;
        await db.bringConnection.update({
            where: { userId },
            data: {
                syncSnapshot: snapshot as unknown as Prisma.InputJsonValue,
                lastSyncAt: now,
                syncStatus: partial ? 'ERROR' : 'OK',
                lastSyncError: partial
                    ? `${failed.size} Artikel konnten nicht abgeglichen werden.`
                    : null,
                syncErrorCount: partial ? connection.syncErrorCount + 1 : 0,
            },
        });
        return report(userId, false, {
            ...summary,
            pushed,
            pulled,
            failed: failed.size,
            outcome: partial ? 'partial' : 'ok',
            message: partial ? `${failed.size} Artikel nicht abgeglichen` : undefined,
        });
    } catch (error) {
        if (dryRun) return report(userId, true, { outcome: 'error', message: errorText(error) });
        const authFailed = await recordFailure(db, userId, error, AUTH_FAILURE_LIMIT);
        return report(userId, false, {
            outcome: authFailed ? 'auth-failed' : 'error',
            message: errorText(error),
        });
    }
}
