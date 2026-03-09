'use client';

import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

import { PALETTE } from '@app/lib/palette';
import { css } from 'styled-system/css';

type AuthErrorClientProps = {
    error?: string | null;
};

function getErrorMessage(error?: string | null) {
    switch (error) {
        case 'AccountNotActivated':
            return 'Dein Konto ist noch nicht aktiviert. Bitte checke deine E-Mail für den Aktivierungslink.';
        case 'Configuration':
            return 'Authentifizierungskonfigurationsfehler. Bitte kontaktiere den Support.';
        case 'AccessDenied':
            return 'Zugriff verweigert.';
        case 'Verification':
            return 'Der Verifizierungslink ist ungültig oder abgelaufen.';
        default:
            return 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.';
    }
}

export default function AuthErrorClient({ error }: AuthErrorClientProps) {
    const message = getErrorMessage(error);

    return (
        <div>
            <AlertTriangle size={64} color="#f97316" className={css({ marginBottom: '4' })} />
            <h1
                className={css({
                    fontSize: '2xl',
                    fontWeight: '700',
                    marginBottom: '3',
                })}
            >
                Authentication Error
            </h1>
            <p
                className={css({
                    color: 'text-muted',
                    marginBottom: '6',
                })}
            >
                {message}
            </p>
            <div
                className={css({
                    display: 'flex',
                    flexDir: 'column',
                    gap: '3',
                })}
            >
                <Link
                    href="/auth/signin"
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
                        textDecoration: 'none',
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
                    Zur Anmeldung
                </Link>
                <Link
                    href="/auth/register"
                    className={css({
                        color: 'text-muted',
                        fontSize: 'sm',
                        textDecoration: 'none',
                        _hover: { color: 'palette.orange' },
                    })}
                >
                    Noch kein Konto?{' '}
                    <span className={css({ color: 'palette.orange', fontWeight: '600' })}>
                        Registrieren
                    </span>
                </Link>
            </div>
        </div>
    );
}
