'use client';

import { Turnstile } from '@marsidev/react-turnstile';
import { Mail } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import {
    DiscordSignInButton,
    GoogleSignInButton,
    OAuthDivider,
} from '@app/components/auth/OAuthSignInButton';
import {
    authFormStackClass,
    authInputClass,
    getAuthButtonClass,
} from '@app/components/forms/authStyles';
import { AuthPageLayout } from '@app/components/layouts/AuthPageLayout';
import { useFeatureFlag } from '@app/components/providers/FeatureFlagsProvider';
import { useUtmParams } from '@app/lib/hooks/useUtmParams';
import { PALETTE } from '@app/lib/palette';

import { css } from 'styled-system/css';

const MAX_NICKNAME_LENGTH = 40;

function RegistrationSuccess({ email }: { email: string }) {
    return (
        <div
            className={css({
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '4',
                paddingY: '4',
            })}
        >
            {/* Icon circle */}
            <div
                className={css({
                    width: '72px',
                    height: '72px',
                    borderRadius: 'full',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: {
                        base: '0 12px 32px rgba(224,123,83,0.35)',
                        _dark: '0 12px 32px rgba(224,123,83,0.25)',
                    },
                })}
                style={{
                    background: `linear-gradient(135deg, ${PALETTE.orange}, ${PALETTE.gold})`,
                }}
            >
                <Mail size={30} color="#fff6ec" />
            </div>

            <div className={css({ display: 'flex', flexDirection: 'column', gap: '1' })}>
                <h1 className={css({ fontSize: '2xl', fontWeight: '800', margin: 0 })}>
                    Fast geschafft!
                </h1>
                <p
                    className={css({
                        color: 'foreground.muted',
                        margin: 0,
                        fontSize: 'sm',
                        lineHeight: '1.6',
                    })}
                >
                    Wir haben eine Bestätigungs-E-Mail an{' '}
                    {email ? (
                        <strong className={css({ color: 'foreground', fontWeight: '600' })}>
                            {email}
                        </strong>
                    ) : (
                        'deine E-Mail-Adresse'
                    )}{' '}
                    geschickt.
                </p>
            </div>

            <div
                className={css({
                    width: '100%',
                    background: 'accent.soft',
                    border: '1px solid',
                    borderColor: { base: 'rgba(224,123,83,0.2)', _dark: 'rgba(240,144,112,0.3)' },
                    borderRadius: 'xl',
                    padding: '4',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2',
                    textAlign: 'left',
                })}
            >
                <p
                    className={css({
                        fontSize: 'sm',
                        fontWeight: '600',
                        margin: 0,
                        color: 'foreground',
                    })}
                >
                    Nächste Schritte:
                </p>
                <ol
                    className={css({
                        fontSize: 'sm',
                        color: 'foreground.muted',
                        margin: 0,
                        paddingLeft: '4',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1',
                        lineHeight: '1.6',
                    })}
                >
                    <li>Öffne dein E-Mail-Postfach</li>
                    <li>Klicke auf den Bestätigungslink</li>
                    <li>Melde dich an und leg los!</li>
                </ol>
            </div>

            <p className={css({ fontSize: 'xs', color: 'foreground.muted', margin: 0 })}>
                Keine E-Mail erhalten? Schau auch im Spam-Ordner nach oder{' '}
                <Link
                    href="/auth/resend-activation"
                    className={css({
                        color: 'accent',
                        textDecoration: 'none',
                        fontWeight: '600',
                        _hover: { textDecoration: 'underline' },
                    })}
                >
                    sende sie erneut
                </Link>
                .
            </p>

            <Link
                href="/auth/signin"
                className={css({
                    marginTop: '2',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingX: '6',
                    paddingY: '3',
                    borderRadius: 'full',
                    fontWeight: '600',
                    fontSize: 'md',
                    color: 'foreground.muted',
                    border: '1px solid',
                    borderColor: 'border',
                    textDecoration: 'none',
                    transition: 'all 150ms ease',
                    _hover: { borderColor: 'accent', color: 'accent' },
                })}
            >
                Zur Anmeldung
            </Link>
        </div>
    );
}

