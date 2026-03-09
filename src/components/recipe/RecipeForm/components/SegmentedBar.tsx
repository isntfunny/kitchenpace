'use client';

import { useOpenPanel } from '@openpanel/nextjs';
import { useState } from 'react';

import { PALETTE } from '@app/lib/palette';
import { css, cx } from 'styled-system/css';

const BAR_HEIGHT = 36;

interface CustomNumberInput {
    type?: 'number';
    value: number;
    onChange: (v: number) => void;
    placeholder?: string;
    suffix?: string;
}

interface CustomStringInput {
    type: 'string';
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    suffix?: string;
}

interface SegmentedBarProps {
    items: string[];
    activeIndex: number;
    onSelect: (index: number) => void;
    /** Identifier for tracking (e.g. "prep_time", "servings") */
    trackingName?: string;
    /** Show a "…" toggle that swaps the bar for a free-form input */
    customInput?: CustomNumberInput | CustomStringInput;
}

export function SegmentedBar({
    items,
    activeIndex,
    onSelect,
    trackingName,
    customInput,
}: SegmentedBarProps) {
    const [customMode, setCustomMode] = useState(false);
    const op = useOpenPanel();
    const isStringInput = customInput?.type === 'string';
    const hasCustomValue = isStringInput
        ? Boolean((customInput as CustomStringInput).value)
        : ((customInput as CustomNumberInput | undefined)?.value ?? 0) > 0;
    const showCustom = customInput && (customMode || (hasCustomValue && activeIndex === -1));

    if (showCustom && customInput) {
        return (
            <div
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2',
                    borderRadius: 'lg',
                    overflow: 'hidden',
                })}
                style={{
                    border: `1px solid ${PALETTE.orange}`,
                    height: BAR_HEIGHT,
                    padding: '0 12px',
                }}
            >
                {isStringInput ? (
                    <input
                        type="text"
                        value={(customInput as CustomStringInput).value}
                        placeholder={customInput.placeholder ?? ''}
                        onChange={(e) =>
                            (customInput as CustomStringInput).onChange(e.target.value)
                        }
                        autoFocus
                        className={customInputClass}
                    />
                ) : (
                    <input
                        type="number"
                        min={0}
                        max={999}
                        value={(customInput as CustomNumberInput).value || ''}
                        placeholder={customInput.placeholder ?? ''}
                        onChange={(e) =>
                            (customInput as CustomNumberInput).onChange(Number(e.target.value) || 0)
                        }
                        autoFocus
                        className={customInputClass}
                    />
                )}
                {customInput.suffix && (
                    <span
                        className={css({
                            fontSize: 'xs',
                            color: 'foreground.muted',
                            whiteSpace: 'nowrap',
                        })}
                    >
                        {customInput.suffix}
                    </span>
                )}
                <button
                    type="button"
                    onClick={() => {
                        setCustomMode(false);
                        if (isStringInput) (customInput as CustomStringInput).onChange('');
                        else (customInput as CustomNumberInput).onChange(0);
                    }}
                    className={css({
                        fontSize: 'xs',
                        fontWeight: '600',
                        cursor: 'pointer',
                        color: 'foreground.muted',
                        _hover: { color: 'primary' },
                    })}
                >
                    ✕
                </button>
            </div>
        );
    }

    return (
        <div
            className={css({ display: 'flex', borderRadius: 'lg', overflow: 'hidden' })}
            style={{ border: `1px solid ${PALETTE.orange}`, height: BAR_HEIGHT }}
        >
            {items.map((label, i) => {
                const active = i === activeIndex;
                return (
                    <button
                        key={label}
                        type="button"
                        onClick={() => {
                            if (trackingName)
                                op.track('segmented_bar_tap', { bar: trackingName, value: label });
                            onSelect(i);
                        }}
                        className={cx(segBtn, active && segBtnActive)}
                        style={
                            active
                                ? {
                                      background: `linear-gradient(135deg, ${PALETTE.orange}, ${PALETTE.gold})`,
                                      color: 'white',
                                      borderLeft: i === 0 ? 'none' : `1px solid ${PALETTE.orange}`,
                                  }
                                : { borderLeft: i === 0 ? 'none' : `1px solid ${PALETTE.orange}` }
                        }
                    >
                        {label}
                    </button>
                );
            })}
            {customInput && (
                <button
                    type="button"
                    onClick={() => {
                        if (trackingName)
                            op.track('segmented_bar_tap', { bar: trackingName, value: 'custom' });
                        setCustomMode(true);
                    }}
                    className={segBtn}
                    style={{ borderLeft: `1px solid ${PALETTE.orange}` }}
                >
                    …
                </button>
            )}
        </div>
    );
}

const customInputClass = css({
    flex: '1',
    fontSize: 'sm',
    fontWeight: '600',
    outline: 'none',
    background: 'transparent',
    color: 'text',
    height: '100%',
});

const segBtn = css({
    flex: '1',
    fontSize: 'xs',
    fontWeight: '600',
    cursor: 'pointer',
    background: 'surface',
    color: 'foreground.muted',
    transition: 'all 120ms ease',
    height: '100%',
    _hover: { background: 'accent.soft' },
});

const segBtnActive = css({
    position: 'relative',
    zIndex: 1,
});
