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

const DURATION = 1.5;
const DOTS = 3;

function LaneDots({
    delay = 0,
    fromColor,
    toColor,
}: {
    delay?: number;
    fromColor: string;
    toColor: string;
}) {
    return (
        <>
            {Array.from({ length: DOTS }).map((_, i) => {
                const d = delay - (DURATION / DOTS) * i;
                const r = i === 0 ? 2.8 : 2;
                return (
                    <circle key={i} cx={50} cy={0} r={r}>
                        <animate
                            attributeName="cy"
                            from={-4}
                            to={40}
                            dur={`${DURATION}s`}
                            begin={`${d}s`}
                            repeatCount="indefinite"
                            calcMode="linear"
                        />
                        <animate
                            attributeName="fill"
                            values={`${fromColor};${toColor}`}
                            keyTimes="0;1"
                            dur={`${DURATION}s`}
                            begin={`${d}s`}
                            repeatCount="indefinite"
                            calcMode="linear"
                        />
                        <animate
                            attributeName="opacity"
                            values="0;0.85;0.85;0"
                            keyTimes="0;0.08;0.88;1"
                            dur={`${DURATION}s`}
                            begin={`${d}s`}
                            repeatCount="indefinite"
                        />
                    </circle>
                );
            })}
        </>
    );
}

const FALLBACK = '#e07b53';

export function FlowConnector({
    prevColumnSpans,
    nextColumnSpans,
    prevColors,
    nextColors,
}: FlowConnectorProps) {
    const laneCount = Math.max(prevColumnSpans.length, nextColumnSpans.length);
    // Use prev spans for the grid; if next has more lanes they appear as extra cells
    const templateColumns = prevColumnSpans.map((s) => `${s}fr`).join(' ');

    return (
        <div className={wrapClass} style={{ gridTemplateColumns: templateColumns }}>
            {Array.from({ length: prevColumnSpans.length }).map((_, i) => {
                const from = prevColors[i] ?? FALLBACK;
                const to = nextColors[i] ?? nextColors[0] ?? FALLBACK;
                return (
                    <div key={i} className={cellClass}>
                        <div
                            className={trackClass}
                            style={{ background: `linear-gradient(to bottom, ${from}22, ${to}22)` }}
                        />
                        <svg
                            viewBox="0 0 100 36"
                            preserveAspectRatio="xMidYMid meet"
                            className={svgClass}
                            overflow="visible"
                        >
                            <LaneDots
                                delay={-(DURATION / laneCount) * i}
                                fromColor={from}
                                toColor={to}
                            />
                        </svg>
                    </div>
                );
            })}
        </div>
    );
}

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
    overflow: 'visible',
});

const trackClass = css({
    position: 'absolute',
    top: '0',
    bottom: '0',
    left: '50%',
    transform: 'translateX(-50%)',
    w: '1px',
});

const svgClass = css({
    position: 'absolute',
    top: '0',
    left: '0',
    w: '100%',
    h: '100%',
    overflow: 'visible',
});
