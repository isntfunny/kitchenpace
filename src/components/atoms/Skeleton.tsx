import { css, cx } from 'styled-system/css';

const baseClass = css({
    borderRadius: 'md',
    animation: 'skeletonPulse 1.6s ease-in-out infinite',
    bg: { base: 'rgba(0,0,0,0.08)', _dark: 'rgba(255,255,255,0.08)' },
});

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
    return <div className={cx(baseClass, className)} style={style} aria-hidden />;
}
