'use client';

import { RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@app/components/atoms/Button';
import { chip, fieldLabel, input, notice } from '@app/components/atoms/recipes';
import { Sheet } from '@app/components/ui/Sheet';
import {
    disableBringSync,
    enableBringSync,
    getBringLists,
    syncBringNow,
} from '@app/lib/bring/actions';
import type { BringSyncState } from '@app/lib/bring/sync-settings';
import { syncStatusText, syncTone, type SyncTone } from '@app/lib/bring/sync-view';
import type { BringList } from '@app/lib/bring/types';

import { css, cx } from 'styled-system/css';

const DOT: Record<SyncTone, string> = {
    off: css({ bg: 'foreground.muted' }),
    good: css({ bg: 'status.success' }),
    warn: css({ bg: 'status.warning' }),
    bad: css({ bg: 'status.error' }),
};
const trackOn = css({ bg: 'primary', _after: { transform: 'translateX(13px)' } });
const trackOff = css({ bg: 'border' });

const dotClass = css({ w: '8px', h: '8px', borderRadius: 'full', flexShrink: 0 });
const track = css({
    position: 'relative',
    w: '30px',
    h: '17px',
    borderRadius: 'full',
    flexShrink: 0,
    transition: 'background 0.15s',
    _after: {
        content: '""',
        position: 'absolute',
        top: '2px',
        left: '2px',
        w: '13px',
        h: '13px',
        borderRadius: 'full',
        bg: 'white',
        transition: 'transform 0.15s',
    },
});
const muted = css({ color: 'foreground.muted', fontSize: 'sm', lineHeight: '1.5' });
const linkClass = css({ color: 'primary', fontWeight: '600' });

/**
 * Bring! sync switch of the list page (KUC-106): a pill with status dot and switch; a click
 * opens the panel to pick the Bring! list, turn the sync on or off, or sync right now. The
 * connection itself (login, default list) stays under /profile/integrations.
 */
export function BringSyncPill({
    state,
    onChange,
    onSynced,
}: {
    state: BringSyncState;
    onChange: (state: BringSyncState) => void;
    /** Called some seconds after "Jetzt abgleichen" so the page can reload the list */
    onSynced: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [lists, setLists] = useState<BringList[] | null>(null);
    const [listId, setListId] = useState(state.listUuid ?? '');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const tone = syncTone(state);
    const on = tone !== 'off';
    const listName = lists?.find((list) => list.listUuid === state.listUuid)?.name;

    async function openPanel(next: boolean) {
        setOpen(next);
        setError('');
        if (!next || !state.connected || lists) return;
        const result = await getBringLists();
        if (result.ok) {
            setLists(result.data.lists);
            setListId(
                state.listUuid ??
                    result.data.defaultListUuid ??
                    result.data.lists[0]?.listUuid ??
                    '',
            );
        } else setError(result.error);
    }

    async function run(
        work: () => Promise<{ ok: true; data: BringSyncState } | { ok: false; error: string }>,
    ) {
        setBusy(true);
        setError('');
        const result = await work();
        setBusy(false);
        if (result.ok) onChange(result.data);
        else setError(result.error);
        return result.ok;
    }

    return (
        <Sheet
            open={open}
            onOpenChange={(next) => void openPanel(next)}
            title="Bring!-Abgleich"
            size="sm"
            describedBy="bring-sync-status"
            trigger={
                <button
                    type="button"
                    className={chip()}
                    aria-label={`Bring!-Abgleich, ${on ? 'an' : 'aus'}. Einstellungen öffnen`}
                >
                    <span className={`${dotClass} ${DOT[tone]}`} aria-hidden="true" />
                    <span>Bring!{on && listName ? ` · „${listName}“` : ''}</span>
                    <span className={`${track} ${on ? trackOn : trackOff}`} aria-hidden="true" />
                </button>
            }
        >
            <p id="bring-sync-status" className={muted} role="status">
                {syncStatusText(state, new Date())}
            </p>
            {error && (
                <p role="alert" className={cx(notice({ tone: 'error' }), css({ mt: '3' }))}>
                    {error}
                </p>
            )}

            {!state.connected ? (
                <p className={css({ mt: '4' })}>
                    <Link href="/profile/integrations" className={linkClass}>
                        Bring!-Konto verbinden
                    </Link>
                </p>
            ) : (
                <div className={css({ mt: '4', display: 'grid', gap: '3' })}>
                    <label className={css({ display: 'grid', gap: '1' })}>
                        <span className={fieldLabel}>Bring!-Liste</span>
                        <select
                            className={cx(input, css({ w: '100%', minH: '44px' }))}
                            value={listId}
                            onChange={(event) => setListId(event.target.value)}
                            disabled={busy || state.enabled || !lists}
                        >
                            {!lists && <option value="">Lädt …</option>}
                            {lists?.map((list) => (
                                <option key={list.listUuid} value={list.listUuid}>
                                    {list.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <div className={css({ display: 'flex', gap: '2', flexWrap: 'wrap' })}>
                        {state.enabled ? (
                            <Button
                                type="button"
                                disabled={busy}
                                onClick={() => void run(() => disableBringSync())}
                            >
                                Abgleich ausschalten
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                variant="primary"
                                disabled={busy || !listId}
                                onClick={() => void run(() => enableBringSync(listId))}
                            >
                                Abgleich einschalten
                            </Button>
                        )}
                        {state.enabled && state.status !== 'AUTH_FAILED' && (
                            <Button
                                type="button"
                                disabled={busy}
                                onClick={async () => {
                                    if (await run(() => syncBringNow()))
                                        window.setTimeout(onSynced, 4000);
                                }}
                            >
                                <RefreshCw size={14} aria-hidden="true" /> Jetzt abgleichen
                            </Button>
                        )}
                    </div>
                    {state.status === 'AUTH_FAILED' && (
                        <Link href="/profile/integrations" className={linkClass}>
                            Bring!-Konto neu verbinden
                        </Link>
                    )}
                    <p className={muted}>
                        Abhaken in Bring! oder hier gilt auf beiden Seiten. Bei verschiedenen Mengen
                        gewinnt die neuere Änderung. Das Konto verwaltest du unter{' '}
                        <Link href="/profile/integrations" className={linkClass}>
                            Verknüpfte Dienste
                        </Link>
                        .
                    </p>
                </div>
            )}
        </Sheet>
    );
}
