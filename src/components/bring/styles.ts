import { css } from 'styled-system/css';

export const card = css({
    bg: 'surface',
    color: 'text',
    fontFamily: 'body',
    borderRadius: '2xl',
    p: { base: '4', md: '5' },
    boxShadow: 'shadow.medium',
});
export const stack = css({ display: 'flex', flexDirection: 'column', gap: '4', minW: 0 });
export const row = css({ display: 'flex', alignItems: 'center', gap: '3', flexWrap: 'wrap' });
export const label = css({
    display: 'flex',
    flexDirection: 'column',
    gap: '2',
    fontFamily: 'body',
    fontSize: 'sm',
    fontWeight: '500',
    color: 'text',
    minW: 0,
});
export const field = css({
    width: '100%',
    fontFamily: 'body',
    fontSize: 'md',
    fontWeight: '400',
    bg: 'surface',
    color: 'text',
    border: '1px solid',
    borderColor: 'border',
    borderRadius: 'md',
    px: '4',
    py: '2',
    minH: '11',
    transition: 'border-color 150ms ease-in-out',
    _placeholder: { color: 'text-muted' },
    _hover: { borderColor: 'primary' },
    _focusVisible: { outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' },
    _disabled: { opacity: 0.5, cursor: 'not-allowed' },
});
export const checkbox = css({
    width: '5',
    height: '5',
    flexShrink: 0,
    accentColor: 'primary',
    _dark: { colorScheme: 'dark' },
    cursor: 'pointer',
    _focusVisible: { outline: '2px solid', outlineColor: 'primary', outlineOffset: '3px' },
    _disabled: { cursor: 'not-allowed', opacity: 0.5 },
});
export const muted = css({ color: 'text-muted', fontFamily: 'body', fontSize: 'sm' });
export const link = css({
    color: 'primary',
    fontFamily: 'body',
    fontWeight: '500',
    textDecoration: 'underline',
    textUnderlineOffset: '3px',
    borderRadius: 'sm',
    _focusVisible: { outline: '2px solid', outlineColor: 'primary', outlineOffset: '3px' },
});
export const itemRow = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '3',
    flexWrap: 'wrap',
    p: '3',
    border: '1px solid',
    borderColor: 'border',
    borderRadius: 'xl',
    bg: 'background',
});

export const dialogOverlay = css({
    position: 'fixed',
    inset: 0,
    bg: 'surface.overlay',
    backdropFilter: 'blur(8px)',
    zIndex: 70,
});

export const dialogContent = css({
    position: 'fixed',
    zIndex: 71,
    bg: 'surface',
    color: 'text',
    p: { base: '4', md: '6' },
    pb: 'max(24px, env(safe-area-inset-bottom))',
    fontFamily: 'body',
    overscrollBehavior: 'contain',
    boxShadow: 'shadow.medium',
    overflowY: 'auto',
    maxH: '90dvh',
    width: { base: '100%', md: 'min(560px, 90vw)' },
    bottom: { base: 0, md: 'auto' },
    top: { md: '50%' },
    left: { base: 0, md: '50%' },
    transform: { md: 'translate(-50%, -50%)' },
    borderTopRadius: '2xl',
    borderBottomRadius: { base: '0', md: '2xl' },
});
