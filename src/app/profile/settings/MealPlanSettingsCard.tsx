import { CalendarDays } from 'lucide-react';

import { Heading, Text } from '@app/components/atoms/Typography';
import {
    MealPlanSettingsForm,
    type MealPlanSettingsValues,
} from '@app/components/meal-plan/MealPlanSettingsForm';

import { css } from 'styled-system/css';

/** Meal plan section in the profile settings (KUC-102). */
export function MealPlanSettingsCard({ initial }: { initial: MealPlanSettingsValues }) {
    return (
        <section
            id="wochenplan"
            aria-labelledby="wochenplan-title"
            className={css({
                p: { base: '4', md: '6' },
                borderRadius: '2xl',
                bg: 'surface',
                boxShadow: 'shadow.medium',
                scrollMarginTop: '24',
            })}
        >
            <div className={css({ display: 'flex', alignItems: 'center', gap: '3', mb: '5' })}>
                <CalendarDays size={22} className={css({ color: 'primary' })} aria-hidden />
                <div>
                    <Heading as="h2" size="lg" id="wochenplan-title">
                        Wochenplan
                    </Heading>
                    <Text color="muted" size="sm">
                        Haushalt, Wochenstart, Mahlzeiten, Anzeige und Erinnerungen.
                    </Text>
                </div>
            </div>
            <MealPlanSettingsForm initial={initial} />
        </section>
    );
}
