'use client';

import { Slider, Tooltip } from 'radix-ui';
import { useMemo, useState } from 'react';

import type { RecipeFilterSearchParams } from '@app/lib/recipeFilters';
import { css } from 'styled-system/css';

import type { HistogramFacet } from '../../useRecipeSearch';

import { HistogramBar } from './HistogramBar';

const sliderRootClass = css({
    position: 'relative',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    height: '10',
    touchAction: 'none',
    userSelect: 'none',
});

const sliderTrackClass = css({
    position: 'relative',
    flex: 1,
    height: '3',
    borderRadius: 'full',
    border: '1px solid',
    borderColor: 'border.muted',
    background: 'surface',
    overflow: 'hidden',
});

const sliderRangeClass = css({
    position: 'absolute',
    height: '100%',
    background: 'primary',
    opacity: 0.3,
    borderRadius: 'inherit',
});

const sliderThumbClass = css({
    all: 'unset',
    width: '18px',
    height: '18px',
    borderRadius: 'full',
    background: 'primary',
    border: '2px solid',
    borderColor: 'surface',
    boxShadow: { base: '0 6px 12px rgba(0,0,0,0.18)', _dark: '0 6px 12px rgba(0,0,0,0.5)' },
    cursor: 'grab',
});

const tooltipContentClass = css({
    backgroundColor: { base: 'gray.900', _dark: 'gray.100' },
    color: { base: 'white', _dark: 'gray.900' },
    padding: '8px 12px',
    borderRadius: 'lg',
    fontSize: 'xs',
    boxShadow: { base: '0 4px 12px rgba(0,0,0,0.15)', _dark: '0 4px 12px rgba(0,0,0,0.4)' },
    zIndex: 1000,
});

const histogramGradient = (
    facet: HistogramFacet | undefined,
    min: number,
    max: number,
    interval: number,
) => {
    const buckets = facet?.buckets ?? [];
    if (buckets.length === 0 || max <= min) return undefined;

    const domainMin = min;
    const domainMax = max + interval;
    const range = domainMax - domainMin || interval;
    const sortedBuckets = [...buckets].sort((a, b) => a.key - b.key);
    const stops = sortedBuckets
        .map((bucket) => {
            const bucketStart = Math.max(domainMin, bucket.key);
            const bucketEnd = Math.min(domainMax, bucket.key + interval);
            if (bucketEnd <= bucketStart) return null;
            const startPercent = ((bucketStart - domainMin) / range) * 100;
            const endPercent = ((bucketEnd - domainMin) / range) * 100;
            return `rgba(249,115,22,0.55) ${startPercent}% ${endPercent}%`;
        })
        .filter(Boolean);

    if (stops.length === 0) return undefined;
    return `linear-gradient(90deg, ${stops.join(', ')})`;
};

type RangeControlProps = {
    filters: RecipeFilterSearchParams;
    onFiltersChange: (next: Partial<RecipeFilterSearchParams>) => void;
    label: string;
    description?: string;
    minField: keyof RecipeFilterSearchParams;
    maxField?: keyof RecipeFilterSearchParams;
    fallback: { min: number; max: number; interval: number };
    facet?: HistogramFacet;
    step?: number;
    unit?: string;
    formatValue?: (value: number) => React.ReactNode;
};

