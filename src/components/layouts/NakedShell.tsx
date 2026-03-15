import type { ReactNode } from 'react';

/**
 * NakedShell — no header, no footer.
 * Use for fullscreen / embedded pages like Cast receiver, mobile recipe view, etc.
 */
export function NakedShell({ children }: { children: ReactNode }) {
    return <>{children}</>;
}
