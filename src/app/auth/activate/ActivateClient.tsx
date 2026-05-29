'use client';

import { CheckCircle, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { PageShell } from '@app/components/layouts/PageShell';
import { PALETTE } from '@app/lib/palette';

import { css } from 'styled-system/css';

type ActivateClientProps = {
    error?: string | null;
};

export default function ActivateClient({ error }: ActivateClientProps) {
    const router = useRouter();
    const status: 'success' | 'error' = error ? 'error' : 'success';
    const message = error
        ? 'Der Bestätigungslink ist ungültig oder abgelaufen. Bitte fordere einen neuen an.'
        : 'Dein Konto wurde erfolgreich bestätigt. Du bist jetzt angemeldet.';

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
                        background: 'surface',
                        borderRadius: '2xl',
                        padding: { base: '8', md: '10' },
                        boxShadow: {
                            base: '0 20px 60px rgba(0,0,0,0.12)',
                            _dark: '0 20px 60px rgba(0,0,0,0.4)',
                        },
                        maxWidth: '520px',
                        width: '100%',
                        textAlign: 'center',
                    })}
                >
                    {status === 'success' && (
                        <>
                            <CheckCircle
                                size={64}
                                color="var(--colors-green-500, #22c55e)"
                                className={css({ marginBottom: '4' })}
                            />
                            <h1
                                className={css({
                                    fontSize: '2xl',
                                    fontWeight: '700',
                                    marginBottom: '3',
                                })}
                            >
                                Willkommen bei KochTakt!
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
                                    background: `linear-gradient(135deg, ${PALETTE.orange} 0%, ${PALETTE.gold} 100%)`,
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 150ms ease',
                                    _hover: {
                                        transform: 'translateY(-1px)',
                                        boxShadow: {
                                            base: '0 10px 30px rgba(224,123,83,0.35)',
                                            _dark: '0 10px 30px rgba(224,123,83,0.25)',
                                        },
                                    },
                                })}
                            >
                                Jetzt anmelden
                            </button>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <XCircle
                                size={64}
                                color="var(--colors-status-error, #ef4444)"
                                className={css({ marginBottom: '4' })}
                            />
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
                                onClick={() => router.push('/auth/resend-activation')}
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
                                    background: `linear-gradient(135deg, ${PALETTE.orange} 0%, ${PALETTE.gold} 100%)`,
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 150ms ease',
                                    _hover: {
                                        transform: 'translateY(-1px)',
                                        boxShadow: {
                                            base: '0 10px 30px rgba(224,123,83,0.35)',
                                            _dark: '0 10px 30px rgba(224,123,83,0.25)',
                                        },
                                    },
                                })}
                            >
                                Neuen Link anfordern
                            </button>
                        </>
                    )}
                </div>
            </section>
        </PageShell>
    );
}
