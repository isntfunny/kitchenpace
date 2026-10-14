'use client';
import Link from 'next/link';
import { useState, useTransition } from 'react';

import { Button } from '@app/components/atoms/Button';
import { SCOPES, SCOPE_LABELS, type Scope } from '@app/lib/api/permissions';

import { css } from 'styled-system/css';

import { createApiKey, listApiKeys, renameApiKey, revokeApiKey } from './actions';

type Keys = Awaited<ReturnType<typeof listApiKeys>>;
const card = css({
    bg: 'surface',
    fontFamily: 'body',
    p: '5',
    borderRadius: 'xl',
    display: 'flex',
    flexDir: 'column',
    gap: '4',
});
const inputStyle = css({
    bg: 'background',
    color: 'text',
    border: '1px solid',
    borderColor: 'border',
    borderRadius: 'md',
    p: '2',
    width: '100%',
});
const formatDate = (value: Date | null) =>
    value ? new Date(value).toLocaleDateString('de-DE') : 'Noch nie';
export function ApiKeysClient({ initialKeys }: { initialKeys: Keys }) {
    const [keys, setKeys] = useState(initialKeys);
    const [name, setName] = useState('');
    const [days, setDays] = useState(90);
    const [scopes, setScopes] = useState<Scope[]>(['recipes:read']);
    const [secret, setSecret] = useState<string | null>(null);
    const [message, setMessage] = useState('');
    const [pending, startTransition] = useTransition();
    const [editing, setEditing] = useState<string | null>(null);
    const [newName, setNewName] = useState('');
    const [revoking, setRevoking] = useState<string | null>(null);
    function run(action: () => Promise<void>) {
        setMessage('');
        startTransition(async () => {
            try {
                await action();
                setKeys(await listApiKeys());
            } catch {
                setMessage('Die Aktion konnte nicht abgeschlossen werden. Bitte erneut versuchen.');
            }
        });
    }
    return (
        <>
            <section className={card}>
                <h1 className={css({ fontSize: '2xl', fontFamily: 'heading' })}>
                    API & Integrationen
                </h1>
                <p>
                    Verbinde eigene Skripte und Anwendungen mit KüchenTakt. Jeder Schlüssel erhält
                    nur die von dir gewählten Rechte.
                </p>
                <Link href="/developers/api">Dokumentation und Beispiele öffnen →</Link>
                <p role="status">{message}</p>
                {secret && (
                    <div
                        className={css({
                            p: '4',
                            border: '1px solid',
                            borderColor: 'primary',
                            borderRadius: 'md',
                        })}
                    >
                        <strong>
                            Jetzt sicher kopieren – dieser Schlüssel wird nur einmal angezeigt.
                        </strong>
                        <code
                            className={css({ display: 'block', overflowWrap: 'anywhere', my: '3' })}
                        >
                            {secret}
                        </code>
                        <Button
                            onClick={() => {
                                navigator.clipboard
                                    .writeText(secret)
                                    .then(() => setMessage('Schlüssel kopiert.'))
                                    .catch(() =>
                                        setMessage('Bitte den Schlüssel manuell kopieren.'),
                                    );
                            }}
                        >
                            Kopieren
                        </Button>{' '}
                        <Button variant="secondary" onClick={() => setSecret(null)}>
                            Schlüssel ausblenden
                        </Button>
                    </div>
                )}
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        run(async () => {
                            const result = await createApiKey({ name, days, scopes });
                            setSecret(result.key);
                            setName('');
                        });
                    }}
                    className={css({ display: 'flex', flexDir: 'column', gap: '4' })}
                >
                    <label>
                        Name
                        <input
                            className={inputStyle}
                            required
                            maxLength={60}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Zum Beispiel Home Assistant"
                        />
                    </label>
                    <label>
                        Gültigkeit
                        <select
                            className={inputStyle}
                            value={days}
                            onChange={(e) => setDays(Number(e.target.value))}
                        >
                            <option value={30}>30 Tage</option>
                            <option value={90}>90 Tage</option>
                            <option value={365}>1 Jahr</option>
                        </select>
                    </label>
                    <fieldset className={css({ display: 'flex', flexDir: 'column', gap: '2' })}>
                        <legend>Berechtigungen</legend>
                        {SCOPES.map((scope) => (
                            <label key={scope}>
                                <input
                                    type="checkbox"
                                    checked={scopes.includes(scope)}
                                    onChange={(e) =>
                                        setScopes((current) =>
                                            e.target.checked
                                                ? [...current, scope]
                                                : current.filter((s) => s !== scope),
                                        )
                                    }
                                />{' '}
                                {SCOPE_LABELS[scope]}
                            </label>
                        ))}
                    </fieldset>
                    <p className={css({ fontSize: 'sm', color: 'text.muted' })}>
                        KI-Importe bleiben private Entwürfe. Es gelten 10 Importe pro Tag und
                        höchstens 2 offene Aufträge. „Als gekocht“ erzeugt keine öffentliche
                        Aktivitätsmeldung.
                    </p>
                    <Button
                        disabled={pending || scopes.length === 0 || Boolean(secret)}
                        type="submit"
                    >
                        Schlüssel erstellen
                    </Button>
                </form>
            </section>
            <section className={card}>
                <h2 className={css({ fontSize: 'xl' })}>Deine Schlüssel</h2>
                {!keys.length && <p>Du hast noch keine API-Schlüssel erstellt.</p>}
                {keys.map((key) => (
                    <article
                        key={key.id}
                        className={css({
                            py: '3',
                            borderTop: '1px solid',
                            borderColor: 'border',
                            display: 'flex',
                            flexDir: 'column',
                            gap: '2',
                        })}
                    >
                        <strong>{key.name}</strong>
                        <code>{key.start}…</code>
                        <p>
                            Erstellt: {formatDate(key.createdAt)} · Läuft ab:{' '}
                            {formatDate(key.expiresAt)} · Zuletzt genutzt:{' '}
                            {formatDate(key.lastRequest)}
                        </p>
                        <p className={css({ fontSize: 'sm' })}>
                            {Object.entries(
                                JSON.parse(key.permissions ?? '{}') as Record<string, string[]>,
                            )
                                .flatMap(([resource, actions]) =>
                                    actions.map(
                                        (action) =>
                                            SCOPE_LABELS[`${resource}:${action}` as Scope] ??
                                            `${resource}:${action}`,
                                    ),
                                )
                                .join(' · ')}
                        </p>
                        {editing === key.id ? (
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    run(async () => {
                                        await renameApiKey(key.id, newName);
                                        setEditing(null);
                                    });
                                }}
                            >
                                <label>
                                    Neuer Name
                                    <input
                                        className={inputStyle}
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        required
                                        maxLength={60}
                                    />
                                </label>
                                <Button disabled={pending}>Speichern</Button>
                            </form>
                        ) : (
                            <Button
                                variant="secondary"
                                disabled={pending}
                                onClick={() => {
                                    setEditing(key.id);
                                    setNewName(key.name ?? '');
                                }}
                            >
                                Umbenennen
                            </Button>
                        )}
                        {revoking === key.id ? (
                            <div>
                                <p>Die verbundene Anwendung verliert sofort den Zugriff.</p>
                                <Button
                                    disabled={pending}
                                    onClick={() =>
                                        run(async () => {
                                            await revokeApiKey(key.id);
                                            setRevoking(null);
                                            setSecret(null);
                                        })
                                    }
                                >
                                    Jetzt widerrufen
                                </Button>{' '}
                                <Button variant="ghost" onClick={() => setRevoking(null)}>
                                    Abbrechen
                                </Button>
                            </div>
                        ) : (
                            <Button
                                variant="ghost"
                                disabled={pending}
                                onClick={() => setRevoking(key.id)}
                            >
                                Widerrufen
                            </Button>
                        )}
                    </article>
                ))}
            </section>
        </>
    );
}
