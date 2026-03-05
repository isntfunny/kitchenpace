'use client';

import { AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';

import { Header } from '@app/components/features/Header';

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
            style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#fffcf9',
                color: '#2d3436',
            }}
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
                    style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(239,68,68,0.08)',
                        border: '2px solid rgba(239,68,68,0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '1.75rem',
                    }}
                >
                    <AlertTriangle style={{ width: '44px', height: '44px', color: '#ef4444' }} />
                </div>

                <h1
                    style={{
                        fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                        fontWeight: 800,
                        fontFamily: 'Georgia, serif',
                        marginBottom: '0.75rem',
                        lineHeight: 1.15,
                        color: '#2d3436',
                    }}
                >
                    Etwas ist schiefgelaufen
                </h1>

                <p
                    style={{
                        fontSize: '1rem',
                        color: '#636e72',
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
                        style={{
                            fontSize: '0.75rem',
                            color: '#b2bec3',
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
                        style={{
                            padding: '0.65rem 1.4rem',
                            borderRadius: '999px',
                            backgroundColor: '#e07b53',
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'opacity 0.15s',
                        }}
                    >
                        Erneut versuchen
                    </button>
                    {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                    <a
                        href="/"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.65rem 1.4rem',
                            borderRadius: '999px',
                            backgroundColor: 'transparent',
                            border: '1.5px solid rgba(224,123,83,0.4)',
                            color: '#e07b53',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            textDecoration: 'none',
                        }}
                    >
                        Zur Startseite
                    </a>
                </div>
            </main>
        </div>
    );
}
