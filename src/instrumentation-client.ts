/**
 * Browser-side error listeners loaded by Next.js before hydration.
 */
import { reportClientError } from '@app/lib/telemetry/client';

try {
    window.addEventListener('error', (event) => {
        if (!event.error && event.message === 'Script error.') return;
        reportClientError(event.error ?? event.message, 'window');
    });

    window.addEventListener('unhandledrejection', (event) => {
        reportClientError(event.reason, 'promise');
    });
} catch {
    // Telemetry must never break the page.
}
