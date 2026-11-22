// Bring! layout only; buttons, fields and labels come from components/atoms/recipes.
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
/** Label above its field; the caption uses fieldLabel, the field the input recipe. */
export const fieldGroup = css({ display: 'flex', flexDirection: 'column', gap: '2', minW: 0 });
export const link = css({
    color: 'primary',
    fontFamily: 'body',
    fontWeight: '500',
    textDecoration: 'underline',
    textUnderlineOffset: '3px',
    borderRadius: 'sm',
    _focusVisible: { outline: '2px solid', outlineColor: 'primary', outlineOffset: '3px' },
});
