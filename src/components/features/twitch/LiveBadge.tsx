import { css } from 'styled-system/css';

interface LiveBadgeProps {
    size?: 'sm' | 'md';
}

const dotStyles = {
    sm: css({
        width: '6px',
        height: '6px',
    }),
    md: css({
        width: '8px',
        height: '8px',
    }),
};

const textStyles = {
    sm: css({
        fontSize: '11px',
        letterSpacing: '0.04em',
    }),
    md: css({
        fontSize: '13px',
        letterSpacing: '0.05em',
    }),
};

export function LiveBadge({ size = 'md' }: LiveBadgeProps) {
    return (
        <span
            className={css({
                display: 'inline-flex',
                alignItems: 'center',
                gap: '1.5',
                bg: '#e91916',
                color: 'white',
                borderRadius: 'control',
                fontWeight: '700',
                fontFamily: 'body',
                textTransform: 'uppercase',
                lineHeight: '1',
                px: size === 'sm' ? '1.5' : '2',
                py: size === 'sm' ? '0.5' : '1',
            })}
        >
            <span
                className={`${css({
                    display: 'block',
                    borderRadius: 'full',
                    bg: 'white',
                    flexShrink: 0,
                    animation: 'livePulse 1.4s ease-in-out infinite',
                })} ${dotStyles[size]}`}
            />
            <span className={textStyles[size]}>Live</span>
        </span>
    );
}
