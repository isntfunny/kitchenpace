'use client';

import { AlertCircle, Loader2, Sparkles, X } from 'lucide-react';
import { useState } from 'react';

import { css } from 'styled-system/css';

import type { LaneGrid, LaneStep } from './types';

interface AiLaneDialogProps {
    open: boolean;
    onClose: () => void;
    onResult: (grid: LaneGrid) => void;
}

export function AiLaneDialog({ open, onClose, onResult }: AiLaneDialogProps) {
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!open) return null;

    async function handleGenerate() {
        if (!text.trim() || loading) return;
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/ai/analyze-lane-grid', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text.trim() }),
            });

            if (!res.ok) {
                const body = await res.json().catch(() => ({ error: 'Request failed' }));
                throw new Error(body.error || `HTTP ${res.status}`);
            }

            const { laneGrid } = await res.json();

            const grid: LaneGrid = {
                segments: laneGrid.segments.map((seg: any) => ({
                    id: seg.id as string,
                    columnSpans: seg.columnSpans as number[],
                    lanes: (seg.lanes as any[][]).map((lane: any[]) =>
                        lane.map((step: any) => ({
                            id: step.id as string,
                            type: step.type as LaneStep['type'],
                            label: step.label as string,
                            description: step.description as string,
                            duration: step.duration ?? undefined,
                            ingredientIds: step.ingredientIds as string[] | undefined,
                        })),
                    ),
                })),
            };

            onResult(grid);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={backdropClass} onClick={onClose}>
            <div className={dialogClass} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className={headerClass}>
                    <Sparkles className={css({ w: '16px', h: '16px', color: '#f8b500' })} />
                    <span className={css({ fontWeight: '700', fontSize: '14px' })}>
                        Rezept mit KI generieren
                    </span>
                    <button type="button" onClick={onClose} className={closeBtnClass}>
                        <X className={css({ w: '14px', h: '14px' })} />
                    </button>
                </div>

                {/* Body */}
                <div className={bodyClass}>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Rezepttext hier einfügen (z.B. von einer Website kopiert)..."
                        className={textareaClass}
                        rows={10}
                        disabled={loading}
                        maxLength={10_000}
                    />

                    <div
                        className={css({
                            fontSize: '11px',
                            color: 'rgba(0,0,0,0.35)',
                            textAlign: 'right',
                        })}
                    >
                        {text.length.toLocaleString('de-DE')}/10.000
                    </div>

                    {error && (
                        <div className={errorClass}>
                            <AlertCircle
                                className={css({ w: '13px', h: '13px', flexShrink: '0' })}
                            />
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={footerClass}>
                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={!text.trim() || loading}
                        className={generateBtnClass}
                    >
                        {loading ? (
                            <>
                                <Loader2
                                    className={css({
                                        w: '14px',
                                        h: '14px',
                                        animation: 'spin 1s linear infinite',
                                    })}
                                />
                                Generiere...
                            </>
                        ) : (
                            <>
                                <Sparkles className={css({ w: '14px', h: '14px' })} />
                                LaneGrid generieren
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Styles ── */

const backdropClass = css({
    position: 'fixed',
    inset: '0',
    bg: 'rgba(0,0,0,0.4)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '100',
});

const dialogClass = css({
    bg: 'white',
    borderRadius: '16px',
    boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
    w: '520px',
    maxW: 'calc(100vw - 40px)',
    maxH: 'calc(100vh - 80px)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
});

const headerClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    px: '20px',
    py: '14px',
    borderBottom: '1px solid rgba(0,0,0,0.06)',
    bg: 'linear-gradient(135deg, rgba(248,181,0,0.06), rgba(224,123,83,0.06))',
});

const closeBtnClass = css({
    ml: 'auto',
    w: '28px',
    h: '28px',
    borderRadius: 'full',
    border: 'none',
    bg: 'transparent',
    color: 'rgba(0,0,0,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    _hover: { bg: 'rgba(0,0,0,0.05)', color: 'rgba(0,0,0,0.6)' },
});

const bodyClass = css({
    p: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
});

const textareaClass = css({
    w: '100%',
    border: '1px solid rgba(0,0,0,0.1)',
    borderRadius: '10px',
    p: '14px',
    fontSize: '13px',
    lineHeight: '1.6',
    resize: 'vertical',
    fontFamily: 'body',
    color: '#111',
    _placeholder: { color: 'rgba(0,0,0,0.3)' },
    _focus: {
        outline: 'none',
        borderColor: '#e07b53',
        boxShadow: '0 0 0 2px rgba(224,123,83,0.15)',
    },
    _disabled: { opacity: '0.5', cursor: 'not-allowed' },
});

const errorClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#e74c3c',
    bg: 'rgba(231,76,60,0.06)',
    borderRadius: '8px',
    p: '10px 12px',
});

const footerClass = css({
    px: '20px',
    py: '14px',
    borderTop: '1px solid rgba(0,0,0,0.06)',
    display: 'flex',
    justifyContent: 'flex-end',
});

const generateBtnClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    px: '18px',
    py: '10px',
    borderRadius: 'full',
    border: 'none',
    bg: 'linear-gradient(135deg, #e07b53, #f8b500)',
    color: 'white',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    boxShadow: '0 3px 12px rgba(224,123,83,0.35)',
    _hover: { boxShadow: '0 4px 16px rgba(224,123,83,0.5)', transform: 'translateY(-1px)' },
    _disabled: { opacity: '0.5', cursor: 'not-allowed', transform: 'none', boxShadow: 'none' },
});
