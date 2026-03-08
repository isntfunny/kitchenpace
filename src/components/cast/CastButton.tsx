'use client';

import type { CastState } from '@app/hooks/useCast';

interface CastButtonProps {
    castState: CastState;
    onStart: () => void;
    onStop: () => void;
}

/**
 * Chromecast icon button.
 * - Hidden when Google Cast SDK is not present.
 * - Pulses orange while connecting.
 * - Filled/active when a session is live.
 */
export function CastButton({ castState, onStart, onStop }: CastButtonProps) {
    if (castState === 'unavailable') return null;

    const connected = castState === 'connected';
    const connecting = castState === 'connecting';

    return (
        <button
            type="button"
            onClick={connected ? onStop : onStart}
            disabled={connecting}
            title={
                connected
                    ? 'Auf TV beenden'
                    : connecting
                      ? 'Verbinde…'
                      : 'Auf TV (Chromecast) zeigen'
            }
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 999,
                border: `1.5px solid ${connected ? '#e07b53' : 'rgba(224,123,83,0.35)'}`,
                backgroundColor: connected ? 'rgba(224,123,83,0.12)' : 'rgba(255,255,255,0.9)',
                color: connected ? '#e07b53' : '#888',
                fontSize: 12,
                fontWeight: 600,
                cursor: connecting ? 'wait' : 'pointer',
                transition: 'all 0.2s ease',
                animation: connecting ? 'cast-pulse 1.4s ease-in-out infinite' : 'none',
            }}
        >
            {/* Chromecast SVG icon (Material Design) */}
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                {/* Cast screen outline */}
                <path d="M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" />
                <line x1="2" y1="20" x2="2.01" y2="20" />
            </svg>
            {connected ? 'Wird gezeigt' : connecting ? 'Verbinde…' : 'Auf TV'}
            <style>{`
                @keyframes cast-pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </button>
    );
}
