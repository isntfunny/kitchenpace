'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@app/components/atoms/Button';
import {
    changeBringItem,
    getBringItems,
    getBringLists,
    getBringStatus,
} from '@app/lib/bring/actions';
import type { BringItem, BringItems, BringList } from '@app/lib/bring/types';

import { ConnectionCard } from './ConnectionCard';
import { card, field, heading, muted, row, stack } from './styles';

export function ShoppingListClient() {
    const [lists, setLists] = useState<BringList[]>([]);
    const [listId, setListId] = useState('');
    const [connected, setConnected] = useState<boolean | null>(null);
    const [snapshot, setSnapshot] = useState<{ listUuid: string; items: BringItems } | null>(null);
    const items = snapshot?.listUuid === listId ? snapshot.items : null;
    const busyRef = useRef(false);
    const requestVersion = useRef(0);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [name, setName] = useState('');
    const [specification, setSpecification] = useState('');
    const [editing, setEditing] = useState<BringItem | null>(null);
    const [message, setMessage] = useState('');
    const [refresh, setRefresh] = useState(0);

    const loadLists = useCallback(async () => {
        try {
            const status = await getBringStatus();
            if (!status.ok) {
                setError(status.error);
                return;
            }
            setConnected(status.data.connected);
            if (!status.data.connected) return;
            const result = await getBringLists();
            if (!result.ok) {
                setError(result.error);
                return;
            }
            setLists(result.data.lists);
            setListId((previous) =>
                result.data.lists.some((list) => list.listUuid === previous)
                    ? previous
                    : (result.data.defaultListUuid ?? ''),
            );
            setError('');
        } catch {
            setError('Die Listen konnten nicht geladen werden.');
        }
    }, []);

    useEffect(() => {
        void loadLists();
    }, [loadLists]);
    useEffect(() => {
        setEditing(null);
        if (!listId) return;
        let active = true;
        let loading = false;
        async function load() {
            if (loading || busyRef.current || document.visibilityState === 'hidden') return;
            loading = true;
            const version = ++requestVersion.current;
            try {
                const result = await getBringItems(listId);
                if (!active || version !== requestVersion.current) return;
                if (result.ok) {
                    setSnapshot({ listUuid: listId, items: result.data });
                    setError('');
                } else setError(result.error);
            } catch {
                if (active) setError('Die Liste konnte nicht aktualisiert werden.');
            } finally {
                loading = false;
            }
        }
        void load();
        const timer = setInterval(() => {
            if (!busyRef.current) void load();
        }, 60_000);
        const focus = () => {
            if (!busyRef.current) void load();
        };
        window.addEventListener('focus', focus);
        document.addEventListener('visibilitychange', focus);
        return () => {
            active = false;
            clearInterval(timer);
            window.removeEventListener('focus', focus);
            document.removeEventListener('visibilitychange', focus);
        };
    }, [listId, refresh]);

    async function mutate(
        operation: 'add' | 'complete' | 'remove',
        item: BringItem,
        options: { previousSpecification?: string; restore?: boolean } = {},
    ) {
        if (busyRef.current || !listId || !items) return;
        busyRef.current = true;
        requestVersion.current++;
        setBusy(true);
        setError('');
        setMessage('');
        try {
            const result = await changeBringItem({
                listUuid: listId,
                operation,
                ...item,
                ...options,
            });
            if (!result.ok) {
                setError(`${result.error} Aktualisiere die Liste vor einem erneuten Versuch.`);
                return;
            }
            setSnapshot({ listUuid: listId, items: result.data });
            setMessage('Einkaufsliste aktualisiert.');
            if (operation === 'add') {
                setName('');
                setSpecification('');
                setEditing(null);
            }
        } catch {
            setError('Ergebnis unklar. Bitte aktualisiere die Liste vor einem erneuten Versuch.');
        } finally {
            busyRef.current = false;
            setBusy(false);
        }
    }

    function renderItem(item: BringItem, purchased: boolean) {
        return (
            <li key={item.displayName ?? item.name} className={row}>
                <label className={row}>
                    <input
                        type="checkbox"
                        checked={purchased}
                        disabled={busy}
                        onChange={() =>
                            void mutate(purchased ? 'add' : 'complete', item, {
                                restore: purchased,
                            })
                        }
                    />
                    <span>
                        {item.displayName ?? item.name}
                        <span className={muted}> {item.specification}</span>
                    </span>
                </label>
                {!purchased && (
                    <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        aria-label={`${item.displayName ?? item.name}: Menge bearbeiten`}
                        onClick={() => {
                            setEditing(item);
                            setSpecification(item.specification);
                        }}
                    >
                        Bearbeiten
                    </Button>
                )}
                <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    aria-label={`${item.displayName ?? item.name} entfernen`}
                    onClick={() => void mutate('remove', item)}
                >
                    Entfernen
                </Button>
            </li>
        );
    }

    return (
        <div className={stack}>
            {connected === false ? (
                <ConnectionCard onConnected={() => void loadLists()} />
            ) : (
                <section className={`${card} ${stack}`}>
                    <div className={row}>
                        <h2 className={heading}>Deine Bring!-Listen</h2>
                        <Button
                            variant="secondary"
                            disabled={busy}
                            onClick={() => {
                                void loadLists();
                                setRefresh((value) => value + 1);
                            }}
                        >
                            Aktualisieren
                        </Button>
                    </div>
                    {connected === null && !error && <p role="status">Listen werden geladen …</p>}
                    {connected && (
                        <label>
                            Liste
                            <select
                                className={field}
                                value={listId}
                                disabled={busy}
                                onChange={(event) => {
                                    setSnapshot(null);
                                    setEditing(null);
                                    setListId(event.target.value);
                                    setMessage('');
                                }}
                            >
                                <option value="">Bitte Liste auswählen</option>
                                {lists.map((list) => (
                                    <option key={list.listUuid} value={list.listUuid}>
                                        {list.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}
                    {connected && lists.length === 0 && !error && (
                        <p>Lege eine Einkaufsliste in Bring! an und aktualisiere diese Ansicht.</p>
                    )}
                    {listId && (
                        <>
                            <form
                                className={stack}
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    void mutate('add', { name, specification });
                                }}
                            >
                                <label>
                                    Artikel hinzufügen
                                    <input
                                        className={field}
                                        required
                                        maxLength={200}
                                        placeholder="Zum Beispiel Milch"
                                        value={name}
                                        disabled={busy}
                                        onChange={(event) => setName(event.target.value)}
                                    />
                                </label>
                                {!editing && (
                                    <label>
                                        Menge oder Details
                                        <input
                                            className={field}
                                            maxLength={500}
                                            placeholder="Zum Beispiel 1 L"
                                            value={specification}
                                            disabled={busy}
                                            onChange={(event) =>
                                                setSpecification(event.target.value)
                                            }
                                        />
                                    </label>
                                )}
                                <Button
                                    disabled={busy || !!editing || !items || !name.trim()}
                                    type="submit"
                                >
                                    Hinzufügen
                                </Button>
                            </form>
                            {editing && items && (
                                <form
                                    className={stack}
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        void mutate(
                                            'add',
                                            { name: editing.name, specification },
                                            { previousSpecification: editing.specification },
                                        );
                                    }}
                                >
                                    <label>
                                        Menge / Details für {editing.name}
                                        <input
                                            className={field}
                                            autoFocus
                                            maxLength={500}
                                            value={specification}
                                            disabled={busy}
                                            onChange={(event) =>
                                                setSpecification(event.target.value)
                                            }
                                        />
                                    </label>
                                    <div className={row}>
                                        <Button type="submit" disabled={busy}>
                                            Änderung speichern
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            type="button"
                                            disabled={busy}
                                            onClick={() => {
                                                setEditing(null);
                                                setSpecification('');
                                            }}
                                        >
                                            Abbrechen
                                        </Button>
                                    </div>
                                </form>
                            )}
                            {!items && <p role="status">Artikel werden geladen …</p>}
                            {items && (
                                <>
                                    <h3 className={heading}>
                                        Noch einkaufen ({items.purchase.length})
                                    </h3>
                                    {items.purchase.length === 0 && (
                                        <p>
                                            Alles erledigt! Füge Artikel oder Zutaten aus einem
                                            Rezept hinzu.
                                        </p>
                                    )}
                                    <ul className={stack}>
                                        {items.purchase.map((item) => renderItem(item, false))}
                                    </ul>
                                    <details>
                                        <summary>Gekauft ({items.recently.length})</summary>
                                        <ul className={stack}>
                                            {items.recently.map((item) => renderItem(item, true))}
                                        </ul>
                                    </details>
                                </>
                            )}
                        </>
                    )}
                </section>
            )}
            {error && <p role="alert">{error}</p>}
            {message && <p role="status">{message}</p>}
            <Link href="/profile/integrations">Bring!-Verknüpfung verwalten</Link>
        </div>
    );
}
