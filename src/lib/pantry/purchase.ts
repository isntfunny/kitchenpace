// Pantry posts from purchases (KUC-107): ticking off a list item creates a post with the
// bought amount, linked to the history row; resetting the item takes it out again.
// Only ingredient items become posts: nothing could ever deduct free-text items, so they
// would stay "available" for good. Called inside the transaction of `setShoppingItemStatus`.
import type { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

interface PurchaseHistory {
    id: string;
    ingredientId: string | null;
    name: string;
    origin: 'KOCHTAKT' | 'BRING';
    occurredAt: Date;
    quantity: number | null;
    baseUnit: 'G' | 'ML' | 'PIECE' | null;
    quantityText: string | null;
}

/** Creates the pantry post of a purchase (once per history row). */
export async function recordPurchaseInPantry(tx: Tx, userId: string, history: PurchaseHistory) {
    if (!history.ingredientId) return null;
    const existing = await tx.pantryItem.findFirst({
        where: { userId, shoppingHistoryId: history.id },
        select: { id: true },
    });
    if (existing) return existing;
    return tx.pantryItem.create({
        data: {
            userId,
            ingredientId: history.ingredientId,
            name: history.name,
            quantity: history.quantity,
            baseUnit: history.quantity === null ? null : history.baseUnit,
            quantityText: history.quantityText,
            source: history.origin === 'BRING' ? 'BRING' : 'PURCHASE',
            purchasedAt: history.occurredAt,
            shoppingHistoryId: history.id,
        },
        select: { id: true },
    });
}

/**
 * Takes the posts of the item's latest purchase out again ("Zurücksetzen"). Posts that a
 * cooked plan entry already used, or that were used up or thrown away, stay.
 */
export async function removePurchaseFromPantry(tx: Tx, userId: string, shoppingItemId: string) {
    const latest = await tx.shoppingHistory.findFirst({
        where: { userId, shoppingItemId, event: 'PURCHASED' },
        orderBy: { occurredAt: 'desc' },
        select: { id: true },
    });
    if (!latest) return 0;
    const removed = await tx.pantryItem.deleteMany({
        where: {
            userId,
            shoppingHistoryId: latest.id,
            status: 'AVAILABLE',
            mealPlanRecipeId: null,
        },
    });
    return removed.count;
}
