import type React from 'react';

import { PALETTE } from '@app/lib/palette';

import { css } from 'styled-system/css';

/* -- Processing step labels ------------------------------------ */

export const PROCESSING_STEPS = [
    'Rezepttext wird analysiert...',
    'Zutaten werden erkannt...',
    'Zubereitungsschritte werden identifiziert...',
    'Flow-Struktur wird generiert...',
    'Verbindungen werden optimiert...',
];

/* -- Placeholder text for input textarea ----------------------- */

export const PLACEHOLDER_TEXT = `Beispiel:

Für den Teig:
- 200g Mehl
- 100g Butter
- 2 Eier
- 1 Prise Salz

1. Mehl, Butter und Salz vermischen bis eine krümelige Masse entsteht.
2. Eier hinzufügen und zu einem glatten Teig kneten.
3. Teig 30 Minuten kalt stellen.
4. Teig ausrollen und in die Form legen.
5. Bei 180°C für 25 Minuten backen.`;

/* -- Orbit dot helper for processing animation ----------------- */

export function orbitDot(index: number): React.CSSProperties {
    const startDeg = index * 120;
    return {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: index === 0 ? PALETTE.orange : index === 1 ? PALETTE.gold : '#ff8c69',
        marginTop: '-4px',
        marginLeft: '-4px',
        animation: `aiOrbit ${1.8 + index * 0.3}s linear infinite`,
        // @ts-expect-error CSS custom property
        '--start': `${startDeg}deg`,
    };
}

/* -- Shared CSS class names ------------------------------------ */

export const overlayStyle = css({
    position: 'fixed',
    inset: 0,
    backgroundColor: 'surface.overlay',
    backdropFilter: 'blur(4px)',
    zIndex: 9000,
    animation: 'fadeIn 0.2s ease',
});

export const contentStyle = css({
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 9001,
    backgroundColor: 'surface',
    borderRadius: '20px',
    boxShadow: 'shadow.dialogLg',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transition: 'width 0.2s ease',
});

export const dialogTitleStyle = css({
    margin: 0,
    fontSize: '16px',
    fontWeight: 700,
    color: 'text',
    lineHeight: 1.2,
});

export const dialogSubtitleStyle = css({
    margin: 0,
    fontSize: '12px',
    color: 'text.muted',
    marginTop: '2px',
});

export const closeButtonStyle = css({
    width: '30px',
    height: '30px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'bg.close',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
});

export const closeIconStyle = css({
    width: '14px',
    height: '14px',
    color: 'text.muted',
});

export const disabledButtonStyle = css({
    backgroundColor: 'disabled.bg',
    color: 'disabled.text',
});

export const flowOnlyButtonStyle = css({
    padding: '8px 18px',
    borderRadius: '999px',
    border: '1.5px solid',
    borderColor: 'border.medium',
    backgroundColor: 'transparent',
    color: 'text.muted',
    fontWeight: 600,
    fontSize: '13px',
    cursor: 'pointer',
});

/* -- Processing step inactive style ---------------------------- */

export const stepInactiveBgStyle = css({ backgroundColor: 'step.inactiveBg' });

/* -- Processing step text styles ------------------------------- */

export const stepTextDoneStyle = css({ color: 'text' });

export const stepTextInactiveStyle = css({ color: 'text.light' });

/* -- Keyframes (injected as <style>) --------------------------- */

export const AI_KEYFRAMES = `
    @keyframes aiPulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(224,123,83,0.4); transform: scale(1); }
        50% { box-shadow: 0 0 0 16px rgba(224,123,83,0); transform: scale(1.04); }
    }
    @keyframes aiDotPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
    }
    @keyframes aiOrbit {
        from { transform: rotate(var(--start)) translateX(52px) rotate(calc(-1 * var(--start))); }
        to { transform: rotate(calc(var(--start) + 360deg)) translateX(52px) rotate(calc(-1 * (var(--start) + 360deg))); }
    }
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
`;
