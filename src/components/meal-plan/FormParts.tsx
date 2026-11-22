'use client';

import { Minus, Plus } from 'lucide-react';
import { useId } from 'react';

import { css } from 'styled-system/css';

import { fieldLabel, iconButton, input } from './styles';

export function ServingsStepper({
    value,
    onChange,
    householdSize,
    label = 'Portionen',
}: {
    value: number;
    onChange: (value: number) => void;
    householdSize?: number | null;
    label?: string;
}) {
    const id = useId();
    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '1.5' })}>
            <span id={id} className={fieldLabel}>
                {label}
            </span>
            <div
                role="group"
                aria-labelledby={id}
                className={css({ display: 'flex', alignItems: 'center', gap: '2' })}
            >
                <button
                    type="button"
                    className={iconButton}
                    onClick={() => onChange(Math.max(1, value - 1))}
                    disabled={value <= 1}
                    aria-label="Eine Portion weniger"
                >
                    <Minus size={16} />
                </button>
                <output
                    aria-live="polite"
                    className={css({
                        minW: '7',
                        textAlign: 'center',
                        fontWeight: '700',
                        fontSize: 'lg',
                    })}
                >
                    {value}
                </output>
                <button
                    type="button"
                    className={iconButton}
                    onClick={() => onChange(Math.min(100, value + 1))}
                    disabled={value >= 100}
                    aria-label="Eine Portion mehr"
                >
                    <Plus size={16} />
                </button>
                {householdSize != null && value === householdSize && (
                    <span className={css({ fontSize: 'xs', color: 'foreground.muted' })}>
                        Haushalt
                    </span>
                )}
            </div>
        </div>
    );
}

export function TimeField({
    value,
    onChange,
    label = 'Uhrzeit',
}: {
    value: string;
    onChange: (value: string) => void;
    label?: string;
}) {
    const id = useId();
    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '1.5' })}>
            <label htmlFor={id} className={fieldLabel}>
                {label}
            </label>
            <input
                id={id}
                type="time"
                value={value}
                required
                onChange={(event) => onChange(event.target.value)}
                className={input}
            />
        </div>
    );
}

export function Switch({
    checked,
    onChange,
    label,
    description,
}: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
    description?: string;
}) {
    const id = useId();
    return (
        <label
            htmlFor={id}
            className={css({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '4',
                py: '2.5',
                cursor: 'pointer',
            })}
        >
            <span>
                <span className={css({ display: 'block', fontSize: 'sm', fontWeight: '500' })}>
                    {label}
                </span>
                {description && (
                    <span
                        className={css({
                            display: 'block',
                            fontSize: 'xs',
                            color: 'foreground.muted',
                        })}
                    >
                        {description}
                    </span>
                )}
            </span>
            <input
                id={id}
                type="checkbox"
                role="switch"
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
                className={css({
                    appearance: 'none',
                    flexShrink: 0,
                    position: 'relative',
                    w: '40px',
                    h: '22px',
                    borderRadius: 'full',
                    bg: 'border',
                    cursor: 'pointer',
                    transition: 'background 150ms ease',
                    _checked: { bg: 'primary' },
                    _focusVisible: {
                        outline: '2px solid',
                        outlineColor: 'primary',
                        outlineOffset: '2px',
                    },
                    _after: {
                        content: '""',
                        position: 'absolute',
                        top: '3px',
                        left: '3px',
                        w: '16px',
                        h: '16px',
                        borderRadius: 'full',
                        bg: 'white',
                        transition: 'transform 150ms ease',
                    },
                    '&:checked::after': { transform: 'translateX(18px)' },
                })}
            />
        </label>
    );
}
