'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { PageShell } from '@/components/layouts/PageShell';
import { css } from 'styled-system/css';

export default function ActivatePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>(() => {
        if (!token) return 'error';
        return 'loading';
    });
    const [message, setMessage] = useState(() => {
        if (!token) return 'Kein Aktivierungscode gefunden';
        return '';
    });

    useEffect(() => {
        if (!token || status !== 'loading') return;

        let cancelled = false;

        fetch('/api/auth/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
        })
            .then(async (res) => {
                if (cancelled) return;
                const data = await res.json();
                if (res.ok) {
                    setStatus('success');
                    setMessage(data.message || 'Konto erfolgreich aktiviert!');
                } else {
                    setStatus('error');
                    setMessage(data.message || 'Aktivierung fehlgeschlagen');
                }
            })
            .catch(() => {
                if (cancelled) return;
                setStatus('error');
                setMessage('Ein Fehler ist aufgetreten');
            });

        return () => {
            cancelled = true;
        };
    }, [token, status]);

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
                    {status === 'loading' && (
                        <>
                            <div
                                className={css({
                                    width: '64px',
                                    height: '64px',
                                    marginX: 'auto',
                                    marginBottom: '4',
                                    borderRadius: '50%',
                                    border: '3px solid',
                                    borderColor: 'rgba(224,123,83,0.3)',
                                    borderTopColor: '#e07b53',
                                    animation: 'spin 1s linear infinite',
                                })}
                            />
                            <h1
                                className={css({
                                    fontSize: '2xl',
                                    fontWeight: '700',
                                    marginBottom: '3',
                                })}
                            >
                                Konto wird aktiviert...
                            </h1>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <div
                                className={css({
                                    fontSize: '5xl',
                                    marginBottom: '4',
                                })}
                            >
                                ✓
                            </div>
                            <h1
                                className={css({
                                    fontSize: '2xl',
                                    fontWeight: '700',
                                    marginBottom: '3',
                                })}
                            >
                                Willkommen bei KitchenPace!
                            </h1>
                            <p
                                className={css({
                                    color: 'text-muted',
                                    marginBottom: '6',
                                })}
                            >
                                {message}
                            </p>
                            <button
                                onClick={() => router.push('/auth/signin')}
                                className={css({
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '2',
                                    px: '6',
                                    py: '3',
                                    borderRadius: 'full',
                                    fontWeight: '600',
                                    fontSize: 'md',
                                    color: 'white',
                                    background: 'linear-gradient(135deg, #e07b53 0%, #f8b500 100%)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 150ms ease',
                                    _hover: {
                                        transform: 'translateY(-1px)',
                                        boxShadow: '0 10px 30px rgba(224,123,83,0.35)',
                                    },
                                })}
                            >
                                Jetzt anmelden
                            </button>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <div
                                className={css({
                                    fontSize: '5xl',
                                    marginBottom: '4',
                                })}
                            >
                                ✕
                            </div>
                            <h1
                                className={css({
                                    fontSize: '2xl',
                                    fontWeight: '700',
                                    marginBottom: '3',
                                })}
                            >
                                Aktivierung fehlgeschlagen
                            </h1>
                            <p
                                className={css({
                                    color: 'text-muted',
                                    marginBottom: '6',
                                })}
                            >
                                {message}
                            </p>
                            <button
                                onClick={() => router.push('/auth/register')}
                                className={css({
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '2',
                                    px: '6',
                                    py: '3',
                                    borderRadius: 'full',
                                    fontWeight: '600',
                                    fontSize: 'md',
                                    color: 'white',
                                    background: 'linear-gradient(135deg, #e07b53 0%, #f8b500 100%)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 150ms ease',
                                    _hover: {
                                        transform: 'translateY(-1px)',
                                        boxShadow: '0 10px 30px rgba(224,123,83,0.35)',
                                    },
                                })}
                            >
                                Erneut registrieren
                            </button>
                        </>
                    )}
                </div>
            </section>
        </PageShell>
    );
}
