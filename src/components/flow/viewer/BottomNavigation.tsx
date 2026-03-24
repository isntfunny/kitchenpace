'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

export function BottomNavigation({
    col,
    totalColumns,
    canGoLeft,
    canGoRight,
    goLeft,
    goRight,
}: {
    col: number;
    totalColumns: number;
    canGoLeft: boolean;
    canGoRight: boolean;
    goLeft: () => void;
    goRight: () => void;
}) {
    const navBtnStyle = (enabled: boolean): React.CSSProperties => ({
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '13px 20px',
        minHeight: 48,
        borderRadius: 14,
        border: 'none',
        backgroundColor: enabled ? 'rgba(255,255,255,0.12)' : 'transparent',
        color: enabled ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)',
        fontSize: 14,
        fontWeight: 600,
        cursor: enabled ? 'pointer' : 'default',
    });

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 24px 20px',
                flexShrink: 0,
            }}
        >
            <button
                type="button"
                onClick={goLeft}
                disabled={!canGoLeft}
                style={navBtnStyle(canGoLeft)}
            >
                <ChevronLeft style={{ width: 18, height: 18 }} />
                Zurück
            </button>

            <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
                Schritt {col + 1} / {totalColumns}
            </div>

            <button
                type="button"
                onClick={goRight}
                disabled={!canGoRight}
                style={navBtnStyle(canGoRight)}
            >
                Weiter
                <ChevronRight style={{ width: 18, height: 18 }} />
            </button>
        </div>
    );
}
