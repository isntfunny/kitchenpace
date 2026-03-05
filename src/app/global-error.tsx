'use client';

import * as Sentry from '@sentry/nextjs';
import { AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        Sentry.captureException(error);
        // Show feedback dialog so users can provide context about the error
        Sentry.showReportDialog({
            title: 'Fehler aufgetreten',
            subtitle:
                'Unser Team wurde benachrichtigt. Hilf uns, das Problem schneller zu beheben.',
            labelComments: 'Was ist passiert?',
            labelClose: 'Schließen',
            labelSubmit: 'Fehler melden',
            successMessage: 'Danke für Dein Feedback! Wir werden das Problem schnell beheben.',
        });
    }, [error]);

    return (
        <html lang="de">
            <body
                style={{
                    margin: 0,
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#fffcf9',
                    color: '#2d3436',
                    fontFamily: 'system-ui, sans-serif',
                    textAlign: 'center',
                    padding: '2rem',
                }}
            >
                <div
                    style={{
                        width: '96px',
                        height: '96px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(239,68,68,0.08)',
                        border: '2px solid rgba(239,68,68,0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '1.5rem',
                    }}
                >
                    <AlertTriangle style={{ width: '40px', height: '40px', color: '#ef4444' }} />
                </div>

                <h1
                    style={{
                        fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
                        fontWeight: 800,
                        marginBottom: '0.75rem',
                        lineHeight: 1.15,
                    }}
                >
                    Kritischer Fehler
                </h1>

                <p
                    style={{
                        fontSize: '1rem',
                        color: '#636e72',
                        maxWidth: '380px',
                        lineHeight: 1.65,
                        marginBottom: '2rem',
                    }}
                >
                    Ein schwerwiegender Fehler ist aufgetreten. Das Team wurde benachrichtigt.
                </p>

                {error.digest && (
                    <p
                        style={{
                            fontSize: '0.7rem',
                            color: '#b2bec3',
                            fontFamily: 'monospace',
                            marginBottom: '2rem',
                        }}
                    >
                        ID: {error.digest}
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
            </body>
        </html>
    );
}