export default function RegisterPage() {
    const showDiscord = useFeatureFlag('discordSignIn');
    const [email, setEmail] = useState('');
    const [nickname, setNickname] = useState('');
    const [nicknameStatus, setNicknameStatus] = useState<{
        available: boolean;
        message: string;
    } | null>(null);
    const [checkingNickname, setCheckingNickname] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [registeredEmail, setRegisteredEmail] = useState('');
    const [registered, setRegistered] = useState(false);
    const [loading, setLoading] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState('');
    const [turnstileKey, setTurnstileKey] = useState(0);
    const utmParams = useUtmParams();

    const resetTurnstile = () => {
        setTurnstileToken('');
        setTurnstileKey((k) => k + 1);
    };

    const checkNickname = async (value: string) => {
        if (!value.trim()) {
            setNicknameStatus(null);
            return;
        }

        if (value.length > MAX_NICKNAME_LENGTH) {
            setNicknameStatus({ available: false, message: 'Maximal 40 Zeichen erlaubt' });
            return;
        }

        setCheckingNickname(true);
        try {
            const res = await fetch(
                `/api/auth/check-nickname?nickname=${encodeURIComponent(value)}`,
            );
            const data = await res.json();
            setNicknameStatus({ available: data.available, message: data.message });
        } catch {
            setNicknameStatus({ available: false, message: 'Fehler bei der Überprüfung' });
        } finally {
            setCheckingNickname(false);
        }
    };

    const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setNickname(value);
        if (nicknameStatus) {
            checkNickname(value);
        }
    };

    const handleNicknameBlur = () => {
        checkNickname(nickname);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!nickname.trim()) {
            setError('Bitte gib einen Nickname ein');
            return;
        }

        if (nickname.trim().length > MAX_NICKNAME_LENGTH) {
            setError('Nickname darf maximal 40 Zeichen lang sein');
            return;
        }

        if (nicknameStatus && !nicknameStatus.available) {
            setError('Dieser Nickname ist bereits vergeben');
            return;
        }

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
            if (!turnstileToken) {
                setError('Bitte vervollständige die Sicherheitsüberprüfung');
                setLoading(false);
                return;
            }

            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, nickname, password, turnstileToken, ...utmParams }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.message || 'Ein Fehler ist aufgetreten');
                resetTurnstile();
                return;
            }

            setRegisteredEmail(email);
            setRegistered(true);
        } catch {
            setError('Ein Fehler ist aufgetreten');
            resetTurnstile();
        } finally {
            setLoading(false);
        }
    };

    if (registered) {
        return (
            <AuthPageLayout
                heroTitle="Willkommen in der Küche!"
                heroSubtitle="Dein Konto ist fast fertig. Bestätige deine E-Mail und du kannst sofort loslegen."
            >
                <RegistrationSuccess email={registeredEmail} />
            </AuthPageLayout>
        );
    }

    return (
        <AuthPageLayout
            heroTitle="Dein persönliches Kochbuch — kostenlos"
            heroSubtitle="Erstelle Rezepte, importiere sie von jeder Website, lade eigene Fotos hoch und pinne deine Favoriten an."
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
                        gap: '1',
                    })}
                >
                    <h1 className={css({ fontSize: '2xl', fontWeight: '800', margin: 0 })}>
                        Konto erstellen
                    </h1>
                    <p className={css({ color: 'foreground.muted', margin: 0, fontSize: 'sm' })}>
                        Kostenlos registrieren — dauert nur wenige Sekunden.
                    </p>
                </div>

                <GoogleSignInButton />
                {showDiscord && <DiscordSignInButton />}
                <OAuthDivider />

                <form onSubmit={handleSubmit} className={authFormStackClass}>
                    <label
                        className={css({ textAlign: 'left', fontWeight: '600', fontSize: 'sm' })}
                    >
                        Nickname *
                        <input
                            type="text"
                            value={nickname}
                            onChange={handleNicknameChange}
                            onBlur={handleNicknameBlur}
                            placeholder="Dein Nickname"
                            maxLength={MAX_NICKNAME_LENGTH}
                            required
                            className={authInputClass}
                        />
                        {nickname.trim() && (
                            <span
                                className={css({
                                    fontSize: 'xs',
                                    marginTop: '1',
                                    display: 'block',
                                    color: checkingNickname
                                        ? 'foreground.muted'
                                        : nicknameStatus?.available
                                          ? 'green.600'
                                          : 'red.500',
                                })}
                            >
                                {checkingNickname ? 'Prüfe...' : nicknameStatus?.message}
                            </span>
                        )}
                        <span
                            className={css({
                                fontSize: 'xs',
                                color: 'foreground.muted',
                                marginTop: '1',
                                display: 'block',
                            })}
                        >
                            {nickname.length}/{MAX_NICKNAME_LENGTH} Zeichen
                        </span>
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

                    <Turnstile
                        key={turnstileKey}
                        siteKey={process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY ?? ''}
                        onSuccess={setTurnstileToken}
                        onError={resetTurnstile}
                        onExpire={resetTurnstile}
                        options={{ theme: 'light' }}
                    />

                    <button
                        type="submit"
                        disabled={loading}
                        className={getAuthButtonClass(loading)}
                    >
                        {loading ? 'Registrierung läuft…' : 'Jetzt registrieren'}
                    </button>
                </form>
            </div>
        </AuthPageLayout>
    );
}
