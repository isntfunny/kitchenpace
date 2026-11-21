'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import type { PlanActionResult } from '@app/app/plan/run';
import { useToastContext } from '@app/components/providers/ToastProvider';

/**
 * Runs a plan server action: busy flag, error toast, refresh of the server data on
 * success. Returns the data or null on failure.
 */
export function usePlanAction() {
    const router = useRouter();
    const { showToast } = useToastContext();
    const [busy, setBusy] = useState(false);

    const call = useCallback(
        async <T>(action: () => Promise<PlanActionResult<T>>): Promise<T | null> => {
            setBusy(true);
            try {
                const result = await action();
                if (!result.ok) {
                    showToast({ type: 'error', title: 'Nicht gespeichert', message: result.error });
                    return null;
                }
                router.refresh();
                return result.data;
            } catch {
                showToast({
                    type: 'error',
                    title: 'Nicht gespeichert',
                    message: 'Keine Verbindung. Bitte versuche es erneut.',
                });
                return null;
            } finally {
                setBusy(false);
            }
        },
        [router, showToast],
    );

    return { call, busy, showToast };
}
