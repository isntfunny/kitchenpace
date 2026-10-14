import type { PrismaClient } from '@prisma/client';

import { BringError } from '../bring/client';
import { scaleQuantity } from '../bring/items';
import type { BringItems, BringList, TransferItem, TransferOutcome } from '../bring/types';

import type { ApiPrincipal } from './auth';
import type { BringRecipeInput } from './bring-schemas';
import { ApiError } from './errors';
import { accessibleRecipeWhere } from './services';

export interface BringGateway {
    availableLists(userId: string): Promise<{ lists: BringList[]; defaultListUuid: string | null }>;
    readList(userId: string, listUuid: string): Promise<BringItems>;
    transfer(
        userId: string,
        operationId: string,
        listUuid: string,
        items: TransferItem[],
        context?: unknown,
    ): Promise<TransferOutcome[]>;
}
const productionGateway: BringGateway = {
    availableLists: async (userId) => (await import('../bring/service')).availableLists(userId),
    readList: async (userId, listUuid) =>
        (await import('../bring/service')).readList(userId, listUuid),
    transfer: async (userId, operationId, listUuid, items, context) =>
        (await import('../bring/service')).transfer(userId, operationId, listUuid, items, context),
};
async function bringCall<T>(work: () => Promise<T>): Promise<T> {
    try {
        return await work();
    } catch (error) {
        if (error instanceof BringError) {
            if (error.code === 'AUTH') throw new ApiError(409, 'BRING_CONNECTION_REQUIRED');
            if (error.code === 'FORBIDDEN') throw new ApiError(404, 'NOT_FOUND');
            if (error.code === 'CONFLICT') throw new ApiError(409, 'BRING_CONFLICT');
            throw new ApiError(503, 'BRING_UNAVAILABLE');
        }
        throw error;
    }
}
export function createBringApiServices(db: PrismaClient, gateway = productionGateway) {
    return {
        bringLists: (p: ApiPrincipal) => bringCall(() => gateway.availableLists(p.userId)),
        bringList: (p: ApiPrincipal, listUuid: string) =>
            bringCall(() => gateway.readList(p.userId, listUuid)),
        async bringRecipe(
            p: ApiPrincipal,
            listUuid: string,
            token: string,
            input: BringRecipeInput,
        ) {
            const recipe = await db.recipe.findFirst({
                where: { id: input.recipeId, ...accessibleRecipeWhere(p.userId) },
                select: {
                    servings: true,
                    recipeIngredients: {
                        orderBy: [{ position: 'asc' }, { ingredientId: 'asc' }],
                        select: {
                            ingredientId: true,
                            amount: true,
                            notes: true,
                            ingredient: { select: { name: true } },
                            unit: { select: { shortName: true } },
                        },
                    },
                },
            });
            if (!recipe) throw new ApiError(404, 'NOT_FOUND');
            const selection = input.ingredientIds && new Set(input.ingredientIds);
            if (
                selection &&
                [...selection].some(
                    (id) => !recipe.recipeIngredients.some((item) => item.ingredientId === id),
                )
            )
                throw new ApiError(400, 'INVALID_INGREDIENT_SELECTION');
            const selected = recipe.recipeIngredients.filter(
                (item) => !selection || selection.has(item.ingredientId),
            );
            if (!selected.length || selected.length > 50)
                throw new ApiError(400, 'INVALID_INGREDIENT_SELECTION');
            const factor = (input.servings ?? recipe.servings) / Math.max(1, recipe.servings);
            const items = selected.map((item) => ({
                id: item.ingredientId,
                name: item.ingredient.name,
                specification: [scaleQuantity(item.amount, factor), item.unit.shortName, item.notes]
                    .filter(Boolean)
                    .join(' '),
            }));
            // Bind the receipt to the requested recipe/portions as well as the prepared ingredient snapshot.
            // Prefix avoids collisions with the website's UUID operation identifiers.
            const context = {
                ...input,
                ...(selection ? { ingredientIds: [...selection].sort() } : {}),
            };
            return {
                items: await bringCall(() =>
                    gateway.transfer(p.userId, `api-recipe:${token}`, listUuid, items, context),
                ),
            };
        },
    };
}
