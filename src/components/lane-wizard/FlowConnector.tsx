'use client';

import { css } from 'styled-system/css';

interface FlowConnectorProps {
    prevColumnSpans: number[];
    nextColumnSpans: number[];
    /** Accent color of the last real step in each prev lane */
    prevColors: string[];
    /** Accent color of the first real step in each next lane */
    nextColors: string[];
}

export function FlowConnector({
    prevColumnSpans,
    nextColumnSpans,
    prevColors,
    nextColors,
}: FlowConnectorProps) {
    const FALLBACK = '#e07b53';
    /* Use whichever side has more lanes so every line is shown */
    const useNext = nextColumnSpans.length >= prevColumnSpans.length;
    const spans = useNext ? nextColumnSpans : prevColumnSpans;
    const templateColumns = spans.map((s) => `${s}fr`).join(' ');

    return (
        <div className={wrapClass} style={{ gridTemplateColumns: templateColumns }}>
            {Array.from({ length: spans.length }).map((_, i) => {
                const from = prevColors[i] ?? prevColors[0] ?? FALLBACK;
                const to = nextColors[i] ?? nextColors[0] ?? FALLBACK;
                return (
                    <div key={i} className={cellClass}>
                        {/* Static gradient track */}
                        <div
                            className={trackClass}
                            style={{
                                background: `linear-gradient(to bottom, ${from}44, ${to}44)`,
                            }}
                        />
                        {/* Animated shimmer glow */}
                        <div
                            className={shimmerClass}
                            style={{
                                background: `radial-gradient(ellipse, ${from}88, ${to}44, transparent)`,
                                animationDelay: `${i * 0.3}s`,
                            }}
                        />
                    </div>
                );
            })}
        </div>
    );
}

/** Small connector between cards within the same lane */
export function IntraLaneConnector({
    fromColor,
    toColor,
}: {
    fromColor: string;
    toColor: string;
}) {
    return (
        <div className={intraWrapClass}>
            <div
                className={trackClass}
                style={{ background: `linear-gradient(to bottom, ${fromColor}44, ${toColor}44)` }}
            />
            <div
                className={shimmerClass}
                style={{
                    background: `radial-gradient(ellipse, ${fromColor}88, ${toColor}44, transparent)`,
                }}
            />
        </div>
    );
}

const intraWrapClass = css({
    position: 'relative',
    flexShrink: '0',
    h: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
});

const wrapClass = css({
    flexShrink: '0',
    h: '36px',
    display: 'grid',
});

const cellClass = css({
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
});

const trackClass = css({
    position: 'absolute',
    top: '0',
    bottom: '0',
    left: '50%',
    transform: 'translateX(-50%)',
    w: '2px',
});

const shimmerClass = css({
    position: 'absolute',
    left: '50%',
    ml: '-5px',
    w: '10px',
    h: '16px',
    borderRadius: '50%',
    filter: 'blur(3px)',
    animation: 'shimmerDown 2s ease-in-out infinite',
});
