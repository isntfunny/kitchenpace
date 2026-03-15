'use client';

import { AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';

import { Header } from '@app/components/features/Header';

import { css } from 'styled-system/css';

export default function ErrorPage({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div
            className={css({
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                bg: 'background',
                color: 'foreground',
            })}
        >
            <Header />
            <main
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem',
                    textAlign: 'center',
                }}
            >
                <div
                    className={css({
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%',
                        bg: 'error.bg',
                        border: '2px solid',
                        borderColor: {
                            base: 'rgba(239,68,68,0.25)',
                            _dark: 'rgba(248,113,113,0.35)',
                        },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '7',
                    })}
                >
                    <AlertTriangle
                        className={css({ width: '44px', height: '44px', color: 'status.error' })}
                    />
                </div>

                <h1
                    className={css({ color: 'text' })}
                    style={{
                        fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                        fontWeight: 800,
                        fontFamily: 'Georgia, serif',
                        marginBottom: '0.75rem',
                        lineHeight: 1.15,
                    }}
                >
                    Etwas ist schiefgelaufen
                </h1>

                <p
                    className={css({ color: 'foreground.muted' })}
                    style={{
                        fontSize: '1rem',
                        maxWidth: '400px',
                        lineHeight: 1.65,
                        marginBottom: '2rem',
                    }}
                >
                    Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut oder kehre zur
                    Startseite zurück.
                </p>

                {error.digest && (
                    <p
                        className={css({ color: 'text.muted' })}
                        style={{
                            fontSize: '0.75rem',
                            fontFamily: 'monospace',
                            marginBottom: '2rem',
                        }}
                    >
                        Fehler-ID: {error.digest}
                    </p>
                )}

                <div
                    style={{
                        display: 'flex',
                        gap: '0.75rem',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                    }}
                >
                    <button
                        onClick={reset}
                        className={css({
                            padding: '0.65rem 1.4rem',
                            borderRadius: '999px',
                            bg: 'palette.orange',
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'opacity 0.15s',
                        })}
                    >
                        Erneut versuchen
                    </button>
                    {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                    <a
                        href="/"
                        className={css({
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.65rem 1.4rem',
                            borderRadius: '999px',
                            bg: 'transparent',
                            border: '1.5px solid',
                            borderColor: {
                                base: 'rgba(224,123,83,0.4)',
                                _dark: 'rgba(240,144,112,0.5)',
                            },
                            color: 'palette.orange',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            textDecoration: 'none',
                        })}
                    >
                        Zur Startseite
                    </a>
                </div>
            </main>
        </div>
    );
}
