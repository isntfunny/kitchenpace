'use client';

import { QrCode, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import QRCode from 'react-qr-code';

import { pollQRUploadStatus } from '@app/lib/qrupload/actions';

import { css } from 'styled-system/css';

interface QRUploadButtonProps {
    uploadType: string;
    recipeId?: string;
    stepId?: string;
    label?: string;
    onImageUploaded: (key: string) => void;
}

interface TokenData {
    token: string;
    qrUrl: string;
    expiresAt: string;
    tokenId: string;
}

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function QRUploadButton({
    uploadType,
    recipeId,
    stepId,
    label,
    onImageUploaded,
}: QRUploadButtonProps) {
    const [open, setOpen] = useState(false);
    const [tokenData, setTokenData] = useState<TokenData | null>(null);
    const [loading, setLoading] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [success, setSuccess] = useState(false);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const clearTimers = () => {
        if (countdownRef.current) clearInterval(countdownRef.current);
        if (pollRef.current) clearInterval(pollRef.current);
    };

    const handleOpen = async () => {
        setLoading(true);
        setSuccess(false);
        setTokenData(null);

        try {
            const res = await fetch('/api/qrupload/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: uploadType, recipeId, stepId, label }),
            });
            if (!res.ok) throw new Error('token failed');
            const data = (await res.json()) as TokenData;
            setTokenData(data);
            setSecondsLeft(15 * 60);
            setOpen(true);
        } catch {
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        clearTimers();
        setOpen(false);
        setTokenData(null);
        setSuccess(false);
    };

    useEffect(() => {
        if (!open || !tokenData) return;

        countdownRef.current = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    handleClose();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        pollRef.current = setInterval(async () => {
            try {
                const result = await pollQRUploadStatus(tokenData.token);
                if (result.status === 'complete' && result.imageKey) {
                    clearTimers();
                    setSuccess(true);
                    onImageUploaded(result.imageKey);
                    setTimeout(handleClose, 1800);
                } else if (result.status === 'expired') {
                    handleClose();
                }
            } catch {}
        }, 2500);

        return clearTimers;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, tokenData]);

    const timerColor = secondsLeft < 30 ? '#ef4444' : secondsLeft < 120 ? '#eab308' : '#6b7280';

    return (
        <>
            <button
                type="button"
                onClick={handleOpen}
                disabled={loading}
                className={css({
                    display: { base: 'none', md: 'flex' },
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    gap: '1',
                    px: '3',
                    py: '1.5',
                    fontSize: '11px',
                    fontWeight: '500',
                    opacity: '0.6',
                    color: 'text.muted',
                    background: 'transparent',
                    border: 'none',
                    borderTop: {
                        base: '1px solid rgba(0,0,0,0.08)',
                        _dark: '1px solid rgba(255,255,255,0.08)',
                    },
                    borderRadius: '0',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                    _hover: {
                        color: 'brand.primary',
                        backgroundColor: {
                            base: 'rgba(224,123,83,0.04)',
                            _dark: 'rgba(224,123,83,0.08)',
                        },
                    },
                    _disabled: { opacity: '0.5', cursor: 'wait' },
                })}
            >
                <QrCode size={14} />
                Vom Handy hochladen
            </button>

            {open && tokenData && (
                <div
                    className={css({
                        position: 'fixed',
                        inset: '0',
                        zIndex: '50',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: '4',
                    })}
                    onClick={handleClose}
                >
                    <div
                        className={css({
                            position: 'absolute',
                            inset: '0',
                            background: 'surface.overlay',
                            backdropFilter: 'blur(4px)',
                        })}
                    />

                    <div
                        className={css({
                            position: 'relative',
                            zIndex: '1',
                            width: '100%',
                            maxWidth: '360px',
                            bg: 'surface.elevated',
                            borderRadius: '2xl',
                            p: '6',
                            boxShadow: {
                                base: '0 24px 64px rgba(0,0,0,0.18)',
                                _dark: '0 24px 64px rgba(0,0,0,0.5)',
                            },
                            display: 'flex',
                            flexDir: 'column',
                            alignItems: 'center',
                            gap: '5',
                            textAlign: 'center',
                        })}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={handleClose}
                            className={css({
                                position: 'absolute',
                                top: '3',
                                right: '3',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                w: '7',
                                h: '7',
                                borderRadius: 'full',
                                border: 'none',
                                background: {
                                    base: 'rgba(0,0,0,0.06)',
                                    _dark: 'rgba(255,255,255,0.08)',
                                },
                                cursor: 'pointer',
                                color: 'text.muted',
                                _hover: { color: 'text' },
                            })}
                        >
                            <X size={14} />
                        </button>

                        {success ? (
                            <>
                                <span className={css({ fontSize: '3xl' })}>✅</span>
                                <p
                                    className={css({
                                        fontSize: 'sm',
                                        fontWeight: '600',
                                        color: 'text',
                                        m: 0,
                                    })}
                                >
                                    Foto empfangen!
                                </p>
                            </>
                        ) : (
                            <>
                                <h3
                                    className={css({
                                        fontSize: 'base',
                                        fontWeight: '700',
                                        color: 'text',
                                        m: 0,
                                    })}
                                >
                                    Mit Handy hochladen
                                </h3>

                                <div
                                    className={css({
                                        p: '3',
                                        bg: 'white',
                                        borderRadius: 'xl',
                                        lineHeight: '0',
                                    })}
                                >
                                    <QRCode value={tokenData.qrUrl} size={200} />
                                </div>

                                <p
                                    className={css({
                                        fontSize: 'sm',
                                        color: 'text.muted',
                                        m: 0,
                                        lineHeight: '1.5',
                                    })}
                                >
                                    Scanne den QR-Code mit deinem Handy und wähle ein Foto aus.
                                </p>

                                <p
                                    className={css({
                                        fontSize: 'xs',
                                        fontWeight: '600',
                                        m: 0,
                                    })}
                                    style={{ color: timerColor }}
                                >
                                    {formatTime(secondsLeft)} verbleibend
                                </p>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