export function RangeControl({
    filters,
    onFiltersChange,
    label,
    description,
    minField,
    maxField,
    fallback,
    facet,
    step,
    unit,
    formatValue,
}: RangeControlProps) {
    const interval = facet?.interval ?? fallback.interval;
    const facetMin = facet?.min;
    const facetMax = facet?.max;
    const hasFacetData = facet && facet.buckets.length > 0;

    const sliderMin = useMemo(() => {
        if (!hasFacetData) return fallback.min;
        const facetVal = facetMin ?? fallback.min;
        return Math.min(facetVal, fallback.min);
    }, [hasFacetData, facetMin, fallback.min]);

    const sliderMax = useMemo(() => {
        if (!hasFacetData) return fallback.max + interval;
        const facetVal = facetMax ?? fallback.max;
        return Math.max(facetVal + interval, fallback.max + interval);
    }, [hasFacetData, facetMax, fallback.max, interval]);

    const lowerFilterValue =
        typeof filters[minField] === 'number' ? (filters[minField] as number) : undefined;
    const upperFilterValue =
        maxField && typeof filters[maxField] === 'number'
            ? (filters[maxField] as number)
            : undefined;

    const { lowerValue, upperValue } = useMemo(() => {
        const rawLower = typeof lowerFilterValue === 'number' ? lowerFilterValue : sliderMin;
        const rawUpper = typeof upperFilterValue === 'number' ? upperFilterValue : sliderMax;
        const boundedLower = Math.min(Math.max(rawLower, sliderMin), sliderMax);
        const boundedUpper = Math.min(Math.max(rawUpper, sliderMin), sliderMax);
        return {
            lowerValue: Math.min(boundedLower, boundedUpper),
            upperValue: Math.max(boundedUpper, boundedLower),
        };
    }, [lowerFilterValue, upperFilterValue, sliderMin, sliderMax]);

    const gradient = useMemo(
        () => histogramGradient(facet, sliderMin, sliderMax, interval),
        [facet, sliderMin, sliderMax, interval],
    );

    const defaultFormat = (value: number) => `${value}${unit ? ` ${unit}` : ''}`;
    const format = formatValue ?? defaultFormat;

    const applyRange = (lower: number, upper: number) => {
        const update: Partial<RecipeFilterSearchParams> = {};
        (update as Record<string, number | undefined>)[minField as string] =
            lower > sliderMin ? lower : undefined;
        if (maxField) {
            (update as Record<string, number | undefined>)[maxField as string] =
                upper < sliderMax ? upper : undefined;
        }
        onFiltersChange(update);
    };

    const committedValue = maxField ? [lowerValue, upperValue] : [lowerValue];
    const [localValue, setLocalValue] = useState<number[] | null>(null);
    const sliderValue = localValue ?? committedValue;

    // Derive display values for tooltips/labels — use drag state when active
    const displayLower = localValue ? Math.min(...localValue) : lowerValue;
    const displayUpper = localValue ? Math.max(...localValue) : upperValue;

    const handleSliderDrag = (values: number[]) => {
        if (values.length === 0) return;
        setLocalValue(values);
    };

    const handleSliderCommit = (values: number[]) => {
        if (values.length === 0) return;
        setLocalValue(null);
        if (maxField) {
            const [first, second = first] = values;
            const nextLower = Math.min(first, second);
            const nextUpper = Math.max(first, second);
            applyRange(nextLower, nextUpper);
        } else {
            applyRange(values[0], sliderMax);
        }
    };

    const effectiveStep = step ?? interval;
    const stepValue = effectiveStep >= 5 ? 5 : effectiveStep;

    const handleHistogramClick = (bucketKey: number) => {
        const update: Partial<RecipeFilterSearchParams> = {};
        (update as Record<string, number>)[minField as string] = bucketKey;
        if (maxField) {
            (update as Record<string, number>)[maxField as string] = bucketKey + interval;
        }
        onFiltersChange(update);
    };

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '2' })}>
            <div className={css({ display: 'flex', justifyContent: 'space-between', gap: '4' })}>
                <p className={css({ fontWeight: '600', fontSize: 'sm' })}>{label}</p>
                {description && (
                    <p className={css({ fontSize: 'xs', color: 'text-muted' })}>{description}</p>
                )}
            </div>
            {facet && facet.buckets && facet.buckets.length > 0 && (
                <HistogramBar
                    facet={facet}
                    min={sliderMin}
                    max={sliderMax}
                    interval={interval}
                    onClick={handleHistogramClick}
                />
            )}
            <Slider.Root
                className={sliderRootClass}
                min={sliderMin}
                max={sliderMax}
                step={stepValue}
                value={sliderValue}
                onValueChange={handleSliderDrag}
                onValueCommit={handleSliderCommit}
                aria-label={label}
            >
                <Slider.Track
                    className={sliderTrackClass}
                    style={gradient ? { backgroundImage: gradient } : undefined}
                >
                    <Slider.Range className={sliderRangeClass} />
                </Slider.Track>
                {sliderValue.map((_, index) => (
                    <Tooltip.Provider key={index === 0 ? 'min' : 'max'}>
                        <Tooltip.Root>
                            <Tooltip.Trigger asChild>
                                <Slider.Thumb
                                    aria-label={`${label} ${index === 0 ? 'Minimum' : 'Maximum'}`}
                                    className={sliderThumbClass}
                                />
                            </Tooltip.Trigger>
                            <Tooltip.Portal>
                                <Tooltip.Content className={tooltipContentClass} sideOffset={5}>
                                    {index === 0 ? format(displayLower) : format(displayUpper)}
                                    <Tooltip.Arrow />
                                </Tooltip.Content>
                            </Tooltip.Portal>
                        </Tooltip.Root>
                    </Tooltip.Provider>
                ))}
            </Slider.Root>
            <div
                className={css({
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 'xs',
                    color: 'foreground.muted',
                })}
            >
                <span>{format(displayLower)}</span>
                <span>{format(displayUpper)}</span>
            </div>
        </div>
    );
}
