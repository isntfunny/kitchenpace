'use client';

import { Fingerprint, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState, useTransition } from 'react';

import { Button } from '@app/components/atoms/Button';
import { Heading, Text } from '@app/components/atoms/Typography';
import { authClient } from '@app/lib/auth-client';

import { css } from 'styled-system/css';

interface PasskeyInfo {
    id: string;
    name: string | null;
    createdAt: Date;
}

function relativeTime(date: Date): string {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Gerade eben';
    if (minutes < 60) return `Vor ${minutes} Min.`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Vor ${hours} Std.`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Gestern';
    return `Vor ${days} Tagen`;
}

export function PasskeySettingsCard() {
    const [passkeys, setPasskeys] = useState<PasskeyInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);
    const [addingName, setAddingName] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const fetchPasskeys = useCallback(async () => {
        try {
            const result = await authClient.passkey.listUserPasskeys();
            if (result?.data) {
                setPasskeys(
                    result.data.map((p) => ({
                        id: p.id,
                        name: p.name ?? null,
                        createdAt: new Date(p.createdAt),
                    })),
                );
            }
            setFetchError(false);
        } catch {
            setFetchError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPasskeys();
    }, [fetchPasskeys]);

    const handleAdd = () => {
        setAddError(null);
        startTransition(async () => {
            try {
                const result = await authClient.passkey.addPasskey({
                    name: addingName.trim() || undefined,
                });
                if (result?.error) {
                    setAddError('Passkey konnte nicht hinzugefügt werden.');
                    return;
                }
                setAddingName('');
                setShowAddForm(false);
                await fetchPasskeys();
            } catch {
                setAddError('Passkey konnte nicht hinzugefügt werden.');
            }
        });
    };

    const handleDelete = (id: string) => {
        setDeletingId(id);
        startTransition(async () => {
            try {
                await authClient.passkey.deletePasskey({ id });
                setPasskeys((prev) => prev.filter((p) => p.id !== id));
            } catch {
                // silently fail
            } finally {
                setDeletingId(null);
            }
        });
    };

    return (
        <div
            className={css({
                p: { base: '4', md: '5' },
                borderRadius: '2xl',
                bg: 'surface',
                boxShadow: 'shadow.medium',
            })}
        >
            <div className={css({ mb: '5' })}>
                <div
                    className={css({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3',
                        mb: '3',
                    })}
                >
                    <div
                        className={css({
                            w: '10',
                            h: '10',
                            borderRadius: 'lg',
                            bg: 'primary',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                        })}
                    >
                        <Fingerprint size={20} />
                    </div>
                    <Heading as="h2" size="lg">
                        Passkeys
                    </Heading>
                </div>
                <Text color="muted" size="sm">
                    Melde dich schnell und sicher mit biometrischen Daten oder einem
                    Sicherheitsschlüssel an.
                </Text>
            </div>

            {loading ? (
                <Text color="muted" size="sm">
                    Passkeys werden geladen...
                </Text>
            ) : fetchError ? (
                <Text size="sm" className={css({ color: 'red.600' })}>
                    Passkeys konnten nicht geladen werden.
                </Text>
            ) : passkeys.length === 0 && !showAddForm ? (
                <Text color="muted" size="sm">
                    Noch keine Passkeys registriert.
                </Text>
            ) : (
                <div className={css({ display: 'flex', flexDir: 'column', gap: '3' })}>
                    {passkeys.map((passkey) => {
                        const isDeleting = deletingId === passkey.id;

                        return (
                            <div
                                key={passkey.id}
                                className={css({
                                    p: '4',
                                    borderRadius: 'xl',
                                    border: '1px solid',
                                    borderColor: 'border',
                                    bg: 'background',
                                    display: 'flex',
                                    flexDir: { base: 'column', sm: 'row' },
                                    gap: '3',
                                    alignItems: { base: 'flex-start', sm: 'center' },
                                    justifyContent: 'space-between',
                                })}
                            >
                                <div
                                    className={css({
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3',
                                        flex: 1,
                                    })}
                                >
                                    <Fingerprint
                                        size={20}
                                        className={css({
                                            color: 'foreground.muted',
                                            flexShrink: 0,
                                        })}
                                    />
                                    <div>
                                        <Text className={css({ fontWeight: '600' })}>
                                            {passkey.name || 'Passkey'}
                                        </Text>
                                        <Text size="sm" color="muted">
                                            {relativeTime(passkey.createdAt)}
                                        </Text>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleDelete(passkey.id)}
                                    disabled={isDeleting}
                                    className={css({
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1.5',
                                        px: '3',
                                        py: '1.5',
                                        borderRadius: 'lg',
                                        border: '1px solid',
                                        borderColor: 'red.300',
                                        bg: 'transparent',
                                        color: 'red.600',
                                        fontSize: 'sm',
                                        fontWeight: '500',
                                        fontFamily: 'body',
                                        cursor: isDeleting ? 'not-allowed' : 'pointer',
                                        opacity: isDeleting ? 0.6 : 1,
                                        transition: 'all 150ms ease',
                                        flexShrink: 0,
                                        _hover: isDeleting
                                            ? {}
                                            : {
                                                  bg: 'red.50',
                                                  borderColor: 'red.400',
                                              },
                                    })}
                                >
                                    <Trash2 size={14} />
                                    {isDeleting ? 'Wird gelöscht...' : 'Löschen'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {showAddForm && (
                <div
                    className={css({
                        mt: '4',
                        p: '4',
                        borderRadius: 'xl',
                        border: '1px solid',
                        borderColor: 'border',
                        bg: 'background',
                        display: 'flex',
                        flexDir: 'column',
                        gap: '3',
                    })}
                >
                    <label className={css({ fontWeight: '600', fontSize: 'sm' })}>
                        Name (optional)
                        <input
                            type="text"
                            value={addingName}
                            onChange={(e) => setAddingName(e.target.value)}
                            placeholder="z.B. MacBook, iPhone"
                            className={css({
                                display: 'block',
                                width: '100%',
                                mt: '1',
                                p: '3',
                                borderRadius: 'xl',
                                border: '1px solid',
                                borderColor: 'border.muted',
                                fontSize: 'md',
                                background: 'surface',
                                outline: 'none',
                                transition: 'border-color 150ms ease, box-shadow 150ms ease',
                                _focus: {
                                    borderColor: 'accent',
                                    boxShadow: {
                                        base: '0 0 0 4px rgba(224,123,83,0.18)',
                                        _dark: '0 0 0 4px rgba(240,144,112,0.2)',
                                    },
                                },
                            })}
                        />
                    </label>
                    {addError && (
                        <Text size="sm" className={css({ color: 'red.600' })}>
                            {addError}
                        </Text>
                    )}
                    <div className={css({ display: 'flex', gap: '2' })}>
                        <Button
                            type="button"
                            variant="primary"
                            onClick={handleAdd}
                            disabled={isPending}
                        >
                            <Plus size={16} />
                            {isPending ? 'Wird hinzugefügt...' : 'Passkey hinzufügen'}
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                setShowAddForm(false);
                                setAddingName('');
                                setAddError(null);
                            }}
                        >
                            Abbrechen
                        </Button>
                    </div>
                </div>
            )}

            {!showAddForm && !loading && (
                <div className={css({ mt: '5' })}>
                    <Button type="button" variant="secondary" onClick={() => setShowAddForm(true)}>
                        <Plus size={18} />
                        Passkey hinzufügen
                    </Button>
                </div>
            )}
        </div>
    );
}
