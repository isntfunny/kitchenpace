// Wording of the Bring! sync status on the list page (KUC-106).
import type { BringSyncState } from './sync-settings';

export type SyncTone = 'off' | 'good' | 'warn' | 'bad';

export function syncTone(state: BringSyncState): SyncTone {
    if (!state.connected || !state.enabled) return 'off';
    if (state.status === 'AUTH_FAILED') return 'bad';
    if (state.status === 'ERROR') return 'warn';
    return 'good';
}

/** "gerade eben", "vor 5 Min.", "vor 3 Std.", "vor 2 Tagen" */
export function agoLabel(iso: string, now: Date): string {
    const minutes = Math.floor((now.getTime() - Date.parse(iso)) / 60_000);
    if (minutes < 1) return 'gerade eben';
    if (minutes < 60) return `vor ${minutes} Min.`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `vor ${hours} Std.`;
    const days = Math.floor(hours / 24);
    return days === 1 ? 'vor 1 Tag' : `vor ${days} Tagen`;
}

/** One line under the switch. */
export function syncStatusText(state: BringSyncState, now: Date): string {
    if (!state.connected)
        return 'Verbinde dein Bring!-Konto, um die Liste in beiden Apps zu haben.';
    if (!state.enabled) return 'Aus. Die Liste bleibt nur in KochTakt.';
    if (state.status === 'AUTH_FAILED')
        return 'Bring! lehnt die Anmeldung ab. Bitte verbinde dein Konto neu und schalte den Abgleich wieder ein.';
    const last = state.lastSyncAt ? `Zuletzt abgeglichen ${agoLabel(state.lastSyncAt, now)}.` : '';
    if (state.status === 'ERROR')
        return `${state.error ?? 'Der Abgleich hat nicht geklappt.'} Wir versuchen es automatisch erneut. ${last}`.trim();
    return state.lastSyncAt ? last : 'Der erste Abgleich läuft gleich.';
}
