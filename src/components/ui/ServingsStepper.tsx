'use client';

import { Minus, Plus } from 'lucide-react';
import { useId } from 'react';

import { IconButton } from '@app/components/atoms/Button';
import { fieldLabel } from '@app/components/atoms/recipes';

import { css, cx } from 'styled-system/css';

const stacked = css({ display: 'flex', flexDirection: 'column', gap: '1.5' });
const inline = css({ display: 'flex', alignItems: 'center', gap: '3' });
const inlineLabel = css({ flex: 1, fontSize: 'sm', color: 'foreground.muted' });
const controls = css({ display: 'flex', alignItems: 'center', gap: '2' });
const valueText = css({ minW: '7', textAlign: 'center', fontWeight: '700', fontSize: 'lg' });
const householdHint = css({ fontSize: 'xs', color: 'foreground.muted' });

/**
 * The one servings stepper (KUC-136): plan, week selection, recipe and shopping list.
 * `layout="inline"` puts the label left of the buttons (recipe, shopping list dialog).
 */
export function ServingsStepper({
    value,
    onChange,
    label = 'Portionen',
    min = 1,
    max = 100,
    householdSize,
    layout = 'stacked',
    size = 'md',
}: {
    value: number;
    onChange: (value: number) => void;
    label?: string;
    min?: number;
    /** Highest allowed value (the week selection limits it by free slots) */
    max?: number;
    /** Shows "Haushalt" when the value equals the household size */
    householdSize?: number | null;
    layout?: 'stacked' | 'inline';
    size?: 'sm' | 'md';
}) {
    const id = useId();
    return (
        <div className={layout === 'inline' ? inline : stacked}>
            <span id={id} className={cx(layout === 'inline' ? inlineLabel : fieldLabel)}>
                {label}
            </span>
            <div role="group" aria-labelledby={id} className={controls}>
                <IconButton
                    size={size}
                    onClick={() => onChange(Math.max(min, value - 1))}
                    disabled={value <= min}
                    aria-label="Eine Portion weniger"
                >
                    <Minus size={16} />
                </IconButton>
                <output aria-live="polite" className={valueText}>
                    {value}
                </output>
                <IconButton
                    size={size}
                    onClick={() => onChange(Math.min(max, value + 1))}
                    disabled={value >= max}
                    aria-label="Eine Portion mehr"
                >
                    <Plus size={16} />
                </IconButton>
                {householdSize != null && value === householdSize && (
                    <span className={householdHint}>Haushalt</span>
                )}
            </div>
        </div>
    );
}
