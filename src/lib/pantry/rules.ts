// Pure pantry rules (KUC-98 / KUC-107 / KUC-108). Leftovers count from opening;
// without pack size or opened shelf life there is no leftover hint and no error.

const DAY_MS = 86_400_000;

export interface LeftoverFacts {
    status: 'AVAILABLE' | 'USED_UP' | 'DISCARDED';
    openedAt: Date | null;
    quantity: number | null;
    leftoverHintDismissedAt?: Date | null;
    ingredient: {
        openSensitive: boolean;
        openedShelfLifeDays: number | null;
        packSize: number | null;
    } | null;
}

/** Expiry after opening: opening day + openedShelfLifeDays (0 = same day). */
export function expiresAfterOpening(
    openedAt: Date,
    openedShelfLifeDays: number | null,
): Date | null {
    if (openedShelfLifeDays === null || openedShelfLifeDays < 0) return null;
    return new Date(openedAt.getTime() + openedShelfLifeDays * DAY_MS);
}

/** Only opened, open-sensitive items with reliable data produce a leftover hint. */
export function isLeftoverHintEligible(item: LeftoverFacts): boolean {
    const ingredient = item.ingredient;
    return (
        item.status === 'AVAILABLE' &&
        !item.leftoverHintDismissedAt &&
        item.openedAt !== null &&
        item.quantity !== null &&
        item.quantity > 0 &&
        !!ingredient?.openSensitive &&
        ingredient.openedShelfLifeDays !== null &&
        ingredient.packSize !== null
    );
}

/** Remaining amount after using `used`; never below zero. */
export function remainingAfterUse(quantity: number | null, used: number | null): number | null {
    if (quantity === null) return null;
    if (used === null) return quantity;
    return Math.max(0, Math.round((quantity - used) * 1000) / 1000);
}
