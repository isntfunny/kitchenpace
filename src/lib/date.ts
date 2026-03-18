import { TZDate } from '@date-fns/tz';
import { format, formatDistanceToNow, formatRelative, isPast } from 'date-fns';
import { de } from 'date-fns/locale';

/**
 * Format a planned stream time with timezone.
 * Example: "Fr., 22. März, 19:00 Uhr (MEZ)"
 */
export function formatPlannedTime(date: Date | string, timezone?: string | null): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const zoned = timezone ? new TZDate(d, timezone) : d;
    const formatted = format(zoned, "EEEE, d. MMMM, HH:mm 'Uhr'", { locale: de });
    if (timezone) {
        const tz = new Intl.DateTimeFormat('de', { timeZone: timezone, timeZoneName: 'short' })
            .formatToParts(d)
            .find((p) => p.type === 'timeZoneName')?.value;
        if (tz) return `${formatted} (${tz})`;
    }
    return formatted;
}

/**
 * Format relative time in German.
 * Example: "in 3 Stunden", "vor 2 Tagen"
 */
export function formatRelativeTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return formatDistanceToNow(d, { addSuffix: true, locale: de });
}

/**
 * Format stream duration since start.
 * Example: "Seit 2 Stunden live"
 */
export function formatStreamDuration(startedAt: Date | string): string {
    const d = typeof startedAt === 'string' ? new Date(startedAt) : startedAt;
    const distance = formatDistanceToNow(d, { locale: de });
    return `Seit ${distance} live`;
}

/**
 * Format a relative date with smart fallback.
 * Example: "morgen um 19:00", "nächsten Freitag um 19:00"
 */
export function formatSmartDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return formatRelative(d, new Date(), { locale: de });
}

/**
 * Check if a planned time is in the past.
 */
export function isPlannedTimePast(date: Date | string): boolean {
    const d = typeof date === 'string' ? new Date(date) : date;
    return isPast(d);
}
