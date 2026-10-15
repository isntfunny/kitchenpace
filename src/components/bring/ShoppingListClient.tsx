'use client';

import { RefreshCw, ShoppingBasket } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@app/components/atoms/Button';
import { Heading, Text } from '@app/components/atoms/Typography';
import {
    changeBringItem,
    createBringList,
    getBringItems,
    getBringLists,
    getBringStatus,
} from '@app/lib/bring/actions';
import type { BringItem, BringItems, BringList } from '@app/lib/bring/types';

import { css } from 'styled-system/css';

import { ConnectionCard } from './ConnectionCard';
import { CreateListForm } from './CreateListForm';
import { Feedback, LoadingState, EmptyState } from './Feedback';
import { ListSelect } from './ListSelect';
import { ShoppingAddForm } from './ShoppingAddForm';
import { ShoppingItemRow } from './ShoppingItemRow';
import { card, link, stack } from './styles';

export function ShoppingListClient() {
    const [lists, setLists] = useState<BringList[]>([]);
    const [listId, setListId] = useState('');
    const [connected, setConnected] = useState<boolean | null>(null);
    const [snapshot, setSnapshot] = useState<{ listUuid: string; items: BringItems } | null>(null);
    const items = snapshot?.listUuid === listId ? snapshot.items : null;
    const busyRef = useRef(false);
    const requestVersion = useRef(0);
    const listVersion = useRef(0);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [refresh, setRefresh] = useState(0);

    const loadLists = useCallback(async () => {
        const version = ++listVersion.current;
        try {
            const status = await getBringStatus();
            if (version !== listVersion.current) return;
            if (!status.ok) {
                setError(status.error);
                return;
            }
            setConnected(status.data.connected);
            if (!status.data.connected) return;
            const result = await getBringLists();
            if (version !== listVersion.current) return;
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
        if (busyRef.current || !listId || !items) return false;
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
                return false;
            }
            setSnapshot({ listUuid: listId, items: result.data });
            setMessage('Einkaufsliste aktualisiert.');
            return true;
        } catch {
            setError('Ergebnis unklar. Bitte aktualisiere die Liste vor einem erneuten Versuch.');
            return false;
        } finally {
            busyRef.current = false;
            setBusy(false);
        }
    }

    async function createList(name: string, operationId: string) {
        if (busyRef.current) return false;
        busyRef.current = true;
        requestVersion.current++;
        listVersion.current++;
        setBusy(true);
        setError('');
        setMessage('');
        try {
            const result = await createBringList({ name, operationId });
            if (!result.ok) {
                setError(
                    `${result.error} Bitte aktualisiere deine Listen vor einem neuen Versuch.`,
                );
                return false;
            }
            setLists((previous) => [
                ...previous.filter((list) => list.listUuid !== result.data.listUuid),
                result.data,
            ]);
            setSnapshot(null);
            setListId(result.data.listUuid);
            setMessage(`Liste „${result.data.name}“ erstellt.`);
            return true;
        } catch {
            setError(
                'Ergebnis unklar. Bitte aktualisiere deine Listen, bevor du eine weitere Liste anlegst.',
            );
            return false;
        } finally {
            busyRef.current = false;
            setBusy(false);
        }
    }

    const count = items ? items.purchase.length + items.recently.length : 0;
    const renderItem = (item: BringItem, purchased: boolean) => (
        <ShoppingItemRow
            key={item.name}
            item={item}
            purchased={purchased}
            busy={busy}
            onToggle={() =>
                void mutate(purchased ? 'add' : 'complete', item, { restore: purchased })
            }
            onRemove={() => void mutate('remove', item)}
            onEdit={(value, previousSpecification) =>
                mutate('add', { ...item, specification: value }, { previousSpecification })
            }
        />
    );

    return (
        <div className={`${stack} ${css({ fontFamily: 'body', color: 'text' })}`}>
            {connected === false ? (
                <ConnectionCard onConnected={() => void loadLists()} />
            ) : (
                <>
                    <section className={`${card} ${stack}`} aria-label="Einkauf planen">
                        <div className={css({ display: 'flex', alignItems: 'flex-end', gap: '3' })}>
                            <div
                                className={css({
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    w: '11',
                                    h: '11',
                                    flexShrink: 0,
                                    borderRadius: 'lg',
                                    bg: 'accent.soft',
                                    color: 'primary',
                                })}
                            >
                                <ShoppingBasket size={22} aria-hidden />
                            </div>
                            <div className={css({ flex: 1, minW: 0 })}>
                                {connected ? (
                                    <ListSelect
                                        label="Liste"
                                        lists={lists}
                                        value={listId}
                                        disabled={busy}
                                        onValueChange={(value) => {
                                            setSnapshot(null);
                                            setListId(value);
                                            setMessage('');
                                        }}
                                    />
                                ) : (
                                    <Heading as="h2" size="sm">
                                        Deine Bring!-Listen
                                    </Heading>
                                )}
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                disabled={busy}
                                aria-label="Aktualisieren"
                                title="Aktualisieren"
                                style={{ width: 44, height: 44, padding: 10, flexShrink: 0 }}
                                onClick={() => {
                                    void loadLists();
                                    setRefresh((value) => value + 1);
                                }}
                            >
                                <RefreshCw size={18} aria-hidden />
                            </Button>
                        </div>
                        {connected && <CreateListForm busy={busy} onCreate={createList} />}
                        {connected === null && !error && (
                            <LoadingState>Listen werden geladen …</LoadingState>
                        )}
                        {connected && lists.length === 0 && !error && (
                            <EmptyState>
                                Lege deine erste Einkaufsliste an, um Artikel zu sammeln.
                            </EmptyState>
                        )}
                        {items && (
                            <div
                                className={css({
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '2',
                                })}
                            >
                                <div
                                    className={css({
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        gap: '2',
                                    })}
                                >
                                    <Text size="sm">
                                        <strong>{items.purchase.length}</strong> offen
                                    </Text>
                                    <Text size="sm" color="muted">
                                        {items.recently.length} gekauft
                                    </Text>
                                </div>
                                {count > 0 && (
                                    <div
                                        role="progressbar"
                                        aria-label="Anteil gekaufter Artikel"
                                        aria-valuemin={0}
                                        aria-valuemax={count}
                                        aria-valuenow={items.recently.length}
                                        className={css({
                                            h: '1',
                                            bg: 'surface.muted',
                                            borderRadius: 'full',
                                            overflow: 'hidden',
                                        })}
                                    >
                                        <div
                                            className={css({
                                                h: 'full',
                                                bg: 'primary',
                                                borderRadius: 'full',
                                                transition: 'width 200ms ease',
                                                _motionReduce: { transition: 'none' },
                                            })}
                                            style={{
                                                width: `${(items.recently.length / count) * 100}%`,
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                        {listId && (
                            <ShoppingAddForm
                                key={listId}
                                disabled={busy || !items}
                                onAdd={(item) => mutate('add', item)}
                            />
                        )}
                    </section>
                    {error && <Feedback error>{error}</Feedback>}
                    {message && (
                        <Text size="sm" color="muted" role="status">
                            {message}
                        </Text>
                    )}
                    {listId && (
                        <section className={card} aria-label="Artikel auf deiner Einkaufsliste">
                            {!items ? (
                                <LoadingState>Artikel werden geladen …</LoadingState>
                            ) : (
                                <>
                                    <Heading as="h2" size="sm" className={css({ mb: '2' })}>
                                        Noch einkaufen
                                    </Heading>
                                    {items.purchase.length === 0 ? (
                                        <EmptyState>
                                            Alles erledigt! Füge Artikel oder Zutaten aus einem
                                            Rezept hinzu.
                                        </EmptyState>
                                    ) : (
                                        <ul key={listId}>
                                            {items.purchase.map((item) => renderItem(item, false))}
                                        </ul>
                                    )}
                                    <details
                                        className={css({
                                            mt: '3',
                                            borderTopWidth: '1px',
                                            borderTopStyle: 'solid',
                                            borderColor: 'border',
                                            pt: '2',
                                        })}
                                    >
                                        <summary
                                            className={css({
                                                cursor: 'pointer',
                                                fontSize: 'sm',
                                                fontWeight: '600',
                                                py: '3',
                                                minH: '11',
                                                color: 'text-muted',
                                            })}
                                        >
                                            Gekauft ({items.recently.length})
                                        </summary>
                                        {items.recently.length === 0 ? (
                                            <Text size="sm" color="muted">
                                                Abgehakte Artikel findest du hier. Du kannst sie
                                                jederzeit wieder auf die Liste setzen.
                                            </Text>
                                        ) : (
                                            <ul key={listId}>
                                                {items.recently.map((item) =>
                                                    renderItem(item, true),
                                                )}
                                            </ul>
                                        )}
                                    </details>
                                </>
                            )}
                        </section>
                    )}
                </>
            )}
            {connected === false && error && <Feedback error>{error}</Feedback>}
            <Link className={link} href="/profile/integrations">
                Bring!-Verknüpfung verwalten
            </Link>
        </div>
    );
}
