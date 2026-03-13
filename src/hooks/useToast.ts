'use client';

import { useToastContext } from '@app/components/providers/ToastProvider';

export function useToast() {
    const { showToast, dismissToast, toasts } = useToastContext();

    return {
        showToast,
        dismissToast,
        toasts,
    };
}
