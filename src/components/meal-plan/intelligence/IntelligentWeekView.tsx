'use client';

import { Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { WeekSelectionDialog } from '../selection/WeekSelectionDialog';
import { actionButton } from '../styles';
import { WeekView, type WeekViewProps } from '../WeekView';

import { ShelfLifeDialog } from './ShelfLifeDialog';

/**
 * WeekView plus the plan helpers (KUC-96, KUC-108, KUC-112, KUC-113). "Plan mir die Woche"
 * opens the week selection (KUC-126); `inspiration`, `notices` and `markers` come from the
 * server page.
 */
export function IntelligentWeekView(props: Omit<WeekViewProps, 'toolbarActions'>) {
    const { data } = props;
    const router = useRouter();
    const [selecting, setSelecting] = useState(false);

    const toolbarActions = (
        <>
            <button type="button" className={actionButton()} onClick={() => setSelecting(true)}>
                <Sparkles size={16} aria-hidden />
                <span>Plan mir die Woche</span>
            </button>
            <ShelfLifeDialog startDate={data.startDate} />
            <WeekSelectionDialog
                startDate={data.startDate}
                open={selecting}
                onOpenChange={setSelecting}
                onApplied={() => router.refresh()}
            />
        </>
    );

    return <WeekView {...props} toolbarActions={toolbarActions} />;
}
