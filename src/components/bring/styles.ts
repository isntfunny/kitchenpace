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
export const link = css({
    color: 'primary',
    fontFamily: 'body',
    fontWeight: '500',
    textDecoration: 'underline',
    textUnderlineOffset: '3px',
    borderRadius: 'sm',
    _focusVisible: { outline: '2px solid', outlineColor: 'primary', outlineOffset: '3px' },
});

