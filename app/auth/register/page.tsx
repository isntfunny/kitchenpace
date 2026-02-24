'use client';

import Link from 'next/link';
import { useState } from 'react';

import { PageShell } from '@/components/layouts/PageShell';
import { css } from 'styled-system/css';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);

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
                body: JSON.stringify({ email, name, password }),
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
        <PageShell>
            <section
                className={css({
                    paddingY: { base: '8', md: '12' },
                    display: 'flex',
                    justifyContent: 'center',
                    fontFamily: 'body',
                    color: 'text',
                })}
            >
                <div
                    className={css({
                        background: 'white',
                        borderRadius: '3xl',
                        padding: { base: '8', md: '12' },
                        boxShadow: '0 30px 80px rgba(224,123,83,0.25)',
                        maxWidth: '640px',
                        width: '100%',
                    })}
                >
                    <p className={css({ fontSize: 'sm', color: 'text-muted', mb: '2' })}>
                        KüchenTakt
                    </p>
                    <h1 className={css({ fontSize: '4xl', fontWeight: '800', mb: '4' })}>
                        Erstelle dein Kochprofil
                    </h1>
                    <p className={css({ color: 'text-muted', mb: '10', fontSize: 'lg' })}>
                        Registriere dich, um persönliche Empfehlungen, Einkaufslisten und deine
                        KüchenTakt-Community zu verwalten.
                    </p>

                    <form
                        onSubmit={handleSubmit}
                        className={css({ display: 'flex', flexDir: 'column', gap: '4' })}
                    >
                        <label
                            className={css({
                                textAlign: 'left',
                                fontWeight: '600',
                                fontSize: 'sm',
                            })}
                        >
                            Name (optional)
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Dein Name"
                                className={css({
                                    display: 'block',
                                    width: '100%',
                                    marginTop: '1',
                                    padding: '3',
                                    borderRadius: 'xl',
                                    border: '1px solid rgba(224,123,83,0.4)',
                                    fontSize: 'md',
                                    outline: 'none',
                                    _focus: {
                                        borderColor: '#e07b53',
                                        boxShadow: '0 0 0 3px rgba(224,123,83,0.15)',
                                    },
                                })}
                            />
                        </label>

                        <label
                            className={css({
                                textAlign: 'left',
                                fontWeight: '600',
                                fontSize: 'sm',
                            })}
                        >
                            E-Mail *
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="deine@email.de"
                                required
                                className={css({
                                    display: 'block',
                                    width: '100%',
                                    marginTop: '1',
                                    padding: '3',
                                    borderRadius: 'xl',
                                    border: '1px solid rgba(224,123,83,0.4)',
                                    fontSize: 'md',
                                    outline: 'none',
                                    _focus: {
                                        borderColor: '#e07b53',
                                        boxShadow: '0 0 0 3px rgba(224,123,83,0.15)',
                                    },
                                })}
                            />
                        </label>

                        <label
                            className={css({
                                textAlign: 'left',
                                fontWeight: '600',
                                fontSize: 'sm',
                            })}
                        >
                            Passwort *
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Mindestens 8 Zeichen"
                                required
                                minLength={8}
                                className={css({
                                    display: 'block',
                                    width: '100%',
                                    marginTop: '1',
                                    padding: '3',
                                    borderRadius: 'xl',
                                    border: '1px solid rgba(224,123,83,0.4)',
                                    fontSize: 'md',
                                    outline: 'none',
                                    _focus: {
                                        borderColor: '#e07b53',
                                        boxShadow: '0 0 0 3px rgba(224,123,83,0.15)',
                                    },
                                })}
                            />
                        </label>

                        <label
                            className={css({
                                textAlign: 'left',
                                fontWeight: '600',
                                fontSize: 'sm',
                            })}
                        >
                            Passwort bestätigen *
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Passwort wiederholen"
                                required
                                className={css({
                                    display: 'block',
                                    width: '100%',
                                    marginTop: '1',
                                    padding: '3',
                                    borderRadius: 'xl',
                                    border: '1px solid rgba(224,123,83,0.4)',
                                    fontSize: 'md',
                                    outline: 'none',
                                    _focus: {
                                        borderColor: '#e07b53',
                                        boxShadow: '0 0 0 3px rgba(224,123,83,0.15)',
                                    },
                                })}
                            />
                        </label>

                        {error && (
                            <p className={css({ color: 'red.500', fontSize: 'sm' })}>{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={css({
                                marginTop: '2',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '2',
                                px: '6',
                                py: '3',
                                borderRadius: 'full',
                                fontFamily: 'body',
                                fontWeight: '600',
                                fontSize: 'md',
                                color: 'white',
                                background: 'linear-gradient(135deg, #e07b53 0%, #f8b500 100%)',
                                border: 'none',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.7 : 1,
                                transition: 'transform 150ms ease, box-shadow 150ms ease',
                                _hover: loading
                                    ? {}
                                    : {
                                          transform: 'translateY(-1px)',
                                          boxShadow: '0 10px 30px rgba(224,123,83,0.35)',
                                      },
                            })}
                        >
                            {loading ? 'Registrierung...' : 'Jetzt registrieren'}
                        </button>

                        {successMessage && (
                            <p className={css({ color: 'green.600', fontSize: 'sm' })}>
                                {successMessage}
                            </p>
                        )}
                    </form>

                    <div className={css({ marginTop: '6', textAlign: 'center' })}>
                        <Link
                            href="/auth/signin"
                            className={css({
                                color: 'text-muted',
                                fontSize: 'sm',
                                textDecoration: 'none',
                                _hover: { color: '#e07b53' },
                            })}
                        >
                            Bereits ein Konto?{' '}
                            <span className={css({ color: '#e07b53', fontWeight: '600' })}>
                                Anmelden
                            </span>
                        </Link>
                    </div>
                </div>
            </section>
        </PageShell>
    );
}
