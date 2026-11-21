// Shared styles of the meal plan UI (KUC-99/100/102), built on semantic tokens
// so light and dark mode follow the theme.
import { css, cva } from 'styled-system/css';

export const overlay = css({
    position: 'fixed',
    inset: 0,
    bg: 'surface.overlay',
    backdropFilter: 'blur(8px)',
    zIndex: 70,
});

/** Bottom sheet on phones, centered dialog from md on. */
export const sheet = css({
    position: 'fixed',
    zIndex: 71,
    bg: 'surface',
    color: 'text',
    p: { base: '4', md: '6' },
    pb: 'max(20px, env(safe-area-inset-bottom))',
    fontFamily: 'body',
    overscrollBehavior: 'contain',
    boxShadow: 'shadow.medium',
    overflowY: 'auto',
    maxH: '92dvh',
    width: { base: '100%', md: 'min(560px, 92vw)' },
    bottom: { base: 0, md: 'auto' },
    top: { md: '50%' },
    left: { base: 0, md: '50%' },
    transform: { md: 'translate(-50%, -50%)' },
    borderTopRadius: '2xl',
    borderBottomRadius: { base: '0', md: '2xl' },
    _focusVisible: { outline: 'none' },
});

export const sheetWide = css({ width: { md: 'min(760px, 94vw)' } });

export const chip = cva({
    base: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.5',
        minH: '36px',
        px: '3',
        borderRadius: 'full',
        border: '1px solid',
        borderColor: 'border',
        bg: 'surface',
        color: 'text',
        fontSize: 'sm',
        fontWeight: '500',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 150ms ease',
        _hover: { borderColor: 'primary' },
        _focusVisible: { outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' },
        _disabled: { opacity: 0.45, cursor: 'not-allowed' },
    },
    variants: {
        active: {
            true: {
                bg: 'primary',
                borderColor: 'primary',
                color: 'white',
                _hover: { borderColor: 'primary' },
            },
        },
    },
});

export const iconButton = css({
    display: 'inline-grid',
    placeItems: 'center',
    w: '44px',
    h: '44px',
    flexShrink: 0,
    borderRadius: 'full',
    border: '1px solid',
    borderColor: 'border',
    bg: 'surface',
    color: 'primary',
    cursor: 'pointer',
    _hover: { bg: 'accent.soft' },
    _focusVisible: { outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' },
    _disabled: { opacity: 0.45, cursor: 'not-allowed' },
});

export const actionButton = cva({
    base: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2',
        minH: '40px',
        px: '4',
        borderRadius: 'control',
        border: '1px solid',
        fontSize: 'sm',
        fontWeight: '600',
        fontFamily: 'body',
        cursor: 'pointer',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        transition: 'all 150ms ease',
        _focusVisible: { outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' },
        _disabled: { opacity: 0.5, cursor: 'not-allowed' },
    },
    variants: {
        variant: {
            primary: {
                bg: 'primary',
                borderColor: 'primary',
                color: 'white',
                _hover: { opacity: 0.9 },
            },
            outline: {
                bg: 'surface',
                borderColor: 'border',
                color: 'text',
                _hover: { borderColor: 'primary', color: 'primary' },
            },
            ghost: {
                bg: 'transparent',
                borderColor: 'transparent',
                color: 'text',
                _hover: { bg: 'accent.soft' },
            },
        },
    },
    defaultVariants: { variant: 'outline' },
});

export const fieldLabel = css({
    fontSize: 'xs',
    fontWeight: '700',
    color: 'foreground.muted',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
});

export const input = css({
    minH: '40px',
    px: '3',
    borderRadius: 'lg',
    border: '1px solid',
    borderColor: 'border',
    bg: 'background',
    color: 'text',
    fontSize: 'sm',
    fontFamily: 'body',
    _focusVisible: { outline: '2px solid', outlineColor: 'primary', outlineOffset: '1px' },
});

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
