'use client';

import { ChefHat } from 'lucide-react';

import { PALETTE } from '@app/lib/palette';

import { css } from 'styled-system/css';

import {
    AI_KEYFRAMES,
    PLACEHOLDER_TEXT,
    PROCESSING_STEPS,
    orbitDot,
    stepInactiveBgStyle,
    stepTextDoneStyle,
    stepTextInactiveStyle,
} from './ai-dialog-styles';

/* -- Input Phase ----------------------------------------------- */

export function InputPhase({ text, onChange }: { text: string; onChange: (v: string) => void }) {
    return (
        <div>
            <p
                className={css({
                    margin: '0 0 12px',
                    fontSize: '13px',
                    color: 'text.muted',
                    lineHeight: 1.6,
                })}
            >
                Füge dein Rezept in Textform ein. Die KI erkennt automatisch Zutaten, Schritte und
                deren Reihenfolge und erstellt daraus einen visuellen Flow.
            </p>
            <textarea
                value={text}
                onChange={(e) => onChange(e.target.value)}
                placeholder={PLACEHOLDER_TEXT}
                className={css({
                    width: '100%',
                    minHeight: '240px',
                    border: '1.5px solid rgba(224,123,83,0.35)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    lineHeight: 1.65,
                    resize: 'vertical',
                    outline: 'none',
                    color: 'text',
                    backgroundColor: 'surface',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s ease',
                })}
                onFocus={(e) => (e.target.style.borderColor = PALETTE.orange)}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(224,123,83,0.35)')}
                autoFocus
            />
            <p className={css({ margin: '8px 0 0', fontSize: '11px', color: 'text.light' })}>
                Tipp: Kopiere einfach ein Rezept aus dem Internet oder tippe es ab.
            </p>
        </div>
    );
}

/* -- Processing Phase ------------------------------------------ */

export function ProcessingPhase({ stepIndex }: { stepIndex: number }) {
    return (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
            {/* Animated orb */}
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '28px' }}>
                <div
                    style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${PALETTE.orange} 0%, ${PALETTE.gold} 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: 'aiPulse 1.4s ease-in-out infinite',
                        boxShadow: '0 0 0 0 rgba(224,123,83,0.4)',
                    }}
                >
                    <ChefHat style={{ width: '36px', height: '36px', color: 'white' }} />
                </div>
                {/* Orbiting sparkle dots */}
                <div style={orbitDot(0)} />
                <div style={orbitDot(1)} />
                <div style={orbitDot(2)} />
            </div>

            <h3
                className={css({
                    margin: '0 0 6px',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: 'text',
                })}
            >
                KI analysiert dein Rezept...
            </h3>
            <p className={css({ margin: '0 0 28px', fontSize: '13px', color: 'text.muted' })}>
                Das dauert nur einen Moment
            </p>

            {/* Step log */}
            <div
                style={{
                    textAlign: 'left',
                    maxWidth: '340px',
                    margin: '0 auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                }}
            >
                {PROCESSING_STEPS.map((step, i) => {
                    const done = i < stepIndex;
                    const active = i === stepIndex;
                    return (
                        <div
                            key={step}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                opacity: i > stepIndex ? 0.3 : 1,
                                transition: 'opacity 0.3s ease',
                            }}
                        >
                            <div
                                style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    flexShrink: 0,
                                    backgroundColor: done
                                        ? PALETTE.orange
                                        : active
                                          ? 'rgba(224,123,83,0.2)'
                                          : undefined,
                                    border: active
                                        ? `2px solid ${PALETTE.orange}`
                                        : '2px solid transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.3s ease',
                                }}
                                className={!done && !active ? stepInactiveBgStyle : undefined}
                            >
                                {done && (
                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                        <path
                                            d="M2 5l2.5 2.5L8 3"
                                            stroke="white"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                )}
                                {active && (
                                    <div
                                        style={{
                                            width: '6px',
                                            height: '6px',
                                            borderRadius: '50%',
                                            backgroundColor: PALETTE.orange,
                                            animation: 'aiDotPulse 0.8s ease-in-out infinite',
                                        }}
                                    />
                                )}
                            </div>
                            <span
                                style={{
                                    fontSize: '13px',
                                    color: done ? undefined : active ? PALETTE.orange : undefined,
                                    fontWeight: active || done ? 500 : 400,
                                    transition: 'color 0.3s ease',
                                }}
                                className={
                                    done
                                        ? stepTextDoneStyle
                                        : active
                                          ? undefined
                                          : stepTextInactiveStyle
                                }
                            >
                                {step}
                            </span>
                        </div>
                    );
                })}
            </div>

            <style>{AI_KEYFRAMES}</style>
        </div>
    );
}
