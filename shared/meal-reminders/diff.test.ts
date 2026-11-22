import assert from 'node:assert/strict';
import { test } from 'node:test';

import { diffReminders, reminderJobId, sendDecision } from './diff';
import type { DesiredReminder, ExistingReminder } from './types';

const T = new Date('2026-11-21T17:00:00Z');

function desired(partial: Partial<DesiredReminder> = {}): DesiredReminder {
    return {
        kind: 'COOK_START',
        date: '2026-11-21',
        slotKey: 'DINNER',
        sendAt: T,
        fingerprint: 'fp1',
        title: 't',
        body: 'b',
        href: '/plan',
        ...partial,
    };
}
function row(partial: Partial<ExistingReminder> = {}): ExistingReminder {
    return {
        id: 'x',
        kind: 'COOK_START',
        date: '2026-11-21',
        slotKey: 'DINNER',
        scheduledFor: T,
        fingerprint: 'fp1',
        status: 'SCHEDULED',
        jobId: 'job',
        ...partial,
    };
}

test('new, unchanged, changed and vanished reminders', () => {
    const wanted = [
        desired(),
        desired({ slotKey: 'LUNCH' }),
        desired({ slotKey: 'BREAKFAST', fingerprint: 'new' }),
    ];
    const stored = [
        row(),
        row({ slotKey: 'BREAKFAST', id: 'b' }),
        row({ slotKey: 'SNACK', id: 's' }),
    ];
    const diff = diffReminders(wanted, stored);
    assert.deepEqual(
        diff.create.map((r) => r.slotKey),
        ['LUNCH'],
    );
    assert.deepEqual(
        diff.reschedule.map((r) => r.existing.id),
        ['b'],
    );
    assert.deepEqual(
        diff.cancel.map((r) => r.id),
        ['s'],
    );
});

test('a moved entry changes the send time and is rescheduled; the old job id differs from the new one', () => {
    const moved = desired({ sendAt: new Date(T.getTime() + 3_600_000) });
    const diff = diffReminders([moved], [row()]);
    assert.equal(diff.reschedule.length, 1);
    const base = {
        kind: 'COOK_START',
        date: '2026-11-21',
        slotKey: 'DINNER',
        userId: 'u',
        fingerprint: 'fp1',
    };
    assert.notEqual(
        reminderJobId({ ...base, sendAt: T }),
        reminderJobId({ ...base, sendAt: moved.sendAt }),
    );
    assert.equal(reminderJobId({ ...base, sendAt: T }), reminderJobId({ ...base, sendAt: T }));
    assert.ok(!reminderJobId({ ...base, sendAt: T }).includes(':'));
});

test('a sent slot never gets a second push, even when the entry changes afterwards', () => {
    const diff = diffReminders([desired({ fingerprint: 'other' })], [row({ status: 'SENT' })]);
    assert.deepEqual(diff, { create: [], keep: [], reschedule: [], cancel: [] });
});

test('cancelled or skipped rows come back only when something changed', () => {
    assert.deepEqual(diffReminders([desired()], [row({ status: 'CANCELLED' })]).reschedule, []);
    assert.equal(
        diffReminders([desired({ fingerprint: 'n' })], [row({ status: 'SKIPPED' })]).reschedule
            .length,
        1,
    );
});

test('cancelling only touches scheduled rows', () => {
    const diff = diffReminders(
        [],
        [row({ status: 'SENT' }), row({ status: 'CANCELLED', id: 'c' })],
    );
    assert.equal(diff.cancel.length, 0);
});

test('send decision: stale when fingerprint or time differ or nothing is wanted any more', () => {
    const stored = (status: ExistingReminder['status'], fingerprint = 'a') => ({
        status,
        fingerprint,
        scheduledFor: T,
    });
    const now = (fingerprint: string, sendAt = T) => ({ fingerprint, sendAt });
    assert.equal(sendDecision(stored('SCHEDULED'), now('a')), 'send');
    assert.equal(sendDecision(stored('SCHEDULED'), now('b')), 'stale');
    assert.equal(
        sendDecision(stored('SCHEDULED'), now('a', new Date(T.getTime() + 60_000))),
        'stale',
    );
    assert.equal(sendDecision(stored('SCHEDULED'), null), 'stale');
    assert.equal(sendDecision(stored('SENT'), now('a')), 'already');
    assert.equal(sendDecision(stored('CANCELLED'), now('a')), 'stale');
});
