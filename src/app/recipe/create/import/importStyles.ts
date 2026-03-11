import { css } from 'styled-system/css';

export const containerClass = css({
    maxWidth: '640px',
    mx: 'auto',
    px: '6',
    py: '12',
});

export const headerClass = css({
    textAlign: 'center',
    mb: '8',
});

export const iconWrapperClass = css({
    width: '72px',
    height: '72px',
    borderRadius: '20px',
    background: 'linear-gradient(135deg, #e07b53 0%, #f8b500 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    mx: 'auto',
    mb: '5',
    boxShadow: {
        base: '0 8px 32px rgba(224,123,83,0.35)',
        _dark: '0 8px 32px rgba(224,123,83,0.2)',
    },
});

export const iconClass = css({
    width: '32px',
    height: '32px',
    color: 'white',
});

export const titleClass = css({
    fontSize: '2xl',
    fontWeight: '800',
    color: 'text',
    mb: '2',
});

export const subtitleClass = css({
    fontSize: 'md',
    color: 'text.muted',
    lineHeight: '1.6',
});

export const labelClass = css({
    display: 'block',
    fontSize: 'sm',
    fontWeight: '600',
    color: 'text',
    mb: '2',
});

export const primaryButtonClass = css({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2',
    width: '100%',
    mt: '4',
    px: '6',
    py: '3',
    borderRadius: 'xl',
    border: 'none',
    background: 'linear-gradient(135deg, #e07b53 0%, #f8b500 100%)',
    color: 'white',
    fontSize: 'md',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    _disabled: {
        opacity: 0.5,
        cursor: 'not-allowed',
    },
});
