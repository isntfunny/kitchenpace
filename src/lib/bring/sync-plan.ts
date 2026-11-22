// Pure three-way merge of the KochTakt list with a Bring! list (KUC-106).
//
// Inputs: the local items, the remote lists, and `snapshot` = what Bring! looked like after
// the last successful sync (the common base). No I/O here; `sync.ts` applies the plan.
//
// Rules (decision 21.11.):
// - Checking off wins: if either side marked an item as bought, it is bought.
// - Amount/note: the more recent change wins. Bring! sends no timestamps, so the time of a
//   remote change is estimated by the caller (`remoteChangedAt`).
// - A removal on one side is carried over unless the other side changed the item since.
// - Every real conflict (both sides changed differently) is returned in `conflicts`.
import { createHash } from 'node:crypto';

export type SideState = 'open' | 'done' | 'none';

export interface LocalEntry {
    id: string;
    /** KochTakt name, used to pick the Bring! name of an item not linked yet */
    name: string;
    /** Name on Bring! once linked */
    bringName: string | null;
    state: SideState;
    spec: string;
    /** `entryHash` stored at the last sync (null = never synced) */
    syncedHash: string | null;
    updatedAt: Date;
}

export interface RemoteEntry {
    name: string;
    /** Localised label for items created from Bring! */
    displayName?: string;
    spec: string;
}

export interface RemoteLists {
    purchase: RemoteEntry[];
    recently: RemoteEntry[];
}

export type Snapshot = Record<string, { state: 'open' | 'done'; spec: string }>;

export type RemoteOp = { op: 'add' | 'complete' | 'remove'; name: string; spec: string };

export type LocalOp =
    | { type: 'create'; name: string; bringName: string; spec: string; state: 'open' | 'done' }
    | { type: 'apply'; itemId: string; bringName: string; spec?: string; state?: 'open' | 'done' }
    | { type: 'delete'; itemId: string; bringName: string };

export interface PlannedConflict {
    itemId: string | null;
    bringName: string;
    field: 'status' | 'spec';
    localValue: string;
    remoteValue: string;
    resolution: 'checked-off' | 'kept' | 'local' | 'remote';
}

export interface SyncPlan {
    remote: RemoteOp[];
    local: LocalOp[];
    conflicts: PlannedConflict[];
    /** Items to link/mark as synced after the operations succeeded */
    touched: Array<{ itemId: string | null; bringName: string; spec: string }>;
    snapshot: Snapshot;
    unchanged: number;
}

export function entryHash(bringName: string, spec: string, state: SideState): string {
    return createHash('sha256')
        .update(JSON.stringify([bringName, spec, state]))
        .digest('hex');
}

export interface PlanInput {
    local: LocalEntry[];
    remote: RemoteLists;
    snapshot: Snapshot | null;
    /** Estimated time of a remote change (Bring! has no timestamps) */
    remoteChangedAt: Date;
    /** Maps a KochTakt name to the name used on Bring! (catalog id or the trimmed name) */
    resolveName: (name: string) => string;
}

