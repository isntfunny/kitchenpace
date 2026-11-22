// Shared styles of the meal plan UI (KUC-99/100/102), built on semantic tokens
// so light and dark mode follow the theme.
import { css, cva } from 'styled-system/css';

export const marker = cva({
    base: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '1',
        mt: '1',
        px: '1.5',
        py: '0.5',
        borderRadius: 'full',
        fontSize: '11px',
        fontWeight: '600',
        lineHeight: '1.3',
        maxW: '100%',
    },
    variants: {
        tone: {
            ok: { bg: 'status.success/14', color: 'status.success' },
            warn: { bg: 'palette.gold/18', color: { base: '#8a6a00', _dark: 'palette.gold' } },
            rest: { bg: 'palette.purple/14', color: 'palette.purple' },
            start: { bg: 'accent.soft', color: 'primary' },
            off: { bg: 'surface.muted', color: 'foreground.muted' },
        },
    },
});

export const emptySlot = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minH: '44px',
    px: '2',
    border: '1.5px dashed',
    borderColor: 'border',
    borderRadius: 'lg',
    bg: 'transparent',
    color: 'foreground.muted',
    fontSize: 'xs',
    fontFamily: 'body',
    cursor: 'pointer',
    transition: 'all 150ms ease',
    _hover: { borderColor: 'primary', color: 'primary', bg: 'accent.soft' },
    _focusVisible: { outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' },
});
