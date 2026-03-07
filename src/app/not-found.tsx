import { ChefHat } from 'lucide-react';
import Link from 'next/link';

import { Header } from '@app/components/features/Header';
import { PALETTE } from '@app/lib/palette';

export default function NotFound() {
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
                {/* Animated plate icon */}
                <div
                    style={{
                        position: 'relative',
                        marginBottom: '2rem',
                    }}
                >
                    <div
                        style={{
                            width: '120px',
                            height: '120px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(224,123,83,0.1)',
                            border: '3px dashed rgba(224,123,83,0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            animation: 'spin 12s linear infinite',
                        }}
                    >
                        <ChefHat
                            style={{
                                width: '52px',
                                height: '52px',
                                color: PALETTE.orange,
                            }}
                        />
                    </div>
                    {/* 404 floating badge */}
                    <div
                        style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '-12px',
                            backgroundColor: PALETTE.orange,
                            color: 'white',
                            borderRadius: '999px',
                            padding: '4px 10px',
                            fontSize: '13px',
                            fontWeight: 700,
                            letterSpacing: '0.03em',
                            boxShadow: '0 2px 8px rgba(224,123,83,0.4)',
                        }}
                    >
                        404
                    </div>
                </div>

                <h1
                    style={{
                        fontSize: 'clamp(2rem, 5vw, 3rem)',
                        fontWeight: 800,
                        fontFamily: 'Georgia, serif',
                        marginBottom: '0.75rem',
                        lineHeight: 1.15,
                        color: '#2d3436',
                    }}
                >
                    Gericht nicht gefunden
                </h1>

                <p
                    style={{
                        fontSize: '1.05rem',
                        color: '#636e72',
                        maxWidth: '420px',
                        lineHeight: 1.65,
                        marginBottom: '2.5rem',
                    }}
                >
                    Diese Seite ist leider aus der Küche verschwunden. Vielleicht wurde sie
                    umgezogen oder existiert nicht mehr.
                </p>

                <div
                    style={{
                        display: 'flex',
                        gap: '0.75rem',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                    }}
                >
                    <Link
                        href="/"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.65rem 1.4rem',
                            borderRadius: '999px',
                            backgroundColor: PALETTE.orange,
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            textDecoration: 'none',
                            transition: 'opacity 0.15s',
                        }}
                    >
                        Zur Startseite
                    </Link>
                    <Link
                        href="/recipes"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.65rem 1.4rem',
                            borderRadius: '999px',
                            backgroundColor: 'transparent',
                            border: '1.5px solid rgba(224,123,83,0.4)',
                            color: PALETTE.orange,
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            textDecoration: 'none',
                            transition: 'border-color 0.15s',
                        }}
                    >
                        Rezepte entdecken
                    </Link>
                </div>
            </main>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
