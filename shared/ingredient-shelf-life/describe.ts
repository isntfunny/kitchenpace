import { plural } from '../text';

import { perishability, type Perishability } from './perishability';
import type { ShelfLifeSourceValue, StorageTypeValue } from './schema';

/** Shelf-life summary for display, e.g. on the public ingredient page. */
export type ShelfLifeSummary = {
    entries: Array<{
        storage: StorageTypeValue;
        label: string;
        duration: string;
        isDefault: boolean;
    }>;
    /** Remaining shelf life after opening, null when opening changes nothing */
    opened: string | null;
    perishability: Perishability | null;
};

export const STORAGE_DISPLAY_LABELS: Record<StorageTypeValue, string> = {
    FRIDGE: 'Kühlschrank',
    PANTRY: 'Vorratsschrank',
    FREEZER: 'Tiefkühler',
};

const STORAGE_ORDER: StorageTypeValue[] = ['FRIDGE', 'PANTRY', 'FREEZER'];

/** Rounded, human duration: exact days for short spans, then weeks, months, years. */
export function formatShelfLifeDays(days: number): string {
    if (days < 14) return plural(days, 'Tag', 'Tage');
    if (days < 60) return `etwa ${plural(Math.round(days / 7), 'Woche', 'Wochen')}`;
    if (days < 365) return `etwa ${plural(Math.round(days / 30), 'Monat', 'Monate')}`;
    if (days >= 3650) return 'praktisch unbegrenzt';
    return `etwa ${plural(Math.round(days / 365), 'Jahr', 'Jahre')}`;
}

/**
 * Returns null when the ingredient is not assessed yet or has no storage
 * option (not applicable, e.g. finished dishes) — nothing is shown then.
 */
export function describeShelfLife(input: {
    shelfLifeSource: ShelfLifeSourceValue | null;
    defaultStorage: StorageTypeValue | null;
    openedShelfLifeDays: number | null;
    storageLives: ReadonlyArray<{ storage: StorageTypeValue; days: number }>;
}): ShelfLifeSummary | null {
    if (!input.shelfLifeSource || input.storageLives.length === 0) return null;

    const rank = (storage: StorageTypeValue) =>
        storage === input.defaultStorage ? -1 : STORAGE_ORDER.indexOf(storage);
    const entries = [...input.storageLives]
        .sort((a, b) => rank(a.storage) - rank(b.storage))
        .map((life) => ({
            storage: life.storage,
            label: STORAGE_DISPLAY_LABELS[life.storage],
            duration: formatShelfLifeDays(life.days),
            isDefault: life.storage === input.defaultStorage,
        }));

    const defaultDays = input.storageLives.find((l) => l.storage === input.defaultStorage)?.days;
    const openedDays = input.openedShelfLifeDays;
    let opened: string | null = null;
    if (openedDays !== null && (defaultDays === undefined || openedDays < defaultDays)) {
        opened = openedDays === 0 ? 'am selben Tag verbrauchen' : formatShelfLifeDays(openedDays);
    }

    return {
        entries,
        opened,
        perishability: perishability(input.defaultStorage, input.storageLives),
    };
}
