'use client';

import { ShoppingCart, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dialog } from 'radix-ui';
import { useEffect, useState } from 'react';
import { z } from 'zod';

import { Button } from '@app/components/atoms/Button';
import { Heading, Text } from '@app/components/atoms/Typography';
import { getBringLists, getBringStatus, transferToBring } from '@app/lib/bring/actions';
import { scaleQuantity } from '@app/lib/bring/items';
import type { BringList, TransferItem, TransferOutcome } from '@app/lib/bring/types';

import { css } from 'styled-system/css';

import { ConnectionCard } from './ConnectionCard';
import { Feedback, LoadingState, EmptyState } from './Feedback';
import { ListSelect } from './ListSelect';
import { field, link, row, stack, checkbox, dialogOverlay, dialogContent } from './styles';
import { TransferResults } from './TransferResults';

interface Ingredient {
    id?: string;
    name: string;
    amount?: number;
    rawAmount?: string;
    unit?: string;
    notes?: string | null;
}
const draftSchema = z.object({
    at: z.number(),
    items: z
        .array(z.object({ id: z.string(), name: z.string(), specification: z.string() }))
        .max(50),
});

export function AddToListButton({
    ingredients,
    servings = 1,
    originalServings = 1,
}: {
    ingredients: Ingredient[];
    servings?: number;
    originalServings?: number;
}) {
    const pathname = usePathname();
    const storageKey = `bring-draft:${pathname}`;
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<TransferItem[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [lists, setLists] = useState<BringList[]>([]);
    const [listId, setListId] = useState('');
    const [connection, setConnection] = useState<'loading' | 'sign-in' | 'connect' | 'ready'>(
        'loading',
    );
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [outcomes, setOutcomes] = useState<TransferOutcome[]>([]);
    const [pending, setPending] = useState<{
        operationId: string;
        listUuid: string;
        items: TransferItem[];
    } | null>(null);

    useEffect(() => {
        try {
            const saved = sessionStorage.getItem(storageKey);
            if (!saved) return;
            sessionStorage.removeItem(storageKey);
            const parsed = draftSchema.safeParse(JSON.parse(saved));
            if (!parsed.success || Date.now() - parsed.data.at > 3_600_000) return;
            setItems(parsed.data.items);
            setSelected(parsed.data.items.map((item) => item.id));
            setOpen(true);
        } catch {
            /* Storage can be unavailable; normal in-page use still works. */
        }
    }, [storageKey]);

    async function loadConnection() {
        setConnection('loading');
        setError('');
        try {
            const status = await getBringStatus();
            if (!status.ok) {
                if (status.code === 'SIGN_IN') setConnection('sign-in');
                else {
                    setError(status.error);
                    setConnection('connect');
                }
                return;
            }
            if (!status.data.connected) {
                setConnection('connect');
                return;
            }
            const result = await getBringLists();
            if (!result.ok) {
                setError(result.error);
                setConnection('connect');
                return;
            }
            setLists(result.data.lists);
            setListId(result.data.defaultListUuid ?? '');
            setConnection('ready');
        } catch {
            setError('Bring! konnte nicht geladen werden.');
            setConnection('connect');
        }
    }
    useEffect(() => {
        if (open) void loadConnection();
    }, [open]);

    function start() {
        const prepared = ingredients.map((ingredient, index) => ({
            id: ingredient.id ?? String(index),
            name: ingredient.name,
            specification: [
                scaleQuantity(
                    ingredient.rawAmount ??
                        (ingredient.amount && ingredient.amount > 0
                            ? String(ingredient.amount)
                            : ''),
                    servings / Math.max(1, originalServings),
                ),
                ingredient.unit,
                ingredient.notes,
            ]
                .filter(Boolean)
                .join(' '),
        }));
        setItems(prepared);
        setSelected(prepared.map((item) => item.id));
        setOutcomes([]);
        setPending(null);
        setError('');
        setOpen(true);
    }
    function preserveDraft() {
        try {
            sessionStorage.setItem(
                storageKey,
                JSON.stringify({
                    at: Date.now(),
                    items: items.filter((item) => selected.includes(item.id)),
                }),
            );
        } catch {
            /* No credentials are ever stored here. */
        }
    }
    async function send() {
        if (busy) return;
        const request = pending ?? {
            operationId: crypto.randomUUID(),
            listUuid: listId,
            items: items.filter((item) => selected.includes(item.id)),
        };
        setPending(request);
        setBusy(true);
        setError('');
        try {
            const result = await transferToBring(request);
            if (!result.ok) {
                setError(result.error);
                return;
            }
            setOutcomes(result.data);
            setSelected(
                result.data.filter((item) => item.status === 'failed').map((item) => item.id),
            );
            setPending(null);
            try {
                sessionStorage.removeItem(storageKey);
            } catch {
                /* optional storage */
            }
        } catch {
            setError(
                'Das Ergebnis ist noch unklar. „Ergebnis prüfen“ fragt denselben Vorgang erneut ab.',
            );
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <Dialog.Root
                open={open}
                onOpenChange={(value) => {
                    if (!busy) setOpen(value);
                }}
            >
                <Dialog.Trigger asChild>
                    <Button type="button" variant="secondary" onClick={start}>
                        <ShoppingCart size={18} />
                        Auf die Einkaufsliste
                    </Button>
                </Dialog.Trigger>
                <Dialog.Portal>
                    <Dialog.Overlay className={dialogOverlay} />
                    <Dialog.Content className={dialogContent}>
                        <div className={stack}>
                            <div
                                className={css({
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '3',
                                })}
                            >
                                <Dialog.Title asChild>
                                    <Heading as="h2" size="md">
                                        Auf die Einkaufsliste
                                    </Heading>
                                </Dialog.Title>
                                <Dialog.Close asChild>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        disabled={busy}
                                        aria-label="Schließen"
                                    >
                                        <X size={20} />
                                    </Button>
                                </Dialog.Close>
                            </div>
                            <Dialog.Description asChild>
                                <Text size="sm" color="muted">
                                    Wähle Zutaten und Mengen für deine Bring!-Liste.
                                </Text>
                            </Dialog.Description>
                            {connection === 'loading' && (
                                <LoadingState>Bring! wird geladen …</LoadingState>
                            )}
                            {connection === 'sign-in' && (
                                <>
                                    <Text>
                                        Melde dich bei KochTakt an, um deine Bring!-Listen zu
                                        nutzen. Deine Auswahl bleibt erhalten.
                                    </Text>
                                    <Link
                                        className={link}
                                        href={`/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`}
                                        onClick={preserveDraft}
                                    >
                                        Anmelden und fortfahren
                                    </Link>
                                </>
                            )}
                            {connection === 'connect' && (
                                <ConnectionCard onConnected={() => void loadConnection()} />
                            )}
                            {connection === 'ready' && (
                                <ListSelect
                                    label="Bring!-Liste"
                                    lists={lists}
                                    value={listId}
                                    disabled={busy || !!pending}
                                    onValueChange={(value) => {
                                        setListId(value);
                                        setOutcomes([]);
                                    }}
                                />
                            )}
                            {connection === 'ready' && lists.length === 0 && (
                                <EmptyState>Lege zuerst eine Liste in Bring! an.</EmptyState>
                            )}
                            <div className={row}>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={busy || !!pending}
                                    onClick={() => setSelected(items.map((item) => item.id))}
                                >
                                    Alle auswählen
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={busy || !!pending}
                                    onClick={() => setSelected([])}
                                >
                                    Auswahl aufheben
                                </Button>
                            </div>
                            <ul className={stack}>
                                {items.map((item) => (
                                    <li
                                        key={item.id}
                                        className={`${stack} ${css({ bg: 'background', border: '1px solid', borderColor: 'border', p: '3', borderRadius: 'xl' })}`}
                                    >
                                        <label
                                            className={`${row} ${css({ minH: '11', fontWeight: '500', cursor: 'pointer', overflowWrap: 'anywhere' })}`}
                                        >
                                            <input
                                                type="checkbox"
                                                className={checkbox}
                                                checked={selected.includes(item.id)}
                                                disabled={busy || !!pending}
                                                onChange={(event) =>
                                                    setSelected((previous) =>
                                                        event.target.checked
                                                            ? [...previous, item.id]
                                                            : previous.filter(
                                                                  (id) => id !== item.id,
                                                              ),
                                                    )
                                                }
                                            />
                                            {item.name}
                                        </label>
                                        <input
                                            className={field}
                                            aria-label={`Menge und Details für ${item.name}`}
                                            maxLength={500}
                                            value={item.specification}
                                            disabled={busy || !!pending}
                                            onChange={(event) =>
                                                setItems((previous) =>
                                                    previous.map((entry) =>
                                                        entry.id === item.id
                                                            ? {
                                                                  ...entry,
                                                                  specification: event.target.value,
                                                              }
                                                            : entry,
                                                    ),
                                                )
                                            }
                                        />
                                    </li>
                                ))}
                            </ul>
                            {items.length > 50 && (
                                <Feedback error>
                                    Bitte übertrage höchstens 50 Zutaten auf einmal.
                                </Feedback>
                            )}
                            {error && <Feedback error>{error}</Feedback>}
                            <TransferResults outcomes={outcomes} />
                            <Button
                                type="button"
                                disabled={
                                    busy ||
                                    connection !== 'ready' ||
                                    !listId ||
                                    selected.length === 0 ||
                                    selected.length > 50
                                }
                                onClick={() => void send()}
                            >
                                {busy
                                    ? 'Wird übertragen …'
                                    : pending
                                      ? 'Ergebnis prüfen'
                                      : `${selected.length} ${selected.length === 1 ? 'Zutat' : 'Zutaten'} hinzufügen`}
                            </Button>
                            {pending && !busy && (
                                <Button
                                    variant="ghost"
                                    type="button"
                                    onClick={() => {
                                        setPending(null);
                                        setError('');
                                    }}
                                >
                                    Auswahl bearbeiten
                                </Button>
                            )}
                            <Text color="muted" size="sm">
                                Bereits vorhandene Artikel bleiben unverändert. Mengen kannst du in
                                der Einkaufsliste bearbeiten.
                            </Text>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </>
    );
}
