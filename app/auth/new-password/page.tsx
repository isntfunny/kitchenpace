'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { PageShell } from '@/components/layouts/PageShell';
import { css } from 'styled-system/css';

export default function NewPasswordPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');

        if (!token) {
            setError('Ungültiger Link');
            return;
        }

        if (password.length < 6) {
            setError('Das Passwort muss mindestens 6 Zeichen lang sein');
            return;
        }

        if (password !== confirmPassword) {
            setError('Die Passwörter stimmen nicht überein');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Ein Fehler ist aufgetreten');
                return;
            }

            setSuccess(true);
            setTimeout(() => {
                router.push('/auth/signin');
            }, 2000);
        } catch {
            setError('Ein Fehler ist aufgetreten');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
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
                            borderRadius: '2xl',
                            padding: { base: '8', md: '10' },
                            boxShadow: '0 22px 60px rgba(0,0,0,0.1)',
                            width: '100%',
                            maxWidth: '640px',
                            textAlign: 'center',
                        })}
                    >
                        <h1 className={css({ fontSize: '3xl', fontWeight: '700', mb: '4' })}>
                            Ungültiger Link
                        </h1>
                        <p className={css({ color: 'text-muted', mb: '6' })}>
                            Dieser Link ist ungültig oder abgelaufen.
                        </p>
                        <Link
                            href="/auth/forgot-password"
                            className={css({ color: 'primary', textDecoration: 'underline' })}
                        >
                            Neuen Link anfordern
                        </Link>
                    </div>
                </section>
            </PageShell>
        );
    }

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
                        borderRadius: '2xl',
                        padding: { base: '8', md: '10' },
                        boxShadow: '0 22px 60px rgba(0,0,0,0.1)',
                        width: '100%',
                        maxWidth: '640px',
                    })}
                >
                    {success ? (
                        <>
                            <h1
                                className={css({
                                    fontSize: '3xl',
                                    fontWeight: '700',
                                    mb: '4',
                                    color: 'green.600',
                                })}
                            >
                                Passwort zurückgesetzt!
                            </h1>
                            <p className={css({ color: 'text-muted', mb: '6' })}>
                                Dein Passwort wurde erfolgreich zurückgesetzt. Du wirst in Kürze zur
                                Anmeldung weitergeleitet.
                            </p>
                            <Link
                                href="/auth/signin"
                                className={css({ color: 'primary', textDecoration: 'underline' })}
                            >
                                Jetzt anmelden
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
                                Passwort zurücksetzen
                            </p>
                            <h1
                                className={css({
                                    fontSize: '3xl',
                                    fontWeight: '700',
                                    mt: '2',
                                    mb: '4',
                                })}
                            >
                                Neues Passwort festlegen
                            </h1>
                            <p className={css({ color: 'text-muted', mb: '6', lineHeight: '1.7' })}>
                                Wähle ein neues, sicheres Passwort für dein Konto.
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
                                    Neues Passwort
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
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
                                    {loading ? 'Wird gespeichert...' : 'Passwort festlegen'}
                                </button>
                            </form>

                            <Link
                                href="/auth/signin"
                                className={css({
                                    display: 'inline-block',
                                    marginTop: '4',
                                    color: 'text-muted',
                                    textDecoration: 'none',
                                    _hover: { color: '#e07b53' },
                                })}
                            >
                                ← Zurück zur Anmeldung
                            </Link>
                        </>
                    )}
                </div>
            </section>
        </PageShell>
    );
}
