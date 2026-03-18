import { css } from 'styled-system/css';

export const errorWrapperClass = css({
    mb: '6',
});

// formCardClass lives in styles-input-processing.ts (shared via bulk-import-styles barrel)
export { formCardClass as formWrapperClass } from './styles-input-processing';

export const inputClass = css({
    width: '100%',
    px: '4',
    py: '3',
    borderRadius: 'lg',
    border: '1.5px solid',
    borderColor: { base: 'rgba(224,123,83,0.3)', _dark: 'rgba(224,123,83,0.35)' },
    fontSize: 'md',
    outline: 'none',
    transition: 'all 0.15s ease',
    bg: { base: 'transparent', _dark: 'surface' },
    color: 'text',
    _focus: {
        borderColor: 'palette.orange',
        boxShadow: {
            base: '0 0 0 3px rgba(224,123,83,0.1)',
            _dark: '0 0 0 3px rgba(224,123,83,0.15)',
        },
    },
    _placeholder: {
        color: 'text.muted',
    },
});

export const buttonIconClass = css({
    width: '18px',
    height: '18px',
    flexShrink: 0,
});

export const buttonIconSmallClass = css({
    width: '16px',
    height: '16px',
    flexShrink: 0,
});

export const buttonIconRightClass = css({
    width: '16px',
    height: '16px',
    marginLeft: '1',
});

export const hintWrapperClass = css({
    mt: '6',
    textAlign: 'center',
});

export const hintTextClass = css({
    fontSize: 'sm',
    color: 'text.muted',
});

// secondaryButtonClass lives in styles-input-processing.ts (shared via bulk-import-styles barrel)
export { secondaryButtonClass } from './styles-input-processing';
