export type ReminderKind = 'COOK_START' | 'WEEKLY_PLAN';
export type ReminderStatus = 'SCHEDULED' | 'SENT' | 'SKIPPED' | 'CANCELLED';

export interface QuietHours {
    /** `HH:mm` local; the window may wrap midnight (22:00–07:00) */
    start: string;
    end: string;
}

/** A dish of the plan in the shape the reminder logic needs. */
export interface ReminderEntry {
    id: string;
    recipeId: string;
    title: string;
    /** `YYYY-MM-DD` */
    date: string;
    /** MealType name or custom slot key */
    slotKey: string;
    /** Local `HH:mm`; null = slot default */
    time: string | null;
    status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    cookedAt: Date | null;
    /** Leftover entries are eaten, not cooked */
    leftoverOfId: string | null;
    /** Minutes from start of cooking to serving, see `cookDurationMinutes` */
    durationMin: number;
}

export interface CookCell {
    date: string;
    slotKey: string;
    /** Local `HH:mm` of the meal */
    time: string;
    dishes: { entryId: string; recipeId: string; title: string; durationMin: number }[];
}

export interface DesiredReminder {
    kind: ReminderKind;
    /** `YYYY-MM-DD` (cook: the day; weekly: the first day of the week) */
    date: string;
    /** "" for the weekly reminder */
    slotKey: string;
    sendAt: Date;
    fingerprint: string;
    title: string;
    body: string;
    /** In-app target */
    href: string;
    /** Recipe the notification links to (cook reminder: first dish) */
    recipeId?: string;
}

export interface ExistingReminder {
    id: string;
    kind: ReminderKind;
    /** `YYYY-MM-DD` */
    date: string;
    slotKey: string;
    scheduledFor: Date;
    fingerprint: string;
    status: ReminderStatus;
    jobId: string | null;
}
