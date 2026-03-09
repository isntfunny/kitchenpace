'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { FormEvent } from 'react';

import {
    authFormStackClass,
    authInputClass,
    getAuthButtonClass,
} from '@app/components/forms/authStyles';
import { AuthPageLayout } from '@app/components/layouts/AuthPageLayout';
import { css } from 'styled-system/css';

export default function ResendActivationPage() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/resend-activation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.message || 'Ein Fehler ist aufgetreten');
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
            heroTitle="Konto aktivieren"
            heroSubtitle="Hat der Aktivierungslink nicht funktioniert? Fordere einen neuen an."
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
                        <h1 className={css({ fontSize: '2xl', fontWeight: '800', margin: 0 })}>
                            E-Mail gesendet!
                        </h1>
                        <p
                            className={css({
                                color: 'foreground.muted',
                                margin: 0,
                                lineHeight: '1.6',
                            })}
                        >
                            Wir haben einen neuen Aktivierungslink an deine E-Mail-Adresse gesendet.
                            Überprüfe auch den Spam-Ordner.
                        </p>
                    </div>
                ) : (
                    <>
                        <div
                            className={css({
                                textAlign: 'left',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1',
                            })}
                        >
                            <h1 className={css({ fontSize: '2xl', fontWeight: '800', margin: 0 })}>
                                Neuen Link anfordern
                            </h1>
                            <p
                                className={css({
                                    color: 'foreground.muted',
                                    margin: 0,
                                    fontSize: 'sm',
                                })}
                            >
                                Gib deine E-Mail ein, um einen neuen Aktivierungslink zu erhalten.
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
                                {loading ? 'E-Mail wird gesendet…' : 'Link anfordern'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </AuthPageLayout>
    );
}
