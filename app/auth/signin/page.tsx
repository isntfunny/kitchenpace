'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useState } from 'react';

import { PageShell } from '@/components/layouts/PageShell';
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
                        borderRadius: '2xl',
                        padding: { base: '8', md: '10' },
                        boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
                        maxWidth: '520px',
                        width: '100%',
                        textAlign: 'center',
                    })}
                >
                    <h1
                        className={css({
                            fontSize: '3xl',
                            fontWeight: '700',
                            marginBottom: '3',
                        })}
                    >
                        Willkommen zurück
                    </h1>
                    <p
                        className={css({
                            color: 'text-muted',
                            marginBottom: '8',
                        })}
                    >
                        Melde dich an, um deine persönlichen KüchenTakt-Empfehlungen zu verwalten.
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
                            E-Mail
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
                            Passwort
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
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
                            {loading ? 'Anmeldung...' : 'Anmelden'}
                        </button>
                    </form>

                    <div
                        className={css({
                            marginTop: '6',
                            display: 'flex',
                            flexDir: 'column',
                            gap: '2',
                        })}
                    >
                        <Link
                            href="/auth/forgot-password"
                            className={css({
                                color: 'text-muted',
                                fontSize: 'sm',
                                textDecoration: 'none',
                                _hover: { color: '#e07b53' },
                            })}
                        >
                            Passwort vergessen?
                        </Link>
                        <Link
                            href="/auth/register"
                            className={css({
                                color: 'text-muted',
                                fontSize: 'sm',
                                textDecoration: 'none',
                                _hover: { color: '#e07b53' },
                            })}
                        >
                            Noch kein Konto?{' '}
                            <span className={css({ color: '#e07b53', fontWeight: '600' })}>
                                Registrieren
                            </span>
                        </Link>
                    </div>
                </div>
            </section>
        </PageShell>
    );
}
