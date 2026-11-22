/**
 * Shelf life of an ingredient in days for the plan logic (KUC-96, KUC-126, KUC-137):
 * the storage life of its default storage, else the fridge, else the pantry. Only an
 * assessed ingredient (`shelfLifeSource` set) counts; anything else is unknown and never
 * critical.
 */
import type { Prisma, PrismaClient, StorageType } from '@prisma/client';

export interface StorageLifeIngredient {
    id: string;
    defaultStorage: StorageType | null;
    shelfLifeSource: unknown;
}

export interface StorageLife {
    ingredientId: string;
    storage: StorageType;
    days: number;
}

/** Days per ingredient id; ingredients without an assessed, matching storage are left out. */
export function shelfLifeDaysByIngredient(
    ingredients: StorageLifeIngredient[],
    lives: StorageLife[],
): Map<string, number> {
    const days = new Map<string, number>();
    for (const ingredient of ingredients) {
        if (!ingredient.shelfLifeSource) continue;
        const own = lives.filter((life) => life.ingredientId === ingredient.id);
        const pick =
            own.find((life) => life.storage === ingredient.defaultStorage) ??
            own.find((life) => life.storage === 'FRIDGE') ??
            own.find((life) => life.storage === 'PANTRY');
        if (pick) days.set(ingredient.id, pick.days);
    }
    return days;
}

export type ShelfLifeDb = Pick<
    PrismaClient | Prisma.TransactionClient,
    'ingredient' | 'ingredientStorageLife'
>;

/** Loads and applies `shelfLifeDaysByIngredient` for the given ingredient ids. */
export async function loadShelfLifeDays(
    db: ShelfLifeDb,
    ingredientIds: string[],
): Promise<Map<string, number>> {
    if (ingredientIds.length === 0) return new Map();
    const [ingredients, lives] = await Promise.all([
        db.ingredient.findMany({
            where: { id: { in: ingredientIds } },
            select: { id: true, defaultStorage: true, shelfLifeSource: true },
        }),
        db.ingredientStorageLife.findMany({
            where: { ingredientId: { in: ingredientIds } },
            select: { ingredientId: true, storage: true, days: true },
        }),
    ]);
    return shelfLifeDaysByIngredient(ingredients, lives);
}
