'use client';

import { Settings2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@app/components/atoms/Button';
import { Sheet } from '@app/components/ui/Sheet';

import { css } from 'styled-system/css';

import { MealPlanSettingsForm, type MealPlanSettingsValues } from './MealPlanSettingsForm';
import type { PlanWeekData } from './types';

/** "Mahlzeiten & Anzeige" in the week toolbar; slot changes may apply to this week only. */
export function WeekSettingsDialog({
    data,
    settings,
}: {
    data: PlanWeekData;
    settings: MealPlanSettingsValues;
}) {
    const [open, setOpen] = useState(false);
    const router = useRouter();
    return (
        <Sheet
            open={open}
            onOpenChange={setOpen}
            title="Mahlzeiten & Anzeige"
            size="lg"
            trigger={
                <Button type="button" aria-label="Mahlzeiten & Anzeige">
                    <Settings2 size={16} aria-hidden />
                    <span aria-hidden className={css({ display: { base: 'none', sm: 'inline' } })}>
                        Mahlzeiten & Anzeige
                    </span>
                </Button>
            }
        >
            <MealPlanSettingsForm
                initial={settings}
                week={{
                    startDate: data.startDate,
                    slots: data.allSlots.map(({ key, name, time, enabled }) => ({
                        key,
                        name,
                        time,
                        enabled,
                    })),
                    hasOverride: data.hasWeekOverride,
                }}
                onSaved={() => {
                    setOpen(false);
                    router.refresh();
                }}
            />
        </Sheet>
    );
}
