import * as Sentry from '@sentry/nextjs';

/**
 * Captures an exception and shows Sentry's feedback dialog
 * Best used in error boundaries and critical error scenarios
 *
 * @param error - The error to capture
 * @param context - Optional additional context (e.g., "form submission", "data fetch")
 */
export function captureErrorWithDialog(error: Error, context?: string) {
    // Capture the error on Sentry
    Sentry.captureException(error, {
        tags: {
            errorContext: context || 'unknown',
        },
    });

    // Show user feedback dialog
    Sentry.showReportDialog({
        title: 'Fehler aufgetreten',
        subtitle: context
            ? `Ein Fehler ist bei "${context}" aufgetreten. Hilf uns, das Problem zu beheben.`
            : 'Unser Team wurde benachrichtigt. Hilf uns, das Problem schneller zu beheben.',
        labelComments: 'Was ist passiert? (optional)',
        labelClose: 'Schließen',
        labelSubmit: 'Fehler melden',
        successMessage: 'Danke für Dein Feedback! Wir werden das Problem schnell beheben.',
    });
}

/**
 * Captures an error WITHOUT showing dialog (for non-critical errors)
 * Use for errors that don't require user attention
 */
export function captureErrorSilent(error: Error, context?: string) {
    Sentry.captureException(error, {
        tags: {
            errorContext: context || 'unknown',
        },
    });
}

/**
 * Captures a message (non-error scenarios)
 * Use for warnings, info, or debug messages
 */
export function captureMessage(
    message: string,
    level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'error',
) {
    Sentry.captureMessage(message, level);
}
