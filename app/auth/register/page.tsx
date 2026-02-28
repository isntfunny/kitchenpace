'use client';

import Link from 'next/link';
import { useState } from 'react';

import {
    authFormStackClass,
    authInputClass,
    getAuthButtonClass,
} from '@/components/forms/authStyles';
import { AuthPageLayout } from '@/components/layouts/AuthPageLayout';
import { useUtmParams } from '@/lib/hooks/useUtmParams';
import { css } from 'styled-system/css';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const utmParams = useUtmParams();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwörter stimmen nicht überein');
            return;
        }

        if (password.length < 8) {
            setError('Passwort muss mindestens 8 Zeichen lang sein');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, name, password, ...utmParams }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.message || 'Ein Fehler ist aufgetreten');
                return;
            }

            setSuccessMessage(
                data.message || 'Registrierung erfolgreich – bitte prüfe deine E-Mails.',
            );
            setEmail('');
            setName('');
            setPassword('');
            setConfirmPassword('');
        } catch {
            setError('Ein Fehler ist aufgetreten');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthPageLayout
            heroTitle="Werde Teil der Community"
            heroSubtitle="Erstelle dein Profil, um Workflows, Einkaufslisten und Tipps genau auf dich zuzuschneiden."
            formFooter={
                <Link
                    href="/auth/signin"
                    className={css({
                        color: 'text.muted',
                        textDecoration: 'none',
                        _hover: { color: 'accent' },
                    })}
                >
                    Bereits ein Konto?{' '}
                    <span className={css({ color: 'accent', fontWeight: '600' })}>Anmelden</span>
                </Link>
            }
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
                    <p
                        className={css({
                            textTransform: 'uppercase',
                            letterSpacing: 'wide',
                            fontSize: 'xs',
                            fontWeight: '700',
                            color: 'foreground.muted',
                        })}
                    >
                        Neues Konto
                    </p>
                    <h1 className={css({ fontSize: '3xl', fontWeight: '800', margin: 0 })}>
                        Erstelle dein Küchenprofil
                    </h1>
                    <p className={css({ color: 'foreground.muted', margin: 0 })}>
                        Registriere dich und nutze persönliche Empfehlungen, Filter und
                        Einkaufslisten.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className={authFormStackClass}>
                    <label
                        className={css({ textAlign: 'left', fontWeight: '600', fontSize: 'sm' })}
                    >
                        Name (optional)
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Dein Name"
                            className={authInputClass}
                        />
                    </label>

                    <label
                        className={css({ textAlign: 'left', fontWeight: '600', fontSize: 'sm' })}
                    >
                        E-Mail *
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="deine@email.de"
                            required
                            className={authInputClass}
                        />
                    </label>

                    <label
                        className={css({ textAlign: 'left', fontWeight: '600', fontSize: 'sm' })}
                    >
                        Passwort *
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Mindestens 8 Zeichen"
                            required
                            minLength={8}
                            className={authInputClass}
                        />
                    </label>

                    <label
                        className={css({ textAlign: 'left', fontWeight: '600', fontSize: 'sm' })}
                    >
                        Passwort bestätigen *
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Passwort wiederholen"
                            required
                            className={authInputClass}
                        />
                    </label>

                    {error && <p className={css({ color: 'red.500', fontSize: 'sm' })}>{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className={getAuthButtonClass(loading)}
                    >
                        {loading ? 'Registrierung läuft…' : 'Jetzt registrieren'}
                    </button>

                    {successMessage && (
                        <p className={css({ color: 'green.600', fontSize: 'sm' })}>
                            {successMessage}
                        </p>
                    )}
                </form>
            </div>
        </AuthPageLayout>
    );
}
