'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@app/components/atoms/Button';
import { Heading } from '@app/components/atoms/Typography';
import {
    changeBringItem,
    getBringItems,
    getBringLists,
    getBringStatus,
} from '@app/lib/bring/actions';
import type { BringItem, BringItems, BringList } from '@app/lib/bring/types';

import { css } from 'styled-system/css';

import { ConnectionCard } from './ConnectionCard';
import { Feedback, LoadingState, EmptyState } from './Feedback';
import { ListSelect } from './ListSelect';
import { card, field, label, link, muted, row, stack, checkbox, itemRow } from './styles';

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
            <li key={item.name} className={itemRow}>
                <label
                    className={`${row} ${css({ flex: { base: '1 1 100%', sm: '1' }, minW: '120px', minH: '11', cursor: 'pointer', overflowWrap: 'anywhere' })}`}
                >
                    <input
                        type="checkbox"
                        className={checkbox}
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
                <div
                    className={css({ display: 'flex', alignItems: 'center', gap: '1', ml: 'auto' })}
                >
                    {!purchased && (
                        <Button
                            size="sm"
                            style={{ minHeight: 44 }}
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
                        style={{ minHeight: 44 }}
                        variant="ghost"
                        disabled={busy}
                        aria-label={`${item.displayName ?? item.name} entfernen`}
                        onClick={() => void mutate('remove', item)}
                    >
                        Entfernen
                    </Button>
                </div>
            </li>
        );
    }

    return (
        <div className={`${stack} ${css({ fontFamily: 'body', color: 'text' })}`}>
            {connected === false ? (
                <ConnectionCard onConnected={() => void loadLists()} />
            ) : (
                <section className={`${card} ${stack}`}>
                    <div className={row}>
                        <Heading as="h2" size="md">
                            Deine Bring!-Listen
                        </Heading>
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
                    {connected === null && !error && (
                        <LoadingState>Listen werden geladen …</LoadingState>
                    )}
                    {connected && (
                        <ListSelect
                            label="Liste"
                            lists={lists}
                            value={listId}
                            disabled={busy}
                            onValueChange={(value) => {
                                setSnapshot(null);
                                setEditing(null);
                                setListId(value);
                                setMessage('');
                            }}
                        />
                    )}
                    {connected && lists.length === 0 && !error && (
                        <EmptyState>
                            Lege eine Einkaufsliste in Bring! an und aktualisiere diese Ansicht.
                        </EmptyState>
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
                                <label className={label}>
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
                                    <label className={label}>
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
                                    <label className={label}>
                                        Menge / Details für {editing.displayName ?? editing.name}
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
                            {!items && <LoadingState>Artikel werden geladen …</LoadingState>}
                            {items && (
                                <>
                                    <Heading as="h3" size="sm">
                                        Noch einkaufen ({items.purchase.length})
                                    </Heading>
                                    {items.purchase.length === 0 && (
                                        <EmptyState>
                                            Alles erledigt! Füge Artikel oder Zutaten aus einem
                                            Rezept hinzu.
                                        </EmptyState>
                                    )}
                                    <ul className={stack}>
                                        {items.purchase.map((item) => renderItem(item, false))}
                                    </ul>
                                    <details>
                                        <summary
                                            className={css({
                                                cursor: 'pointer',
                                                fontWeight: '600',
                                                py: '3',
                                                minH: '11',
                                            })}
                                        >
                                            Gekauft ({items.recently.length})
                                        </summary>
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
            {error && <Feedback error>{error}</Feedback>}
            {message && <Feedback>{message}</Feedback>}
            <Link className={link} href="/profile/integrations">
                Bring!-Verknüpfung verwalten
            </Link>
        </div>
    );
}
