'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type ReactNode } from 'react';

import {
    DiscordSignInButton,
    GoogleSignInButton,
    OAuthDivider,
    PasskeySignInButton,
} from '@app/components/auth/OAuthSignInButton';
import {
    authFormStackClass,
    authInputClass,
    getAuthButtonClass,
} from '@app/components/forms/authStyles';
import { useFeatureFlag } from '@app/components/providers/FeatureFlagsProvider';
import { signIn } from '@app/lib/auth-client';

import { css } from 'styled-system/css';

export function SignInForm() {
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
    const showDiscord = useFeatureFlag('discordSignIn');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await signIn.email({
                email,
                password,
                callbackURL: callbackUrl,
            });

            if (result?.error) {
                const code = result.error.code;
                if (code === 'BANNED_USER' || result.error.message?.includes('banned')) {
                    router.push('/banned');
                    return;
                }
                if (code === 'EMAIL_NOT_VERIFIED' || result.error.message?.includes('verified')) {
                    setError('Dein Konto ist noch nicht aktiviert. Bitte prüfe deine E-Mails.');
                } else {
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
            {showDiscord && <DiscordSignInButton callbackUrl={callbackUrl} />}
            <PasskeySignInButton callbackUrl={callbackUrl} />
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
