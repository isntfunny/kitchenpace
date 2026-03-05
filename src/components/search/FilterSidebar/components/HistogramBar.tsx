'use client';

import { Tooltip } from 'radix-ui';

import { css } from 'styled-system/css';

import type { HistogramFacet } from '../../useRecipeSearch';

const histogramContainerClass = css({
    position: 'relative',
    height: '32px',
    display: 'flex',
    alignItems: 'flex-end',
    gap: '2px',
    userSelect: 'none',
});

const histogramBarClass = css({
    flex: 1,
    borderRadius: 'sm',
    transition: 'opacity 150ms ease, transform 120ms ease',
});

type HistogramBarProps = {
    facet: HistogramFacet;
    min: number;
    max: number;
    interval: number;
    onClick?: (value: number) => void;
};

export function HistogramBar({ facet, min, max, interval, onClick }: HistogramBarProps) {
    const buckets = facet.buckets ?? [];
    if (buckets.length === 0) return null;

    const domainMin = min;
    const domainMax = max;

    const maxCount = Math.max(...buckets.map((b) => b.count), 1);

    const sortedBuckets = [...buckets].sort((a, b) => a.key - b.key);

    return (
        <div className={histogramContainerClass}>
            {sortedBuckets.map((bucket) => {
                const bucketStart = bucket.key;
                const bucketEnd = bucket.key + interval;

                const overlapsRange = bucketEnd > domainMin && bucketStart < domainMax;
                const heightPercent = (bucket.count / maxCount) * 100;
                const intensity = Math.max(0.18, bucket.count / maxCount);

                const backgroundColor = overlapsRange
                    ? `rgba(249, 115, 22, ${intensity})`
                    : 'rgba(180, 190, 197, 0.35)';
                const cursor = overlapsRange ? 'pointer' : 'not-allowed';
                const opacity = overlapsRange ? 1 : 0.6;

                return (
                    <Tooltip.Provider key={bucket.key} delayDuration={200}>
                        <Tooltip.Root>
                            <Tooltip.Trigger asChild>
                                <div
                                    className={histogramBarClass}
                                    style={{
                                        height: `${heightPercent}%`,
                                        backgroundColor,
                                        cursor,
                                        opacity,
                                    }}
                                    onClick={(e) => {
                                        if (!overlapsRange) return;
                                        e.stopPropagation();
                                        onClick?.(bucket.key);
                                    }}
                                />
                            </Tooltip.Trigger>
                            <Tooltip.Portal>
                                <Tooltip.Content
                                    className={css({
                                        backgroundColor: 'gray.900',
                                        color: 'white',
                                        padding: '8px 12px',
                                        borderRadius: 'lg',
                                        fontSize: 'xs',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                        zIndex: 1000,
                                    })}
                                    sideOffset={5}
                                    style={{ zIndex: 1001 }}
                                >
                                    {bucket.key}-{bucket.key + interval}: {bucket.count} Rezepte
                                    <Tooltip.Arrow />
                                </Tooltip.Content>
                            </Tooltip.Portal>
                        </Tooltip.Root>
                    </Tooltip.Provider>
                );
            })}
        </div>
    );
}
