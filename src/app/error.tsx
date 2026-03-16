'use client';

import { Lock, AlertTriangle } from 'lucide-react';
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

    const isPermissionError =
        error.message?.includes('keine Berechtigung') ||
        error.message?.includes('Nicht autorisiert');

    const Icon = isPermissionError ? Lock : AlertTriangle;
    const title = isPermissionError ? 'Keine Berechtigung' : 'Etwas ist schiefgelaufen';
    const description = isPermissionError
        ? 'Du hast keine Berechtigung für diese Aktion. Bitte melde dich an oder wende dich an einen Administrator.'
        : 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut oder kehre zur Startseite zurück.';

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
                        bg: isPermissionError ? 'orange.50' : 'error.bg',
                        border: '2px solid',
                        borderColor: isPermissionError
                            ? { base: 'rgba(234,179,8,0.3)', _dark: 'rgba(250,204,21,0.3)' }
                            : {
                                  base: 'rgba(239,68,68,0.25)',
                                  _dark: 'rgba(248,113,113,0.35)',
                              },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '7',
                    })}
                >
                    <Icon
                        className={css({
                            width: '44px',
                            height: '44px',
                            color: isPermissionError ? 'orange.500' : 'status.error',
                        })}
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
                    {title}
                </h1>

                <p
                    className={css({ color: 'foreground.muted' })}
                    style={{
                        fontSize: '1rem',
                        maxWidth: '440px',
                        lineHeight: 1.65,
                        marginBottom: '2rem',
                    }}
                >
                    {description}
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
                    {!isPermissionError && (
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
                    )}
                    {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                    <a
                        href="/"
                        className={css({
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.65rem 1.4rem',
                            borderRadius: '999px',
                            bg: isPermissionError ? 'palette.orange' : 'transparent',
                            border: isPermissionError ? 'none' : '1.5px solid',
                            borderColor: {
                                base: 'rgba(224,123,83,0.4)',
                                _dark: 'rgba(240,144,112,0.5)',
                            },
                            color: isPermissionError ? 'white' : 'palette.orange',
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
