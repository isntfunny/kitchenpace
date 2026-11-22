// Moves shopping list, history, pantry and snooze references from a merged
// duplicate ingredient to the kept one (KUC-114 merge, adapted for KUC-98):
// a list may hold each ingredient only once, so a list that already has the
// kept ingredient absorbs the duplicate's entry instead of getting a second one.
import type { Prisma } from '@prisma/client';

import { itemKeyFor } from '@shared/shopping/item-key';

import { BASE_UNIT_LABEL } from './quantity';

type Tx = Prisma.TransactionClient;

export async function moveIngredientShoppingReferences(
    tx: Tx,
    sourceId: string,
    keepId: string,
): Promise<{ shoppingItemIds: string[] }> {
    const sourceKey = itemKeyFor({ ingredientId: sourceId, name: '' });
    const keepKey = itemKeyFor({ ingredientId: keepId, name: '' });
    const items = await tx.shoppingItem.findMany({ where: { ingredientId: sourceId } });

    for (const item of items) {
        const kept = await tx.shoppingItem.findUnique({
            where: {
                shoppingListId_ingredientId: {
                    shoppingListId: item.shoppingListId,
                    ingredientId: keepId,
                },
            },
        });
        if (!kept) {
            await tx.shoppingItem.update({
                where: { id: item.id },
                data: { ingredientId: keepId, itemKey: keepKey },
            });
            continue;
        }
        const join = (...parts: Array<string | null>) => parts.filter(Boolean).join(' + ') || null;
        // Only an open entry carries a current need. A bought/dormant duplicate adds
        // nothing; an open duplicate restarts a bought/dormant kept entry.
        const itemOpen = item.status === 'OPEN';
        const keptOpen = kept.status === 'OPEN';
        let amount: Prisma.ShoppingItemUpdateInput = {};
        if (itemOpen && !keptOpen) {
            amount = {
                quantity: item.quantity,
                baseUnit: item.baseUnit,
                displayUnit: item.displayUnit,
                quantityText: item.quantityText,
                status: 'OPEN',
                statusChangedAt: new Date(),
            };
        } else if (itemOpen && (item.quantity === null || item.baseUnit === null)) {
            amount = { quantityText: join(kept.quantityText, item.quantityText) };
        } else if (itemOpen && (kept.quantity === null || kept.baseUnit === null)) {
            amount = {
                quantity: item.quantity,
                baseUnit: item.baseUnit,
                displayUnit: item.displayUnit,
                quantityText: join(kept.quantityText, item.quantityText),
            };
        } else if (itemOpen && kept.baseUnit === item.baseUnit) {
            amount = {
                quantity: kept.quantity! + item.quantity!,
                quantityText: join(kept.quantityText, item.quantityText),
            };
        } else if (itemOpen) {
            const unconverted = `${item.quantity} ${BASE_UNIT_LABEL[item.baseUnit!]}`;
            amount = { quantityText: join(kept.quantityText, unconverted, item.quantityText) };
        }
        await tx.shoppingItem.update({ where: { id: kept.id }, data: amount });
        // Sources describe the current round only
        if (itemOpen && !keptOpen)
            await tx.shoppingItemSource.deleteMany({ where: { shoppingItemId: kept.id } });
        if (!itemOpen && keptOpen)
            await tx.shoppingItemSource.deleteMany({ where: { shoppingItemId: item.id } });
        await tx.shoppingItemSource.updateMany({
            where: { shoppingItemId: item.id },
            data: { shoppingItemId: kept.id },
        });
        await tx.shoppingHistory.updateMany({
            where: { shoppingItemId: item.id },
            data: { shoppingItemId: kept.id },
        });
        await tx.bringSyncConflict.updateMany({
            where: { shoppingItemId: item.id },
            data: { shoppingItemId: kept.id },
        });
        await tx.shoppingItem.delete({ where: { id: item.id } });
    }

    await tx.shoppingHistory.updateMany({
        where: { ingredientId: sourceId },
        data: { ingredientId: keepId, itemKey: keepKey },
    });
    await tx.pantryItem.updateMany({
        where: { ingredientId: sourceId },
        data: { ingredientId: keepId },
    });

    // Snoozes: keep the kept ingredient's own snooze where both exist
    const snoozes = await tx.shoppingSuggestionSnooze.findMany({ where: { itemKey: sourceKey } });
    for (const snooze of snoozes) {
        const existing = await tx.shoppingSuggestionSnooze.findUnique({
            where: { userId_itemKey: { userId: snooze.userId, itemKey: keepKey } },
        });
        if (existing)
            await tx.shoppingSuggestionSnooze.delete({
                where: { userId_itemKey: { userId: snooze.userId, itemKey: sourceKey } },
            });
        else
            await tx.shoppingSuggestionSnooze.update({
                where: { userId_itemKey: { userId: snooze.userId, itemKey: sourceKey } },
                data: { itemKey: keepKey },
            });
    }

    return { shoppingItemIds: items.map((item) => item.id) };
}
