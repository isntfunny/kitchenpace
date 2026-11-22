'use client';

import { Users } from 'lucide-react';
import { useState } from 'react';

import { savePlanSettings } from '@app/app/plan/actions';
import { button } from '@app/components/atoms/recipes';
import { ServingsStepper } from '@app/components/ui/ServingsStepper';
import { DEFAULT_HOUSEHOLD_SIZE } from '@app/lib/meal-plan/slots';


import { css } from 'styled-system/css';


/** Asked once, before the first dish is planned (KUC-102). */
export function HouseholdPrompt({ onSaved }: { onSaved: (householdSize: number) => void }) {
    const [size, setSize] = useState(DEFAULT_HOUSEHOLD_SIZE);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const save = async () => {
        setBusy(true);
        setError(null);
        const result = await savePlanSettings({ householdSize: size });
        setBusy(false);
        if (result.ok) onSaved(size);
        else setError(result.error);
    };

    return (
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '4', py: '2' })}>
            <div className={css({ display: 'flex', gap: '3', alignItems: 'flex-start' })}>
                <span
                    className={css({
                        display: 'grid',
                        placeItems: 'center',
                        w: '10',
                        h: '10',
                        borderRadius: 'xl',
                        bg: 'accent.soft',
                        color: 'primary',
                        flexShrink: 0,
                    })}
                >
                    <Users size={20} />
                </span>
                <div>
                    <p className={css({ fontWeight: '600' })}>
                        Für wie viele Personen kochst du meistens?
                    </p>
                    <p className={css({ fontSize: 'sm', color: 'foreground.muted' })}>
                        Damit planen wir die Portionen vor. Du kannst sie bei jedem Gericht ändern.
                    </p>
                </div>
            </div>
            <ServingsStepper value={size} onChange={setSize} label="Personen im Haushalt" />
            {error && (
                <p role="alert" className={css({ color: 'status.error', fontSize: 'sm' })}>
                    {error}
                </p>
            )}
            <button
                type="button"
                className={button({ variant: 'primary' })}
                onClick={save}
                disabled={busy}
            >
                Weiter
            </button>
        </div>
    );
}
