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

const EditPasswordPage = () => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');

        if (!currentPassword || !newPassword || !confirmPassword) {
            setError('Bitte fülle alle Felder aus.');
            return;
        }

        if (newPassword.length < 6) {
            setError('Das neue Passwort muss mindestens 6 Zeichen enthalten.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Die Passwörter stimmen nicht überein.');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/auth/update-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Ein Fehler ist aufgetreten.');
                return;
            }

            setSuccess(true);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            console.error(err);
            setError('Ein Fehler ist aufgetreten.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthPageLayout
            heroTitle="Sicherheit im Blick behalten"
            heroSubtitle="Passe dein Passwort an, wann immer du willst – ganz im Flow deiner Küche."
            formFooter={
                <Link
                    href="/profile"
                    className={css({
                        color: 'text.muted',
                        textDecoration: 'none',
                        _hover: { color: 'accent' },
                    })}
                >
                    Zurück zum Profil
                </Link>
            }
        >
            <div className={css({ display: 'flex', flexDirection: 'column', gap: '3' })}>
                {success ? (
                    <div className={css({ display: 'flex', flexDirection: 'column', gap: '3' })}>
                        <p
                            className={css({
                                textTransform: 'uppercase',
                                letterSpacing: 'wide',
                                fontSize: 'xs',
                                fontWeight: '700',
                                color: 'foreground.muted',
                                margin: 0,
                            })}
                        >
                            Sicherheit
                        </p>
                        <h1 className={css({ fontSize: '3xl', fontWeight: '800', margin: 0 })}>
                            Passwort gespeichert
                        </h1>
                        <p
                            className={css({
                                color: 'foreground.muted',
                                margin: 0,
                                lineHeight: '1.8',
                            })}
                        >
                            Dein Passwort wurde geändert. Du kannst dich nun mit den neuen
                            Zugangsdaten anmelden oder weiter in deinem Profil arbeiten.
                        </p>
                    </div>
                ) : (
                    <>
                        <div
                            className={css({ display: 'flex', flexDirection: 'column', gap: '2' })}
                        >
                            <p
                                className={css({
                                    textTransform: 'uppercase',
                                    letterSpacing: 'wide',
                                    fontSize: 'xs',
                                    fontWeight: '700',
                                    color: 'foreground.muted',
                                    margin: 0,
                                })}
                            >
                                Passwort ändern
                            </p>
                            <h1 className={css({ fontSize: '3xl', fontWeight: '800', margin: 0 })}>
                                Gib dein aktuelles Passwort ein und definiere ein neues.
                            </h1>
                            <p
                                className={css({
                                    color: 'foreground.muted',
                                    margin: 0,
                                    lineHeight: '1.8',
                                })}
                            >
                                Wir überprüfen zuerst dein aktuelles Passwort, bevor das neue
                                gespeichert wird.
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
                                Aktuelles Passwort
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
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
                                Neues Passwort
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
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
                                {loading ? 'Speichern…' : 'Passwort ändern'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </AuthPageLayout>
    );
};

export default EditPasswordPage;
