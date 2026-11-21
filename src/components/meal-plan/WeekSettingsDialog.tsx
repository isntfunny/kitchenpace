'use client';

import { Settings2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Dialog } from 'radix-ui';
import { useState } from 'react';

import { css, cx } from 'styled-system/css';

import { MealPlanSettingsForm, type MealPlanSettingsValues } from './MealPlanSettingsForm';
import { actionButton, overlay, sheet, sheetWide } from './styles';
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
        <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger className={actionButton()} aria-label="Mahlzeiten & Anzeige">
                <Settings2 size={16} aria-hidden />
                <span aria-hidden className={css({ display: { base: 'none', sm: 'inline' } })}>
                    Mahlzeiten & Anzeige
                </span>
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className={overlay} />
                <Dialog.Content className={cx(sheet, sheetWide)} aria-describedby={undefined}>
                    <div className={css({ display: 'flex', alignItems: 'center', mb: '4' })}>
                        <Dialog.Title
                            className={css({
                                flex: 1,
                                fontFamily: 'heading',
                                fontSize: 'xl',
                                fontWeight: '700',
                            })}
                        >
                            Mahlzeiten & Anzeige
                        </Dialog.Title>
                        <Dialog.Close
                            className={actionButton({ variant: 'ghost' })}
                            aria-label="Schließen"
                        >
                            <X size={18} />
                        </Dialog.Close>
                    </div>
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
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
