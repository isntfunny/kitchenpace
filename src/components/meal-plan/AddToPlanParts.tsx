'use client';

import { chip, fieldLabel } from '@app/components/atoms/recipes';
import { slotLabel, type SlotConfig } from '@app/lib/meal-plan/slots';

import { css } from 'styled-system/css';

const group = css({ display: 'flex', flexDirection: 'column', gap: '2' });
const chips = css({ display: 'flex', flexWrap: 'wrap', gap: '2' });

/** The meals of the plan as radio chips; `taken` meals already hold a dish on the chosen day. */
export function SlotChoice({
    slots,
    value,
    onChange,
    taken,
}: {
    slots: SlotConfig[];
    value: string | null;
    onChange: (key: string) => void;
    taken?: ReadonlySet<string>;
}) {
    return (
        <div className={group}>
            <span className={fieldLabel}>Mahlzeit</span>
            <div role="radiogroup" aria-label="Mahlzeit" className={chips}>
                {slots.map((item) => (
                    <button
                        key={item.key}
                        type="button"
                        role="radio"
                        aria-checked={item.key === value}
                        className={chip({ active: item.key === value })}
                        onClick={() => onChange(item.key)}
                    >
                        {slotLabel(item)}
                        {taken?.has(item.key) ? ' · belegt' : ''}
                    </button>
                ))}
            </div>
        </div>
    );
}
