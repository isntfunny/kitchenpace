'use client';

import { Lock } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { Button } from '@app/components/atoms/Button';
import { Heading, Text } from '@app/components/atoms/Typography';
import { PageShell } from '@app/components/layouts/PageShell';
import { ProfileSidebarLayout } from '@app/components/layouts/ProfileSidebarLayout';
import { css } from 'styled-system/css';

export function PasswordEditClient({ userSlug }: { userSlug?: string }) {
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

    const inputClass = css({
        w: '100%',
        borderRadius: 'xl',
        border: '1px solid',
        borderColor: 'border',
        p: '3',
        fontSize: 'md',
        outline: 'none',
        bg: 'background',
        transition: 'all 150ms ease',
        _focus: {
            borderColor: 'primary',
            boxShadow: {
                base: '0 0 0 3px rgba(224,123,83,0.15)',
                _dark: '0 0 0 3px rgba(224,123,83,0.2)',
            },
        },
    });

    return (
        <PageShell>
            <section className={css({ py: { base: '4', md: '6' } })}>
                <div className={css({ mb: '6' })}>
                    <div
                        className={css({
                            p: { base: '4', md: '6' },
                            borderRadius: '2xl',
                            bg: 'surface',
                            boxShadow: 'shadow.medium',
                        })}
                    >
                        <div className={css({ display: 'flex', alignItems: 'center', gap: '4' })}>
                            <div
                                className={css({
                                    w: '12',
                                    h: '12',
                                    borderRadius: 'xl',
                                    bg: 'primary',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    flexShrink: '0',
                                })}
                            >
                                <Lock size={24} />
                            </div>
                            <div>
                                <Heading as="h1" size="xl">
                                    Passwort ändern
                                </Heading>
                                <Text color="muted">
                                    Gib dein aktuelles Passwort ein und definiere ein neues.
                                </Text>
                            </div>
                        </div>
                    </div>
                </div>

                <ProfileSidebarLayout userSlug={userSlug}>
                    <div
                        className={css({
                            p: { base: '4', md: '6' },
                            borderRadius: '2xl',
                            bg: 'surface',
                            boxShadow: 'shadow.medium',
                        })}
                    >
                        {success ? (
                            <div
                                className={css({
                                    display: 'flex',
                                    flexDir: 'column',
                                    gap: '4',
                                    alignItems: 'flex-start',
                                })}
                            >
                                <Heading as="h2" size="lg">
                                    Passwort gespeichert
                                </Heading>
                                <Text color="muted">Dein Passwort wurde erfolgreich geändert.</Text>
                                <Link href="/profile">
                                    <Button type="button" variant="primary">
                                        Zurück zum Profil
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            <form
                                onSubmit={handleSubmit}
                                className={css({
                                    display: 'flex',
                                    flexDir: 'column',
                                    gap: '4',
                                })}
                            >
                                <label
                                    className={css({
                                        display: 'flex',
                                        flexDir: 'column',
                                        gap: '2',
                                        fontWeight: '600',
                                    })}
                                >
                                    Aktuelles Passwort
                                    <input
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className={inputClass}
                                    />
                                </label>
                                <label
                                    className={css({
                                        display: 'flex',
                                        flexDir: 'column',
                                        gap: '2',
                                        fontWeight: '600',
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
                                        className={inputClass}
                                    />
                                </label>
                                <label
                                    className={css({
                                        display: 'flex',
                                        flexDir: 'column',
                                        gap: '2',
                                        fontWeight: '600',
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
                                        className={inputClass}
                                    />
                                </label>
                                {error && (
                                    <div
                                        className={css({
                                            p: '3',
                                            bg: 'red.50',
                                            color: 'red.600',
                                            borderRadius: 'lg',
                                            border: '1px solid',
                                            borderColor: 'red.200',
                                        })}
                                    >
                                        <Text size="sm">{error}</Text>
                                    </div>
                                )}
                                <div className={css({ display: 'flex', gap: '3', mt: '2' })}>
                                    <Button type="submit" variant="primary" disabled={loading}>
                                        <Lock size={18} />
                                        {loading ? 'Speichern…' : 'Passwort ändern'}
                                    </Button>
                                    <Link href="/profile">
                                        <Button type="button" variant="ghost">
                                            Abbrechen
                                        </Button>
                                    </Link>
                                </div>
                            </form>
                        )}
                    </div>
                </ProfileSidebarLayout>
            </section>
        </PageShell>
    );
}
