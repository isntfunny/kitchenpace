'use client';

import { Sparkles } from 'lucide-react';

import { css } from 'styled-system/css';

/* ── component ───────────────────────────────────────────── */

interface FlowToolbarProps {
    showAiButton: boolean;
    onAiClick: () => void;
    onAutoLayout: () => void;
}

export function FlowToolbar({ showAiButton, onAiClick, onAutoLayout }: FlowToolbarProps) {
    return (
        <>
            {showAiButton && (
                <button
                    type="button"
                    className={aiButtonClass}
                    title="KI-gestützte Rezeptkonvertierung"
                    onClick={onAiClick}
                >
                    <Sparkles
                        className={css({
                            width: '13px',
                            height: '13px',
                            flexShrink: '0',
                        })}
                    />
                    Lass KI die Arbeit übernehmen
                </button>
            )}
            <button type="button" className={layoutButtonClass} onClick={onAutoLayout}>
                Layout aufräumen
            </button>
        </>
    );
}

/* ── styles ──────────────────────────────────────────────── */

const layoutButtonClass = css({
    py: '1.5',
    px: '3',
    borderRadius: 'full',
    fontSize: 'xs',
    fontWeight: '600',
    cursor: 'pointer',
    border: '1px solid rgba(224,123,83,0.35)',
    background: 'rgba(224,123,83,0.06)',
    color: 'brand.primary',
    letterSpacing: '0.01em',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(4px)',
    _hover: {
        background: 'rgba(224,123,83,0.14)',
        borderColor: 'rgba(224,123,83,0.55)',
        boxShadow: {
            base: '0 2px 12px rgba(224,123,83,0.2)',
            _dark: '0 2px 12px rgba(224,123,83,0.15)',
        },
    },
});

const aiButtonClass = css({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '1.5',
    py: '1.5',
    px: '3',
    borderRadius: 'full',
    fontSize: 'xs',
    fontWeight: '600',
    cursor: 'pointer',
    border: '1px solid rgba(147,51,234,0.35)',
    background: 'linear-gradient(135deg, rgba(147,51,234,0.07) 0%, rgba(224,123,83,0.07) 100%)',
    color: 'rgb(109,40,217)',
    letterSpacing: '0.01em',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(4px)',
    _hover: {
        background: 'linear-gradient(135deg, rgba(147,51,234,0.15) 0%, rgba(224,123,83,0.12) 100%)',
        borderColor: 'rgba(147,51,234,0.55)',
        boxShadow: {
            base: '0 2px 12px rgba(147,51,234,0.25)',
            _dark: '0 2px 12px rgba(147,51,234,0.2)',
        },
    },
});
