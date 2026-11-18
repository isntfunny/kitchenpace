// Pure import rules for one AI result item (KUC-94, KUC-114). No database
// access here, so the rules are unit-testable; import.ts applies the plan.

import type {
    PackUnitValue,
    ShelfLifeConfidenceValue,
    ShelfLifeItem,
    ShelfLifeSourceValue,
    StorageTypeValue,
} from './schema';
import { STORAGE_TYPES } from './schema';

export interface IngredientShelfLifeState {
    id: string;
    name: string;
    pluralName: string | null;
    normalizedName: string | null;
    normalizedNameManual: boolean;
    needsReview: boolean;
    defaultStorage: StorageTypeValue | null;
    openedShelfLifeDays: number | null;
    openSensitive: boolean;
    packSize: number | null;
    packUnit: PackUnitValue | null;
    shelfLifeSource: ShelfLifeSourceValue | null;
    shelfLifeConfidence: ShelfLifeConfidenceValue | null;
    storageLives: Array<{ storage: StorageTypeValue; days: number }>;
}

export interface IngredientShelfLifeChanges {
    normalizedName?: string;
    pluralName?: string;
    needsReview?: boolean;
    defaultStorage?: StorageTypeValue | null;
    openedShelfLifeDays?: number | null;
    openSensitive?: boolean;
    packSize?: number | null;
    packUnit?: PackUnitValue | null;
    shelfLifeSource?: ShelfLifeSourceValue;
    shelfLifeConfidence?: ShelfLifeConfidenceValue;
}

export interface ShelfLifePlan {
    ingredientId: string;
    /** Only the fields that differ from the current state */
    changes: IngredientShelfLifeChanges;
    /** Desired storage rows, or null when the rows stay as they are */
    storageLives: Array<{ storage: StorageTypeValue; days: number }> | null;
    /** true when shelfLifeSource is MANUAL and the shelf-life fields were left alone */
    manualShelfLifeKept: boolean;
    changed: boolean;
}

const sortLives = (lives: ReadonlyArray<{ storage: StorageTypeValue; days: number }>) =>
    [...lives].sort((a, b) => STORAGE_TYPES.indexOf(a.storage) - STORAGE_TYPES.indexOf(b.storage));

const sameLives = (
    a: ReadonlyArray<{ storage: StorageTypeValue; days: number }>,
    b: ReadonlyArray<{ storage: StorageTypeValue; days: number }>,
) => {
    if (a.length !== b.length) return false;
    const sortedA = sortLives(a);
    const sortedB = sortLives(b);
    return sortedA.every(
        (life, index) =>
            life.storage === sortedB[index].storage && life.days === sortedB[index].days,
    );
};

/**
 * Rules:
 * - `name` is never touched.
 * - normalizedName is set unless it was maintained manually.
 * - pluralName is only filled when empty.
 * - Shelf-life fields of ingredients with shelfLifeSource MANUAL stay untouched.
 * - applicable=false: shelfLifeSource AI without storage rows (= nothing applies).
 * - confidence LOW sets needsReview (never clears it).
 * Expects an item that passed ShelfLifeItemSchema.
 */
export function planShelfLifeUpdate(
    current: IngredientShelfLifeState,
    item: ShelfLifeItem,
): ShelfLifePlan {
    const changes: IngredientShelfLifeChanges = {};
    const set = <K extends keyof IngredientShelfLifeChanges>(
        key: K,
        value: IngredientShelfLifeChanges[K],
    ) => {
        if ((current as unknown as IngredientShelfLifeChanges)[key] !== value) changes[key] = value;
    };

    const normalizedName = item.normalizedName.trim();
    if (!current.normalizedNameManual && normalizedName) set('normalizedName', normalizedName);

    const pluralName = item.pluralName?.trim();
    if (item.applicable && pluralName && !current.pluralName?.trim()) {
        set('pluralName', pluralName);
    }

    const manualShelfLifeKept = current.shelfLifeSource === 'MANUAL';
    let storageLives: ShelfLifePlan['storageLives'] = null;

    if (!manualShelfLifeKept) {
        set('shelfLifeSource', 'AI');
        set('shelfLifeConfidence', item.confidence);
        if (item.confidence === 'LOW') set('needsReview', true);

        const desired = item.applicable ? sortLives(item.storageLives) : [];
        if (!sameLives(current.storageLives, desired)) storageLives = desired;

        if (item.applicable) {
            set('defaultStorage', item.defaultStorage);
            set('openedShelfLifeDays', item.shelfLifeOpenedDays);
            set('openSensitive', item.openSensitive);
            set('packSize', item.packSize);
            set('packUnit', item.packUnit);
        } else {
            set('defaultStorage', null);
            set('openedShelfLifeDays', null);
            set('openSensitive', false);
            set('packSize', null);
            set('packUnit', null);
        }
    }

    return {
        ingredientId: current.id,
        changes,
        storageLives,
        manualShelfLifeKept,
        changed: Object.keys(changes).length > 0 || storageLives !== null,
    };
}
