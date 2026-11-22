// Shared style recipes of the design system (KUC-136). Every feature builds its buttons,
// chips, inputs and sheets from these; no feature keeps its own copy. Semantic tokens
// only, so light, dark and retro follow the theme.
import { css, cva } from 'styled-system/css';

const focusRing = { outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' };

/** Text button: primary for the one main action, outline for the rest, ghost in toolbars. */
export const button = cva({
    base: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2',
        borderRadius: 'control',
        borderWidth: '1px',
        borderStyle: 'solid',
        fontFamily: 'body',
        fontWeight: '600',
        lineHeight: '1.2',
        cursor: 'pointer',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        transition: 'all 150ms ease',
        _focusVisible: focusRing,
        _disabled: { opacity: 0.5, cursor: 'not-allowed' },
    },
    variants: {
        variant: {
            primary: {
                bg: 'primary',
                borderColor: 'primary',
                color: 'white',
                _hover: { bg: 'brand.primary-dark', borderColor: 'brand.primary-dark' },
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
            danger: {
                bg: 'surface',
                borderColor: 'border',
                color: 'status.danger',
                _hover: { borderColor: 'status.danger' },
            },
        },
        size: {
            sm: { minH: '32px', px: '3', fontSize: 'sm' },
            md: { minH: '40px', px: '4', fontSize: 'sm' },
            lg: { minH: '48px', px: '6', fontSize: 'md' },
        },
        block: { true: { width: '100%' } },
    },
    defaultVariants: { variant: 'outline', size: 'md' },
});

/** Round button with only an icon (steppers, close, toolbar). Always give it an aria-label. */
export const iconButton = cva({
    base: {
        display: 'inline-grid',
        placeItems: 'center',
        flexShrink: 0,
        borderRadius: 'full',
        borderWidth: '1px',
        borderStyle: 'solid',
        cursor: 'pointer',
        transition: 'all 150ms ease',
        _focusVisible: focusRing,
        _disabled: { opacity: 0.45, cursor: 'not-allowed' },
    },
    variants: {
        variant: {
            outline: {
                bg: 'surface',
                borderColor: 'border',
                color: 'primary',
                _hover: { bg: 'accent.soft' },
            },
            ghost: {
                bg: 'transparent',
                borderColor: 'transparent',
                color: 'foreground.muted',
                _hover: { bg: 'accent.soft', color: 'text' },
            },
        },
        size: {
            sm: { w: '32px', h: '32px' },
            md: { w: '44px', h: '44px' },
        },
    },
    defaultVariants: { variant: 'outline', size: 'md' },
});

/** Pill to pick or filter; `active` marks the chosen one. */
export const chip = cva({
    base: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.5',
        minH: '36px',
        px: '3',
        borderRadius: 'full',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'border',
        bg: 'surface',
        color: 'text',
        fontFamily: 'body',
        fontSize: 'sm',
        fontWeight: '500',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 150ms ease',
        _hover: { borderColor: 'primary' },
        _focusVisible: focusRing,
        _disabled: { opacity: 0.45, cursor: 'not-allowed' },
    },
    variants: {
        active: {
            true: { bg: 'primary', borderColor: 'primary', color: 'white' },
        },
    },
});

/** Small uppercase label above a field. */
export const fieldLabel = css({
    fontSize: 'xs',
    fontWeight: '700',
    color: 'foreground.muted',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
});

/** Text, number, time and select fields. */
export const input = css({
    minH: '40px',
    px: '3',
    borderRadius: 'lg',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'border',
    bg: 'background',
    color: 'text',
    fontSize: 'sm',
    fontFamily: 'body',
    _focusVisible: { outline: '2px solid', outlineColor: 'primary', outlineOffset: '1px' },
    _disabled: { opacity: 0.5, cursor: 'not-allowed' },
});

/** Inline status or error text under a form. */
export const notice = cva({
    base: { fontSize: 'sm', fontFamily: 'body', m: '0' },
    variants: {
        tone: {
            muted: { color: 'foreground.muted' },
            error: { color: 'status.error' },
            success: { color: 'status.success' },
        },
    },
    defaultVariants: { tone: 'muted' },
});

export const sheetOverlay = css({
    position: 'fixed',
    inset: 0,
    bg: 'surface.overlay',
    backdropFilter: 'blur(8px)',
    zIndex: 70,
});

/**
 * Dialog surface. `dialog`: bottom sheet on phones, centered from md. `side`: bottom sheet
 * on phones, panel on the right from md. `full`: full screen on phones, large dialog from md.
 */
export const sheet = cva({
    base: {
        position: 'fixed',
        zIndex: 71,
        bg: 'surface',
        color: 'text',
        fontFamily: 'body',
        overscrollBehavior: 'contain',
        boxShadow: 'shadow.medium',
        overflowY: 'auto',
        _focusVisible: { outline: 'none' },
    },
    variants: {
        placement: {
            dialog: {
                p: { base: '4', md: '6' },
                pb: 'max(20px, env(safe-area-inset-bottom))',
                maxH: '92dvh',
                bottom: { base: 0, md: 'auto' },
                top: { md: '50%' },
                left: { base: 0, md: '50%' },
                transform: { md: 'translate(-50%, -50%)' },
                borderTopRadius: '2xl',
                borderBottomRadius: { base: '0', md: '2xl' },
            },
            side: {
                p: { base: '4', md: '6' },
                pb: 'max(20px, env(safe-area-inset-bottom))',
                maxH: { base: '92dvh', md: '100dvh' },
                bottom: 0,
                left: { base: 0, md: 'auto' },
                right: { md: 0 },
                top: { md: 0 },
                borderTopRadius: { base: '2xl', md: '0' },
            },
            full: {
                inset: { base: 0, md: 'auto' },
                top: { md: '50%' },
                left: { md: '50%' },
                transform: { md: 'translate(-50%, -50%)' },
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'hidden',
                borderRadius: { base: '0', md: '2xl' },
            },
        },
        size: {
            sm: { width: { base: '100%', md: 'min(440px, 92vw)' } },
            md: { width: { base: '100%', md: 'min(560px, 92vw)' } },
            lg: { width: { base: '100%', md: 'min(760px, 94vw)' } },
            xl: {
                width: { base: '100%', md: 'min(1180px, 96vw)' },
                h: { md: 'min(860px, 94dvh)' },
            },
        },
    },
    defaultVariants: { placement: 'dialog', size: 'md' },
});
