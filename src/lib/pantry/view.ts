// Display rules of the pantry page (KUC-107): amount text with "~" for uncertain amounts,
// expiry hints and the three groups. Pure; dates are compared as Berlin calendar days.
import { diffDays, toBerlinDate } from '@shared/meal-planning/dates';

export type PantryUnit = 'G' | 'ML' | 'PIECE';

export interface PantryViewInput {
    id: string;
    name: string;
    quantity: number | null;
    baseUnit: PantryUnit | null;
    quantityText: string | null;
    approximate: boolean;
    openedAt: Date | null;
    expiresAt: Date | null;
}

export type ExpiryTone = 'ok' | 'soon' | 'expired';

export interface PantryGroup<T extends PantryViewInput = PantryViewInput> {
    key: 'expiring' | 'opened' | 'other';
    title: string;
    items: T[];
}

/** Within this many days (or already past) a post counts as "läuft bald ab". */
export const EXPIRING_DAYS = 3;

const number = (value: number) => String(Math.round(value * 10) / 10).replace('.', ',');

/** "~100 ml", "1,5 kg", "3 Stk"; null without any amount. "~" marks an uncertain amount. */
export function formatPantryAmount(
    item: Pick<PantryViewInput, 'quantity' | 'baseUnit' | 'quantityText' | 'approximate'>,
): string | null {
    const { quantity, baseUnit } = item;
    if (quantity === null || !baseUnit) return item.quantityText?.trim() || null;
    const mark = item.approximate ? '~' : '';
    if (baseUnit === 'G') {
        return quantity >= 1000
            ? `${mark}${number(quantity / 1000)} kg`
            : `${mark}${number(quantity)} g`;
    }
    if (baseUnit === 'ML') {
        return quantity >= 1000
            ? `${mark}${number(quantity / 1000)} l`
            : `${mark}${number(quantity)} ml`;
    }
    return `${mark}${number(quantity)} Stk`;
}

export function expiryHint(
    expiresAt: Date | null,
    now: Date,
): { label: string; tone: ExpiryTone; days: number } | null {
    if (!expiresAt) return null;
    const days = diffDays(toBerlinDate(expiresAt), toBerlinDate(now));
    if (days < 0) {
        return {
            label: days === -1 ? 'seit gestern abgelaufen' : `seit ${-days} T. abgelaufen`,
            tone: 'expired',
            days,
        };
    }
    if (days === 0) return { label: 'läuft heute ab', tone: 'soon', days };
    if (days === 1) return { label: 'läuft morgen ab', tone: 'soon', days };
    if (days <= EXPIRING_DAYS) return { label: `läuft in ${days} T. ab`, tone: 'soon', days };
    const [, month, day] = toBerlinDate(expiresAt).split('-');
    return { label: `bis ${day}.${month}.`, tone: 'ok', days };
}

/** Groups: soon expiring (soonest first), opened, the rest (alphabetical). */
export function groupPantryItems<T extends PantryViewInput>(
    items: readonly T[],
    now: Date,
): PantryGroup<T>[] {
    const expiring: T[] = [];
    const opened: T[] = [];
    const other: T[] = [];
    for (const item of items) {
        const hint = expiryHint(item.expiresAt, now);
        if (hint && hint.days <= EXPIRING_DAYS) expiring.push(item);
        else if (item.openedAt) opened.push(item);
        else other.push(item);
    }
    const byName = (a: T, b: T) => a.name.localeCompare(b.name, 'de');
    expiring.sort(
        (a, b) => (a.expiresAt as Date).getTime() - (b.expiresAt as Date).getTime() || byName(a, b),
    );
    opened.sort(byName);
    other.sort(byName);
    return [
        { key: 'expiring' as const, title: 'Läuft bald ab', items: expiring },
        { key: 'opened' as const, title: 'Angebrochen', items: opened },
        { key: 'other' as const, title: 'Vorrat', items: other },
    ].filter((group) => group.items.length > 0);
}
