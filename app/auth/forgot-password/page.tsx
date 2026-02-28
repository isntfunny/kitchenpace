'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { FormEvent } from 'react';

import {
    authFormStackClass,
    authInputClass,
    getAuthButtonClass,
} from '@/components/forms/authStyles';
import { AuthPageLayout } from '@/components/layouts/AuthPageLayout';
import { css } from 'styled-system/css';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Ein Fehler ist aufgetreten');
                return;
            }

            setSuccess(true);
        } catch {
            setError('Ein Fehler ist aufgetreten');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthPageLayout
            heroTitle="Passwort sichern"
            heroSubtitle="Gib deine E-Mail ein und wir senden dir einen zeitlich begrenzten Link zum Zurücksetzen."
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
                    <div
                        className={css({
                            textAlign: 'left',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '3',
                        })}
                    >
                        <h1 className={css({ fontSize: '3xl', fontWeight: '800', margin: 0 })}>
                            E-Mail gesendet!
                        </h1>
                        <p
                            className={css({
                                color: 'foreground.muted',
                                margin: 0,
                                lineHeight: '1.6',
                            })}
                        >
                            Wenn es ein Konto mit dieser Adresse gibt, findest du gleich einen Link
                            zum Zurücksetzen in deinem Postfach. Überprüfe auch den Spam-Ordner.
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
                                Passwort vergessen
                            </p>
                            <h1 className={css({ fontSize: '3xl', fontWeight: '800', margin: 0 })}>
                                Passwort zurücksetzen
                            </h1>
                            <p className={css({ color: 'foreground.muted', margin: 0 })}>
                                Wir senden dir einen Link, mit dem du ein neues Passwort festlegen
                                kannst.
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
                                E-Mail-Adresse
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="deine@email.de"
                                    required
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
                                {loading ? 'Link wird gesendet…' : 'Link anfordern'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </AuthPageLayout>
    );
}
