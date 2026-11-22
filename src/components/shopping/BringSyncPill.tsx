'use client';

import { RefreshCw, X } from 'lucide-react';
import Link from 'next/link';
import { Dialog } from 'radix-ui';
import { useState } from 'react';

import {
    disableBringSync,
    enableBringSync,
    getBringLists,
    syncBringNow,
} from '@app/lib/bring/actions';
import type { BringSyncState } from '@app/lib/bring/sync-settings';
import { syncStatusText, syncTone, type SyncTone } from '@app/lib/bring/sync-view';
import type { BringList } from '@app/lib/bring/types';

import { css } from 'styled-system/css';

const DOT: Record<SyncTone, string> = {
    off: css({ bg: 'foreground.muted' }),
    good: css({ bg: 'status.success' }),
    warn: css({ bg: 'status.warning' }),
    bad: css({ bg: 'status.error' }),
};
const trackOn = css({ bg: 'primary', _after: { transform: 'translateX(13px)' } });
const trackOff = css({ bg: 'border' });

const pill = css({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2',
    minH: '36px',
    px: '3',
    borderRadius: 'full',
    border: '1px solid',
    borderColor: 'border',
    bg: 'surface.elevated',
    color: 'foreground',
    fontFamily: 'body',
    fontSize: 'sm',
    fontWeight: '600',
    cursor: 'pointer',
    _focusVisible: { outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' },
});
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
const overlay = css({ position: 'fixed', inset: 0, bg: 'rgba(0,0,0,0.4)', zIndex: 50 });
const panel = css({
    position: 'fixed',
    zIndex: 51,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    w: 'min(420px, calc(100vw - 24px))',
    maxH: 'calc(100vh - 24px)',
    overflowY: 'auto',
    p: '5',
    borderRadius: '2xl',
    bg: 'surface.elevated',
    color: 'foreground',
    boxShadow: 'shadow.large',
    fontFamily: 'body',
});
const heading = css({ fontFamily: 'heading', fontSize: 'lg', fontWeight: '700', m: 0 });
const muted = css({ color: 'foreground.muted', fontSize: 'sm', lineHeight: '1.5' });
const button = css({
    minH: '40px',
    px: '4',
    borderRadius: 'lg',
    border: '1px solid',
    borderColor: 'border',
    bg: 'surface',
    color: 'foreground',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2',
    _disabled: { opacity: 0.5, cursor: 'not-allowed' },
});
const primaryButton = css({ bg: 'primary', color: 'white', borderColor: 'primary' });
const selectClass = css({
    w: '100%',
    minH: '44px',
    px: '3',
    borderRadius: 'lg',
    border: '1px solid',
    borderColor: 'border',
    bg: 'surface',
    color: 'foreground',
    fontFamily: 'body',
});
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
        <Dialog.Root open={open} onOpenChange={(next) => void openPanel(next)}>
            <Dialog.Trigger
                className={pill}
                aria-label={`Bring!-Abgleich, ${on ? 'an' : 'aus'}. Einstellungen öffnen`}
            >
                <span className={`${dotClass} ${DOT[tone]}`} aria-hidden="true" />
                <span>Bring!{on && listName ? ` · „${listName}“` : ''}</span>
                <span className={`${track} ${on ? trackOn : trackOff}`} aria-hidden="true" />
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className={overlay} />
                <Dialog.Content className={panel} aria-describedby="bring-sync-status">
                    <div
                        className={css({
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mb: '3',
                        })}
                    >
                        <Dialog.Title className={heading}>Bring!-Abgleich</Dialog.Title>
                        <Dialog.Close className={button} aria-label="Schließen">
                            <X size={16} aria-hidden="true" />
                        </Dialog.Close>
                    </div>
                    <p id="bring-sync-status" className={muted} role="status">
                        {syncStatusText(state, new Date())}
                    </p>
                    {error && (
                        <p
                            role="alert"
                            className={css({ color: 'error.text', fontSize: 'sm', mt: '3' })}
                        >
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
                            <label
                                className={css({
                                    display: 'grid',
                                    gap: '1',
                                    fontWeight: '600',
                                    fontSize: 'sm',
                                })}
                            >
                                Bring!-Liste
                                <select
                                    className={selectClass}
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
                                    <button
                                        type="button"
                                        className={button}
                                        disabled={busy}
                                        onClick={() => void run(() => disableBringSync())}
                                    >
                                        Abgleich ausschalten
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className={`${button} ${primaryButton}`}
                                        disabled={busy || !listId}
                                        onClick={() => void run(() => enableBringSync(listId))}
                                    >
                                        Abgleich einschalten
                                    </button>
                                )}
                                {state.enabled && state.status !== 'AUTH_FAILED' && (
                                    <button
                                        type="button"
                                        className={button}
                                        disabled={busy}
                                        onClick={async () => {
                                            if (await run(() => syncBringNow()))
                                                window.setTimeout(onSynced, 4000);
                                        }}
                                    >
                                        <RefreshCw size={14} aria-hidden="true" /> Jetzt abgleichen
                                    </button>
                                )}
                            </div>
                            {state.status === 'AUTH_FAILED' && (
                                <Link href="/profile/integrations" className={linkClass}>
                                    Bring!-Konto neu verbinden
                                </Link>
                            )}
                            <p className={muted}>
                                Abhaken in Bring! oder hier gilt auf beiden Seiten. Bei
                                verschiedenen Mengen gewinnt die neuere Änderung. Das Konto
                                verwaltest du unter{' '}
                                <Link href="/profile/integrations" className={linkClass}>
                                    Verknüpfte Dienste
                                </Link>
                                .
                            </p>
                        </div>
                    )}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
