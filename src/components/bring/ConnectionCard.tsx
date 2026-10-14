'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button } from '@app/components/atoms/Button';
import { Heading, Text } from '@app/components/atoms/Typography';
import {
    connectBring,
    disconnectBring,
    getBringLists,
    getBringStatus,
    previewBringConnection,
    setBringDefault,
} from '@app/lib/bring/actions';
import type { BringList } from '@app/lib/bring/types';

import { Feedback, LoadingState, EmptyState } from './Feedback';
import { ListSelect } from './ListSelect';
import { card, field, label, link, row, stack } from './styles';

export function ConnectionCard({ onConnected }: { onConnected?: () => void }) {
    const [initialLoading, setInitialLoading] = useState(true);
    const [connected, setConnected] = useState(false);
    const [editing, setEditing] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [lists, setLists] = useState<BringList[] | null>(null);
    const [listId, setListId] = useState('');
    const [busy, setBusy] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        let active = true;
        void (async () => {
            try {
                const status = await getBringStatus();
                if (!active) return;
                if (!status.ok) {
                    setError(status.error);
                    return;
                }
                setConnected(status.data.connected);
                if (status.data.connected) {
                    const result = await getBringLists();
                    if (!active) return;
                    if (result.ok) {
                        setLists(result.data.lists);
                        setListId(result.data.defaultListUuid ?? '');
                    } else setError(result.error);
                }
            } catch {
                if (active) setError('Die Verbindung konnte nicht geladen werden.');
            } finally {
                if (active) {
                    setBusy(false);
                    setInitialLoading(false);
                }
            }
        })();
        return () => {
            active = false;
        };
    }, []);

    async function submit() {
        if (busy) return;
        setBusy(true);
        setError('');
        setMessage('');
        try {
            if (connected && !editing) {
                const result = await setBringDefault(listId);
                if (!result.ok) {
                    setError(result.error);
                    return;
                }
                setMessage('Standardliste gespeichert.');
                onConnected?.();
            } else if (!lists) {
                const result = await previewBringConnection({ email, password });
                if (!result.ok) {
                    setError(result.error);
                    return;
                }
                setLists(result.data);
                setListId('');
            } else {
                const result = await connectBring({ email, password, defaultListUuid: listId });
                if (!result.ok) {
                    setError(result.error);
                    return;
                }
                setPassword('');
                setEmail('');
                setConnected(true);
                setEditing(false);
                setMessage('Bring! ist verbunden.');
                onConnected?.();
            }
        } catch {
            setError('Die Verbindung konnte nicht gespeichert werden. Bitte versuche es erneut.');
        } finally {
            setBusy(false);
        }
    }

    async function reloadLists() {
        if (busy) return;
        if (!connected || editing) {
            setLists(null);
            return;
        }
        setBusy(true);
        setError('');
        try {
            const result = await getBringLists();
            if (result.ok) {
                setLists(result.data.lists);
                setListId(result.data.defaultListUuid ?? '');
            } else setError(result.error);
        } catch {
            setError('Die Listen konnten nicht geladen werden.');
        } finally {
            setBusy(false);
        }
    }

    async function disconnect() {
        setBusy(true);
        setError('');
        try {
            const result = await disconnectBring();
            if (!result.ok) {
                setError(result.error);
                return;
            }
            setConnected(false);
            setEditing(false);
            setLists(null);
            setListId('');
            setEmail('');
            setPassword('');
            setMessage('Verbindung getrennt. Deine Bring!-Listen bleiben erhalten.');
        } catch {
            setError('Die Verbindung konnte nicht getrennt werden.');
        } finally {
            setBusy(false);
        }
    }

    if (initialLoading)
        return (
            <section className={card} aria-label="Bring!-Verknüpfung">
                <LoadingState>Verbindung wird geladen …</LoadingState>
            </section>
        );

    return (
        <section className={card} aria-label="Bring!-Verknüpfung">
            <form
                className={stack}
                onSubmit={(event) => {
                    event.preventDefault();
                    void submit();
                }}
            >
                <Heading as="h2" size="md">
                    Bring! {connected ? '· Verbunden' : 'verbinden'}
                </Heading>
                <Text color="muted" size="sm">
                    Übernimm Rezeptzutaten und verwalte deine Bring!-Einkaufslisten direkt in
                    KochTakt.
                </Text>
                {(!connected || editing) && (
                    <>
                        <Text color="muted" size="sm">
                            Melde dich mit deinen Bring!-Zugangsdaten an. KochTakt speichert sie
                            verschlüsselt, damit du deine Listen hier nutzen kannst.
                        </Text>
                        <label className={label}>
                            E-Mail bei Bring!
                            <input
                                className={field}
                                type="email"
                                autoComplete="username"
                                required
                                maxLength={254}
                                value={email}
                                disabled={busy}
                                onChange={(event) => {
                                    setEmail(event.target.value);
                                    setLists(null);
                                    setListId('');
                                }}
                            />
                        </label>
                        <label className={label}>
                            Bring!-Passwort
                            <input
                                className={field}
                                type="password"
                                autoComplete="current-password"
                                required
                                maxLength={1024}
                                value={password}
                                disabled={busy}
                                onChange={(event) => {
                                    setPassword(event.target.value);
                                    setLists(null);
                                    setListId('');
                                }}
                            />
                        </label>
                    </>
                )}
                {lists && lists.length > 0 && (
                    <ListSelect
                        label="Standardliste"
                        lists={lists}
                        value={listId}
                        disabled={busy}
                        onValueChange={setListId}
                        required
                    />
                )}
                {lists?.length === 0 && (
                    <EmptyState>
                        In diesem Konto gibt es noch keine Liste. Lege eine Liste in Bring! an und
                        lade sie anschließend neu.
                    </EmptyState>
                )}
                {error && <Feedback error>{error}</Feedback>}
                {message && <Feedback>{message}</Feedback>}
                <div className={row}>
                    <Button
                        type="submit"
                        disabled={
                            busy ||
                            ((!!lists || (connected && !editing)) &&
                                !lists?.some((list) => list.listUuid === listId))
                        }
                    >
                        {busy
                            ? 'Bitte warten …'
                            : connected && !editing
                              ? 'Standardliste speichern'
                              : lists
                                ? 'Verknüpfung speichern'
                                : 'Listen laden'}
                    </Button>
                    {lists?.length === 0 && (
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={busy}
                            onClick={() => void reloadLists()}
                        >
                            Erneut laden
                        </Button>
                    )}
                    {connected && (
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={busy}
                            onClick={() => {
                                setEditing(true);
                                setLists(null);
                                setListId('');
                                setMessage('');
                            }}
                        >
                            Neu verbinden
                        </Button>
                    )}
                    {connected && (
                        <Button
                            type="button"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => void disconnect()}
                        >
                            Verbindung trennen
                        </Button>
                    )}
                </div>
                {connected && !onConnected && (
                    <Link className={link} href="/shopping-list">
                        Zur Einkaufsliste
                    </Link>
                )}
            </form>
        </section>
    );
}
