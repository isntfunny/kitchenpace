'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import type { FormEvent } from 'react';

import {
    authFormStackClass,
    authInputClass,
    getAuthButtonClass,
} from '@/components/forms/authStyles';
import { AuthPageLayout } from '@/components/layouts/AuthPageLayout';
import { PageShell } from '@/components/layouts/PageShell';
import { css } from 'styled-system/css';

function NewPasswordForm() {
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
            <AuthPageLayout
                heroTitle="Sicherheitslink abgelaufen"
                heroSubtitle="Fordere einfach einen neuen Link an, um das Passwort neu zu vergeben."
            >
                <div className={css({ display: 'flex', flexDirection: 'column', gap: '3' })}>
                    <div
                        className={css({
                            textAlign: 'left',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2',
                        })}
                    >
                        <h1 className={css({ fontSize: '3xl', fontWeight: '800', margin: 0 })}>
                            Ungültiger Link
                        </h1>
                        <p className={css({ color: 'foreground.muted', margin: 0 })}>
                            Der Link wurde bereits benutzt oder ist abgelaufen. Fordere einen neuen
                            Link an.
                        </p>
                    </div>
                    <Link
                        href="/auth/forgot-password"
                        className={css({
                            color: 'accent',
                            fontWeight: '600',
                            textDecoration: 'none',
                        })}
                    >
                        Neuen Link anfordern
                    </Link>
                </div>
            </AuthPageLayout>
        );
    }

    return (
        <AuthPageLayout
            heroTitle="Neues Passwort festlegen"
            heroSubtitle="Wähle ein sicheres Passwort und sichere deinen Flow. Wir leiten dich danach automatisch weiter."
            formFooter={
                <Link
                    href="/auth/signin"
                    className={css({
                        color: 'text.muted',
                        textDecoration: 'none',
                        _hover: { color: 'accent' },
                    })}
                >
                    Zurück zur Anmeldung
                </Link>
            }
        >
            <div className={css({ display: 'flex', flexDirection: 'column', gap: '3' })}>
                {success ? (
                    <div className={css({ display: 'flex', flexDirection: 'column', gap: '3' })}>
                        <h1 className={css({ fontSize: '3xl', fontWeight: '800', margin: 0 })}>
                            Passwort zurückgesetzt!
                        </h1>
                        <p className={css({ color: 'foreground.muted', margin: 0 })}>
                            Dein Passwort wurde gespeichert. Wir leiten dich gleich zur Anmeldung
                            weiter.
                        </p>
                    </div>
                ) : (
                    <>
                        <div
                            className={css({
                                textAlign: 'left',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2',
                            })}
                        >
                            <p
                                className={css({
                                    textTransform: 'uppercase',
                                    letterSpacing: 'wide',
                                    fontSize: 'xs',
                                    fontWeight: '700',
                                    color: 'foreground.muted',
                                })}
                            >
                                Neu vergeben
                            </p>
                            <h1 className={css({ fontSize: '3xl', fontWeight: '800', margin: 0 })}>
                                Neues Passwort anlegen
                            </h1>
                            <p className={css({ color: 'foreground.muted', margin: 0 })}>
                                Wähle ein sicheres Passwort und bestätige es im zweiten Feld.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className={authFormStackClass}>
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
                                    className={authInputClass}
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
                                    className={authInputClass}
                                />
                            </label>

                            {error && (
                                <p className={css({ color: 'red.500', fontSize: 'sm' })}>{error}</p>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className={getAuthButtonClass(loading)}
                            >
                                {loading ? 'Speichert…' : 'Passwort festlegen'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </AuthPageLayout>
    );
}

export default function NewPasswordPage() {
    return (
        <Suspense
            fallback={
                <PageShell>
                    <div
                        className={css({
                            paddingY: { base: '8', md: '12' },
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            minHeight: '50vh',
                        })}
                    >
                        <div
                            className={css({
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                border: '3px solid',
                                borderColor: 'rgba(224,123,83,0.3)',
                                borderTopColor: '#e07b53',
                                animation: 'spin 1s linear infinite',
                            })}
                        />
                    </div>
                </PageShell>
            }
        >
            <NewPasswordForm />
        </Suspense>
    );
}
