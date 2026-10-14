import { css } from 'styled-system/css';

export const card = css({
    bg: 'surface',
    borderRadius: '2xl',
    p: { base: '4', md: '6' },
    boxShadow: 'shadow.medium',
});
export const stack = css({ display: 'flex', flexDirection: 'column', gap: '4' });
export const row = css({ display: 'flex', alignItems: 'center', gap: '3', flexWrap: 'wrap' });
export const field = css({
    width: '100%',
    bg: 'surface',
    color: 'text',
    border: '1px solid',
    borderColor: 'border',
    borderRadius: 'md',
    p: '3',
    minH: '11',
    _focusVisible: { outline: '2px solid', outlineColor: 'primary' },
});
export const muted = css({ color: 'text-muted', fontSize: 'sm' });
export const heading = css({ fontFamily: 'heading', fontSize: 'xl', fontWeight: '600' });
