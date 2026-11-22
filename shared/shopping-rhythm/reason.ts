/** German reason texts for rhythm suggestions. */

/** "jede Woche", "alle 2 Wochen" for (almost) whole weeks up to 4, else "alle ~12 Tage". */
export function rhythmLabel(intervalDays: number): string {
    const weeks = Math.round(intervalDays / 7);
    if (weeks >= 1 && weeks <= 4 && Math.abs(intervalDays - weeks * 7) <= 1) {
        return weeks === 1 ? 'jede Woche' : `alle ${weeks} Wochen`;
    }
    return `alle ~${Math.round(intervalDays)} Tage`;
}

/**
 * Whole-week rhythms read as the label alone ("jede Woche"); other rhythms add the days
 * since the last purchase ("alle ~12 Tage · zuletzt vor 11 T.").
 */
export function rhythmReason(intervalDays: number, daysSince: number): string {
    const label = rhythmLabel(intervalDays);
    return label.startsWith('alle ~') ? `${label} · zuletzt vor ${daysSince} T.` : label;
}