export function planSync(input: PlanInput): SyncPlan {
    const base = input.snapshot ?? {};
    const plan: SyncPlan = {
        remote: [],
        local: [],
        conflicts: [],
        touched: [],
        snapshot: {},
        unchanged: 0,
    };

    // Local entries by Bring! name. Unlinked purchased/dormant items are not synced. When two
    // items resolve to one name, a linked one beats an unlinked one, otherwise the first wins.
    const localByName = new Map<string, LocalEntry>();
    for (const entry of input.local) {
        const linked = entry.bringName !== null;
        if (!linked && entry.state !== 'open') continue;
        const name = entry.bringName ?? input.resolveName(entry.name);
        const claimed = localByName.get(name);
        if (!claimed || (linked && claimed.bringName === null)) localByName.set(name, entry);
    }

    const remoteByName = new Map<string, { state: 'open' | 'done'; entry: RemoteEntry }>();
    for (const entry of input.remote.recently)
        remoteByName.set(entry.name, { state: 'done', entry });
    for (const entry of input.remote.purchase)
        remoteByName.set(entry.name, { state: 'open', entry });

    const names = new Set([...localByName.keys(), ...remoteByName.keys(), ...Object.keys(base)]);

    for (const name of names) {
        const opsBefore = plan.remote.length + plan.local.length;
        const local = localByName.get(name);
        const remoteEntry = remoteByName.get(name);
        const before: Snapshot[string] | undefined = base[name];

        const L = (local?.state ?? 'none') as SideState;
        const rawR = (remoteEntry?.state ?? 'none') as SideState;
        const B = (before?.state ?? 'none') as SideState;
        // Bring! prunes its "recently" list and keeps items there that were never on our
        // list: a missing done item is no removal, a done item without base is no news
        const R: SideState =
            B === 'done' && rawR === 'none'
                ? 'done'
                : B === 'none' && rawR === 'done'
                  ? 'none'
                  : rawR;

        const lSpec = local?.spec ?? '';
        const rSpec = remoteEntry?.entry.spec ?? '';
        const itemId = local?.id ?? null;
        const lChanged = L !== B;
        const rChanged = R !== B;
        const conflict = (
            field: PlannedConflict['field'],
            localValue: string,
            remoteValue: string,
            resolution: PlannedConflict['resolution'],
        ) =>
            plan.conflicts.push({
                itemId,
                bringName: name,
                field,
                localValue,
                remoteValue,
                resolution,
            });

        let target: SideState = B;
        if (lChanged && !rChanged) target = L;
        else if (!lChanged && rChanged) target = R;
        else if (lChanged && rChanged) {
            if (L === R) target = L;
            else if (L === 'done' || R === 'done') {
                target = 'done';
                conflict('status', L, R, 'checked-off');
            } else {
                target = 'open';
                conflict('status', L, R, 'kept');
            }
        }

        if (target === 'none') {
            // A removal reaches the side that still has the item
            if (R === 'open') plan.remote.push({ op: 'remove', name, spec: '' });
            if (local && L !== 'none')
                plan.local.push({ type: 'delete', itemId: local.id, bringName: name });
            continue;
        }

        // Amount/note as it stands on Bring! once the plan is applied
        let remoteSpec = rSpec;

        if (target === 'open' && L === 'open' && R === 'open') {
            // Both sides hold it: merge amount and note
            const lSpecChanged =
                local!.syncedHash === null
                    ? lSpec !== ''
                    : entryHash(name, lSpec, 'open') !== local!.syncedHash;
            const rSpecChanged = before ? rSpec !== before.spec : rSpec !== '';
            const preferLocal = () => {
                remoteSpec = lSpec;
                plan.remote.push({ op: 'add', name, spec: lSpec });
            };
            const preferRemote = () =>
                plan.local.push({ type: 'apply', itemId: local!.id, bringName: name, spec: rSpec });
            if (lSpec !== rSpec) {
                if (lSpecChanged && !rSpecChanged) preferLocal();
                else if (!lSpecChanged && rSpecChanged) preferRemote();
                else if (lSpecChanged && rSpecChanged) {
                    const remoteNewer =
                        input.remoteChangedAt.getTime() > local!.updatedAt.getTime();
                    conflict('spec', lSpec, rSpec, remoteNewer ? 'remote' : 'local');
                    if (remoteNewer) preferRemote();
                    else preferLocal();
                }
                // Neither changed: only the notation differs, leave both as they are
            }
        } else if (target === 'open') {
            if (L !== 'open' && R === 'open') {
                // Remote has it (new, or re-added): create or reopen locally
                if (local)
                    plan.local.push({
                        type: 'apply',
                        itemId: local.id,
                        bringName: name,
                        spec: rSpec,
                        state: 'open',
                    });
                else
                    plan.local.push({
                        type: 'create',
                        name: remoteEntry!.entry.displayName ?? name,
                        bringName: name,
                        spec: rSpec,
                        state: 'open',
                    });
            } else if (L === 'open') {
                remoteSpec = lSpec;
                plan.remote.push({ op: 'add', name, spec: lSpec });
            }
        } else if (L === 'done' && R !== 'done') {
            // Bought here: tick it off on Bring! (nothing to do if it is gone there)
            if (R === 'open') plan.remote.push({ op: 'complete', name, spec: lSpec });
            remoteSpec = lSpec || rSpec;
        } else if (R === 'done' && L !== 'done') {
            // Bought on Bring!: bought here, too
            if (local)
                plan.local.push({
                    type: 'apply',
                    itemId: local.id,
                    bringName: name,
                    state: 'done',
                });
            else
                plan.local.push({
                    type: 'create',
                    name: remoteEntry!.entry.displayName ?? name,
                    bringName: name,
                    spec: rSpec,
                    state: 'done',
                });
        }

        plan.snapshot[name] = { state: target, spec: remoteSpec };
        plan.touched.push({ itemId, bringName: name, spec: remoteSpec });
        if (plan.remote.length + plan.local.length === opsBefore) plan.unchanged += 1;
    }

    return plan;
}
