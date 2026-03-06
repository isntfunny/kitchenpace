'use client';

import Link from 'next/link';
import { useState } from 'react';

import {
    authFormStackClass,
    authInputClass,
    getAuthButtonClass,
} from '@app/components/forms/authStyles';
import { AuthPageLayout } from '@app/components/layouts/AuthPageLayout';
import { useUtmParams } from '@app/lib/hooks/useUtmParams';
import { css } from 'styled-system/css';

const MAX_NICKNAME_LENGTH = 40;

export default function RegisterPage() {
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
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const utmParams = useUtmParams();

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
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, nickname, password, ...utmParams }),
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
            setNickname('');
            setPassword('');
            setConfirmPassword('');
            setNicknameStatus(null);
        } catch {
            setError('Ein Fehler ist aufgetreten');
        } finally {
            setLoading(false);
        }
    };

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
                        Starte in unter 30 Sekunden
                    </h1>
                    <p className={css({ color: 'foreground.muted', margin: 0 })}>
                        Kostenlos registrieren — Rezepte erstellen, Fotos hochladen und
                        Lieblingsrezepte anpinnen.
                    </p>
                </div>

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
