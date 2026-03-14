'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type ReactNode } from 'react';

import { GoogleSignInButton, OAuthDivider } from '@app/components/auth/GoogleSignInButton';
import {
    authFormStackClass,
    authInputClass,
    getAuthButtonClass,
} from '@app/components/forms/authStyles';
import { AuthPageLayout } from '@app/components/layouts/AuthPageLayout';
import { credentialsSignIn } from '@app/lib/auth/credentials-session';
import { css } from 'styled-system/css';

function SignInForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const rawCallback = searchParams.get('callbackUrl') ?? '/';
    const callbackUrl =
        rawCallback.startsWith('/') && !rawCallback.startsWith('//') ? rawCallback : '/';
    const urlError = searchParams.get('error');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<ReactNode>(
        urlError === 'OAuthAccountNotLinked'
            ? 'Diese E-Mail ist bereits mit einem anderen Anmeldeverfahren verknüpft.'
            : '',
    );
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await credentialsSignIn(email, password);

            if ('error' in result) {
                switch (result.error) {
                    case 'ACCOUNT_BANNED':
                        router.push('/banned');
                        return;
                    case 'ACCOUNT_INACTIVE':
                        setError('Dein Konto ist noch nicht aktiviert. Bitte prüfe deine E-Mails.');
                        break;
                    default:
                        setError('Ungültige Anmeldedaten.');
                }
            } else {
                router.push(callbackUrl);
                router.refresh();
            }
        } catch {
            setError('Ein Fehler ist aufgetreten');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '3' })}>
            <div
                className={css({
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1',
                })}
            >
                <h1 className={css({ fontSize: '2xl', fontWeight: '800', margin: 0 })}>
                    Willkommen zurück
                </h1>
                <p className={css({ color: 'text.muted', margin: 0, fontSize: 'sm' })}>
                    Melde dich an, um auf deine Rezepte zuzugreifen.
                </p>
            </div>

            <GoogleSignInButton callbackUrl={callbackUrl} />
            <OAuthDivider />

            <form onSubmit={handleSubmit} className={authFormStackClass}>
                <label className={css({ textAlign: 'left', fontWeight: '600', fontSize: 'sm' })}>
                    E-Mail
                    <input
                        name="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="deine@email.de"
                        required
                        className={authInputClass}
                    />
                </label>

                <label className={css({ textAlign: 'left', fontWeight: '600', fontSize: 'sm' })}>
                    Passwort
                    <input
                        name="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className={authInputClass}
                    />
                </label>

                {error && <p className={css({ color: 'red.500', fontSize: 'sm' })}>{error}</p>}

                <button type="submit" disabled={loading} className={getAuthButtonClass(loading)}>
                    {loading ? 'Anmeldung läuft…' : 'Anmelden'}
                </button>
            </form>
        </div>
    );
}

export default function SignInPage() {
    return (
        <AuthPageLayout
            heroTitle="Deine Rezepte warten auf dich"
            heroSubtitle="Melde dich an und greife auf deine angepinnten Rezepte, Favoriten und eigenen Kreationen zu."
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
            <Suspense>
                <SignInForm />
            </Suspense>
        </AuthPageLayout>
    );
}
