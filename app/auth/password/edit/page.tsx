'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { PageShell } from '@/components/layouts/PageShell';
import { css } from 'styled-system/css';

const EditPasswordPage = () => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');

        if (!currentPassword || !newPassword || !confirmPassword) {
            setError('Bitte fülle alle Felder aus.');
            return;
        }

        if (newPassword.length < 6) {
            setError('Das neue Passwort muss mindestens 6 Zeichen enthalten.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Die Passwörter stimmen nicht überein.');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/auth/update-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Ein Fehler ist aufgetreten.');
                return;
            }

            setSuccess(true);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            console.error(err);
            setError('Ein Fehler ist aufgetreten.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageShell>
            <section
                className={css({
                    paddingY: { base: '8', md: '12' },
                    display: 'flex',
                    justifyContent: 'center',
                    fontFamily: 'body',
                    color: 'text',
                })}
            >
                <div
                    className={css({
                        background: 'white',
                        borderRadius: '3xl',
                        padding: { base: '8', md: '12' },
                        boxShadow: '0 30px 80px rgba(224,123,83,0.3)',
                        width: '100%',
                        maxWidth: '640px',
                    })}
                >
                    {success ? (
                        <>
                            <p
                                className={css({
                                    fontSize: 'sm',
                                    textTransform: 'uppercase',
                                    color: 'text-muted',
                                })}
                            >
                                Sicherheit
                            </p>
                            <h1
                                className={css({
                                    fontSize: '3xl',
                                    fontWeight: '800',
                                    mt: '2',
                                    mb: '4',
                                    color: 'green.600',
                                })}
                            >
                                Passwort gespeichert
                            </h1>
                            <p className={css({ color: 'text-muted', mb: '6', lineHeight: '1.8' })}>
                                Dein Passwort wurde erfolgreich geändert. Wir empfehlen dir, dich
                                neu anzumelden, um die Änderungen zu übernehmen.
                            </p>
                            <Link
                                href="/auth/signin"
                                className={css({
                                    color: 'primary',
                                    mt: '2',
                                    display: 'inline-block',
                                })}
                            >
                                ← Zurück zur Anmeldung
                            </Link>
                        </>
                    ) : (
                        <>
                            <p
                                className={css({
                                    fontSize: 'sm',
                                    textTransform: 'uppercase',
                                    color: 'text-muted',
                                })}
                            >
                                Sicherheit
                            </p>
                            <h1
                                className={css({
                                    fontSize: '3xl',
                                    fontWeight: '800',
                                    mt: '2',
                                    mb: '4',
                                })}
                            >
                                Passwort ändern
                            </h1>
                            <p className={css({ color: 'text-muted', mb: '8', lineHeight: '1.8' })}>
                                Gib dein aktuelles Passwort ein und wähle ein neues, sicheres
                                Passwort.
                            </p>

                            <form
                                onSubmit={handleSubmit}
                                className={css({ display: 'flex', flexDir: 'column', gap: '4' })}
                            >
                                <label
                                    className={css({
                                        textAlign: 'left',
                                        fontWeight: '600',
                                        fontSize: 'sm',
                                    })}
                                >
                                    Aktuelles Passwort
                                    <input
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className={css({
                                            display: 'block',
                                            width: '100%',
                                            marginTop: '1',
                                            padding: '3',
                                            borderRadius: 'xl',
                                            border: '1px solid rgba(224,123,83,0.4)',
                                            fontSize: 'md',
                                            outline: 'none',
                                            _focus: {
                                                borderColor: '#e07b53',
                                                boxShadow: '0 0 0 3px rgba(224,123,83,0.15)',
                                            },
                                        })}
                                    />
                                </label>

                                <label
                                    className={css({
                                        textAlign: 'left',
                                        fontWeight: '600',
                                        fontSize: 'sm',
                                    })}
                                >
                                    Neues Passwort
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                        className={css({
                                            display: 'block',
                                            width: '100%',
                                            marginTop: '1',
                                            padding: '3',
                                            borderRadius: 'xl',
                                            border: '1px solid rgba(224,123,83,0.4)',
                                            fontSize: 'md',
                                            outline: 'none',
                                            _focus: {
                                                borderColor: '#e07b53',
                                                boxShadow: '0 0 0 3px rgba(224,123,83,0.15)',
                                            },
                                        })}
                                    />
                                </label>

                                <label
                                    className={css({
                                        textAlign: 'left',
                                        fontWeight: '600',
                                        fontSize: 'sm',
                                    })}
                                >
                                    Passwort bestätigen
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                        className={css({
                                            display: 'block',
                                            width: '100%',
                                            marginTop: '1',
                                            padding: '3',
                                            borderRadius: 'xl',
                                            border: '1px solid rgba(224,123,83,0.4)',
                                            fontSize: 'md',
                                            outline: 'none',
                                            _focus: {
                                                borderColor: '#e07b53',
                                                boxShadow: '0 0 0 3px rgba(224,123,83,0.15)',
                                            },
                                        })}
                                    />
                                </label>

                                {error && (
                                    <p className={css({ color: 'red.500', fontSize: 'sm' })}>
                                        {error}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={css({
                                        marginTop: '2',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '2',
                                        px: '6',
                                        py: '3',
                                        borderRadius: 'full',
                                        fontFamily: 'body',
                                        fontWeight: '600',
                                        fontSize: 'md',
                                        color: 'white',
                                        background:
                                            'linear-gradient(135deg, #e07b53 0%, #f8b500 100%)',
                                        border: 'none',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        opacity: loading ? 0.7 : 1,
                                        transition: 'transform 150ms ease, box-shadow 150ms ease',
                                        _hover: loading
                                            ? {}
                                            : {
                                                  transform: 'translateY(-1px)',
                                                  boxShadow: '0 10px 30px rgba(224,123,83,0.35)',
                                              },
                                    })}
                                >
                                    {loading ? 'Speichern...' : 'Passwort ändern'}
                                </button>
                            </form>

                            <Link
                                href="/profile"
                                className={css({
                                    display: 'inline-block',
                                    marginTop: '4',
                                    color: 'text-muted',
                                    textDecoration: 'none',
                                    _hover: { color: '#e07b53' },
                                })}
                            >
                                ← Zurück zum Profil
                            </Link>
                        </>
                    )}
                </div>
            </section>
        </PageShell>
    );
};

export default EditPasswordPage;
