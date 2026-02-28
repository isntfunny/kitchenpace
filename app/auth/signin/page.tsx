'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useState } from 'react';

import {
    authFormStackClass,
    authInputClass,
    getAuthButtonClass,
} from '@/components/forms/authStyles';
import { AuthPageLayout } from '@/components/layouts/AuthPageLayout';
import { css } from 'styled-system/css';

export default function SignInPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError('Ungültige E-Mail oder Passwort');
            } else {
                router.push('/');
                router.refresh();
            }
        } catch {
            setError('Ein Fehler ist aufgetreten');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthPageLayout
            heroTitle="Bleib in der Flow"
            heroSubtitle="Deine persönlichen Empfehlungen, Timer und Favoriten sind nur einen Login entfernt."
            formFooter={
                <>
                    <Link
                        href="/auth/forgot-password"
                        className={css({
                            color: 'text.muted',
                            textDecoration: 'none',
                            _hover: { color: 'accent' },
                        })}
                    >
                        Passwort vergessen?
                    </Link>
                    <Link
                        href="/auth/register"
                        className={css({
                            color: 'text.muted',
                            textDecoration: 'none',
                            _hover: { color: 'accent' },
                        })}
                    >
                        Noch kein Konto?{' '}
                        <span className={css({ color: 'accent', fontWeight: '600' })}>
                            Registrieren
                        </span>
                    </Link>
                </>
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
                        Konto-Login
                    </p>
                    <h1 className={css({ fontSize: '3xl', fontWeight: '800', margin: 0 })}>
                        Willkommen zurück
                    </h1>
                    <p className={css({ color: 'foreground.muted', margin: 0 })}>
                        Melde dich an, um deine persönlichen KüchenTakt-Erlebnisse zu laden.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className={authFormStackClass}>
                    <label
                        className={css({ textAlign: 'left', fontWeight: '600', fontSize: 'sm' })}
                    >
                        E-Mail
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
                        Passwort
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
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
                        {loading ? 'Anmeldung läuft…' : 'Anmelden'}
                    </button>
                </form>
            </div>
        </AuthPageLayout>
    );
}
