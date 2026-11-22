import type { DesiredReminder, ExistingReminder } from './types';

const keyOf = (item: { kind: string; date: string; slotKey: string }) =>
    `${item.kind}|${item.date}|${item.slotKey}`;

export interface ReminderDiff {
    /** No row yet */
    create: DesiredReminder[];
    /** Row exists but time or content changed; the old job must be removed */
    reschedule: { existing: ExistingReminder; desired: DesiredReminder }[];
    /** Scheduled rows that are unchanged; their job is re-ensured (idempotent) in case it got lost */
    keep: { existing: ExistingReminder; desired: DesiredReminder }[];
    /** Scheduled rows that are no longer wanted (entry moved, deleted, cooked, switched off) */
    cancel: ExistingReminder[];
}

/**
 * Compares the wanted reminders with the stored ones. Never creates a second push for a slot:
 * a SENT row stays as it is, whatever happens to the entries afterwards.
 * `existing` must only contain rows inside the planning window.
 */
export function diffReminders(
    desired: readonly DesiredReminder[],
    existing: readonly ExistingReminder[],
): ReminderDiff {
    const stored = new Map(existing.map((row) => [keyOf(row), row]));
    const wanted = new Set(desired.map(keyOf));
    const diff: ReminderDiff = { create: [], keep: [], reschedule: [], cancel: [] };

    for (const reminder of desired) {
        const row = stored.get(keyOf(reminder));
        if (!row) {
            diff.create.push(reminder);
        } else if (row.status === 'SENT') {
            continue;
        } else {
            const unchanged =
                row.fingerprint === reminder.fingerprint &&
                row.scheduledFor.getTime() === reminder.sendAt.getTime();
            if (row.status === 'SCHEDULED' && unchanged) {
                diff.keep.push({ existing: row, desired: reminder });
                continue;
            }
            if ((row.status === 'CANCELLED' || row.status === 'SKIPPED') && unchanged) continue;
            diff.reschedule.push({ existing: row, desired: reminder });
        }
    }
    for (const row of existing) {
        if (row.status === 'SCHEDULED' && !wanted.has(keyOf(row))) diff.cancel.push(row);
    }
    return diff;
}

/**
 * Decision of the worker right before sending: only a SCHEDULED row whose fingerprint and time still
 * equal the freshly computed ones is sent. `current` = null means the reminder is not wanted any
 * more (entry gone, cooked, setting off).
 */
export function sendDecision(
    row: Pick<ExistingReminder, 'status' | 'fingerprint' | 'scheduledFor'>,
    current: Pick<DesiredReminder, 'fingerprint' | 'sendAt'> | null,
): 'send' | 'stale' | 'already' {
    if (row.status === 'SENT') return 'already';
    if (row.status !== 'SCHEDULED' || !current) return 'stale';
    // A changed time (entry moved, quiet hours edited) is stale too: the planner re-schedules it
    const same =
        current.fingerprint === row.fingerprint &&
        current.sendAt.getTime() === row.scheduledFor.getTime();
    return same ? 'send' : 'stale';
}

/** Job id for BullMQ (no ":"): one id per row, fingerprint and time, so a changed reminder gets a new job. */
export function reminderJobId(row: {
    kind: string;
    date: string;
    slotKey: string;
    userId: string;
    fingerprint: string;
    sendAt: Date;
}): string {
    const slot = row.slotKey || 'week';
    return `mealrem_${row.userId}_${row.kind}_${row.date}_${slot}_${row.fingerprint.slice(0, 10)}_${Math.floor(row.sendAt.getTime() / 60000)}`;
}
