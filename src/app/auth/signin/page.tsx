'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Suspense, useState, type ReactNode } from 'react';

import {
    authFormStackClass,
    authInputClass,
    getAuthButtonClass,
} from '@app/components/forms/authStyles';
import { AuthPageLayout } from '@app/components/layouts/AuthPageLayout';
import { css } from 'styled-system/css';

const DISCORD_BLUE = '#5865F2';

function DiscordIcon({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
    );
}

function SignInForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') ?? '/';
    const urlError = searchParams.get('error');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<ReactNode>(
        urlError === 'OAuthAccountNotLinked'
            ? 'Diese E-Mail ist bereits mit einem anderen Anmeldeverfahren verknüpft.'
            : '',
    );
    const [loading, setLoading] = useState(false);
    const [discordLoading, setDiscordLoading] = useState(false);

    const hasDiscord = process.env.NEXT_PUBLIC_DISCORD_ENABLED === '1';

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
                setError('Ungültige Anmeldedaten oder Konto nicht aktiviert.');
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

    const handleDiscordSignIn = () => {
        setDiscordLoading(true);
        signIn('discord', { callbackUrl });
    };

    return (
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
                    Deine Rezepte, Favoriten und Pins — alles an einem Ort.
                </p>
            </div>

            {hasDiscord && (
                <>
                    <button
                        type="button"
                        onClick={handleDiscordSignIn}
                        disabled={discordLoading}
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '2.5',
                            width: '100%',
                            padding: '3',
                            borderRadius: 'xl',
                            border: 'none',
                            fontFamily: 'body',
                            fontSize: 'md',
                            fontWeight: '600',
                            color: 'white',
                            background: DISCORD_BLUE,
                            cursor: discordLoading ? 'not-allowed' : 'pointer',
                            opacity: discordLoading ? 0.7 : 1,
                            transition: 'all 150ms ease',
                            _hover: discordLoading
                                ? {}
                                : {
                                      filter: 'brightness(1.1)',
                                      transform: 'translateY(-1px)',
                                      boxShadow: `0 8px 24px ${DISCORD_BLUE}44`,
                                  },
                        })}
                    >
                        <DiscordIcon />
                        {discordLoading ? 'Weiterleitung…' : 'Mit Discord anmelden'}
                    </button>

                    <div
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3',
                            marginY: '1',
                        })}
                    >
                        <div
                            className={css({
                                flex: 1,
                                height: '1px',
                                background: 'border.muted',
                            })}
                        />
                        <span
                            className={css({
                                fontSize: 'xs',
                                fontWeight: '600',
                                color: 'foreground.muted',
                                textTransform: 'uppercase',
                                letterSpacing: 'wide',
                            })}
                        >
                            oder
                        </span>
                        <div
                            className={css({
                                flex: 1,
                                height: '1px',
                                background: 'border.muted',
                            })}
                        />
                    </div>
                </>
            )}

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
