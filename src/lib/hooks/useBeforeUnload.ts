'use client';

import { useEffect } from 'react';

/**
 * Shows a browser "are you sure?" dialog when the user tries to leave
 * the page with unsaved changes.
 */
export function useBeforeUnload(isDirty: boolean) {
    useEffect(() => {
        if (!isDirty) return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [isDirty]);
}
