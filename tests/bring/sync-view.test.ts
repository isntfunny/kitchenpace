import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { BringSyncState } from '@app/lib/bring/sync-settings';
import { agoLabel, syncStatusText, syncTone } from '@app/lib/bring/sync-view';

const NOW = new Date('2026-11-21T12:00:00Z');
const base: BringSyncState = {
    connected: true,
    enabled: true,
    listUuid: 'l',
    status: 'OK',
    lastSyncAt: '2026-11-21T11:55:00Z',
    error: null,
};

test('tone follows connection and status', () => {
    assert.equal(syncTone({ ...base, connected: false }), 'off');
    assert.equal(syncTone({ ...base, enabled: false }), 'off');
    assert.equal(syncTone(base), 'good');
    assert.equal(syncTone({ ...base, status: 'ERROR' }), 'warn');
    assert.equal(syncTone({ ...base, status: 'AUTH_FAILED' }), 'bad');
});

test('relative time', () => {
    assert.equal(agoLabel('2026-11-21T11:59:30Z', NOW), 'gerade eben');
    assert.equal(agoLabel('2026-11-21T11:55:00Z', NOW), 'vor 5 Min.');
    assert.equal(agoLabel('2026-11-21T09:00:00Z', NOW), 'vor 3 Std.');
    assert.equal(agoLabel('2026-11-19T12:00:00Z', NOW), 'vor 2 Tagen');
});

test('status text tells what is going on and what to do', () => {
    assert.match(syncStatusText(base, NOW), /vor 5 Min\./);
    assert.match(syncStatusText({ ...base, lastSyncAt: null }, NOW), /erste Abgleich/);
    assert.match(syncStatusText({ ...base, status: 'AUTH_FAILED' }, NOW), /neu/);
    assert.match(
        syncStatusText({ ...base, status: 'ERROR', error: 'Bring! ist nicht erreichbar.' }, NOW),
        /nicht erreichbar.*erneut/,
    );
    assert.match(syncStatusText({ ...base, connected: false }, NOW), /verbinde/i);
});
