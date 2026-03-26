import { TZDate } from '@date-fns/tz';
import { format } from 'date-fns';
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
