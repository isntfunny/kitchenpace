'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { PALETTE } from '@app/lib/palette';

import type { useHandLandmarkerTest } from './useHandLandmarkerTest';

type HandState = ReturnType<typeof useHandLandmarkerTest>;

export function HandGesturePanel({
    videoRef,
    status: handStatus,
    error: handError,
    handsDetected,
    lastGesture,
    startTest,
    stopTest,
}: HandState) {
    const handStatusMessage = (() => {
        if (lastGesture === 'swipeLeft') return '⬅️ Swipe erkannt: Weiter';
        if (lastGesture === 'swipeRight') return '➡️ Swipe erkannt: Zurück';
        switch (handStatus) {
            case 'loading':
                return 'Handlandmarker wird bereitgestellt…';
            case 'running':
                return handsDetected
                    ? '✋ Hand erkannt – wische zum Navigieren'
                    : 'Kamera läuft. Wische mit der Hand nach links/rechts.';
            case 'success':
                return '✋ Hand erkannt.';
            case 'error':
                return handError ?? 'Fehler beim Zugriff auf die Kamera.';
            default:
                return 'Frontkamera aktivieren, um Handgesten zu testen.';
        }
    })();

    const handStatusColor =
        handStatus === 'error'
            ? '#ff8b8b'
            : lastGesture !== 'none'
              ? PALETTE.emerald
              : 'rgba(255,255,255,0.7)';

    return (
        <div
            style={{
                width: '100%',
                maxWidth: 360,
                borderRadius: 20,
                padding: '14px 18px',
                marginBottom: 20,
                backgroundColor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                }}
            >
                <span
                    style={{
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.7)',
                    }}
                >
                    Handsteuerung
                </span>
                <span
                    style={{
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.45)',
                        fontWeight: 600,
                    }}
                >
                    Frontkamera
                </span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                    type="button"
                    onClick={startTest}
                    disabled={handStatus === 'loading' || handStatus === 'running'}
                    style={{
                        flex: 1,
                        minWidth: 160,
                        padding: '12px 16px',
                        borderRadius: 12,
                        border: 'none',
                        backgroundColor:
                            handStatus === 'running' || handStatus === 'loading'
                                ? 'rgba(255,255,255,0.2)'
                                : PALETTE.orange,
                        color:
                            handStatus === 'running' || handStatus === 'loading'
                                ? 'rgba(255,255,255,0.7)'
                                : 'white',
                        fontWeight: 700,
                        cursor:
                            handStatus === 'running' || handStatus === 'loading'
                                ? 'default'
                                : 'pointer',
                    }}
                >
                    {handStatus === 'running'
                        ? 'Test läuft…'
                        : handStatus === 'loading'
                          ? 'Vorbereiten…'
                          : 'Handkamera aktivieren'}
                </button>
                {handStatus !== 'idle' && (
                    <button
                        type="button"
                        onClick={stopTest}
                        style={{
                            padding: '12px 16px',
                            borderRadius: 12,
                            border: '1px solid rgba(255,255,255,0.4)',
                            backgroundColor: 'transparent',
                            color: 'rgba(255,255,255,0.8)',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        Stoppen
                    </button>
                )}
            </div>

            <div
                style={{
                    marginTop: 12,
                    minHeight: 18,
                    fontSize: 13,
                    color: handStatusColor,
                    fontWeight: 600,
                }}
            >
                {handStatusMessage}
            </div>

            {handStatus === 'running' && (
                <div
                    style={{
                        marginTop: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 16,
                        opacity: 0.6,
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            color: 'rgba(255,255,255,0.5)',
                        }}
                    >
                        <ChevronLeft style={{ width: 14, height: 14 }} />
                        <span>Zurück</span>
                    </div>
                    <div
                        style={{
                            width: 40,
                            height: 2,
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            borderRadius: 1,
                        }}
                    />
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            color: 'rgba(255,255,255,0.5)',
                        }}
                    >
                        <span>Weiter</span>
                        <ChevronRight style={{ width: 14, height: 14 }} />
                    </div>
                </div>
            )}

            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                    marginTop: 12,
                    width: '100%',
                    height: 170,
                    borderRadius: 14,
                    objectFit: 'cover',
                    display: handStatus === 'idle' ? 'none' : 'block',
                }}
            />
        </div>
    );
}
