'use client';

import { Lock } from 'lucide-react';

import { css } from 'styled-system/css';

interface FlowEditorOverlayProps {
    titleDone: boolean;
}

export function FlowEditorOverlay({ titleDone }: FlowEditorOverlayProps) {
    return (
        <div
            className={css({
                position: 'absolute',
                inset: 0,
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3',
                backdropFilter: 'blur(6px)',
                background: {
                    base: 'rgba(248,248,248,0.82)',
                    _dark: 'rgba(10,10,10,0.82)',
                },
                pointerEvents: 'all',
            })}
        >
            <div
                className={css({
                    w: '12',
                    h: '12',
                    borderRadius: 'full',
                    bg: {
                        base: 'rgba(224,123,83,0.12)',
                        _dark: 'rgba(224,123,83,0.18)',
                    },
                    border: '2px solid',
                    borderColor: 'rgba(224,123,83,0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'brand.primary',
                    mb: '2',
                })}
            >
                <Lock size={22} />
            </div>
            <span
                className={css({
                    fontSize: 'lg',
                    fontWeight: '700',
                    color: 'text',
                })}
            >
                Ablauf-Editor gesperrt
            </span>
            <span
                className={css({
                    fontSize: 'sm',
                    color: 'text.muted',
                    textAlign: 'center',
                    maxWidth: '280px',
                })}
            >
                {!titleDone
                    ? 'Bitte gib zuerst einen Titel ein.'
                    : 'Bitte wähle zuerst eine Kategorie aus.'}
            </span>
        </div>
    );
}
