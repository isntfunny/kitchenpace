import type { Prisma, PrismaClient } from '@prisma/client';

import {
    assertSnapshotMatches,
    snapshotSchema,
    type RecipeMentionSnapshot,
} from '@app/lib/ingredients/mention-migration';

type Database = PrismaClient | Prisma.TransactionClient;
export const snapshotSelection = {
    id: true,
    slug: true,
    updatedAt: true,
    flowNodes: true,
    recipeIngredients: {
        orderBy: [{ position: 'asc' as const }, { id: 'asc' as const }],
        include: { ingredient: true, unit: true },
    },
} satisfies Prisma.RecipeSelect;

export async function readMentionSnapshot(
    db: Database,
    id: string,
): Promise<RecipeMentionSnapshot> {
    const recipe = await db.recipe.findUniqueOrThrow({ where: { id }, select: snapshotSelection });
    return snapshotSchema.parse({
        id: recipe.id,
        slug: recipe.slug,
        updatedAt: recipe.updatedAt.toISOString(),
        flowNodes: recipe.flowNodes ?? [],
        ingredients: recipe.recipeIngredients.map((row) => ({
            id: row.id,
            sourceId: row.sourceId,
            ingredientId: row.ingredientId,
            unitId: row.unitId,
            name: row.ingredient.name,
            aliases: [
                ...row.ingredient.aliases,
                ...(row.ingredient.pluralName ? [row.ingredient.pluralName] : []),
            ].sort(),
            amount: row.amount,
            unit: row.unit.shortName,
            notes: row.notes,
            position: row.position,
            isOptional: row.isOptional,
        })),
    });
}

/** Atomic apply/rollback. The journal must have been fsynced before calling. */
export async function replaceMentionSnapshot(
    db: PrismaClient,
    expected: RecipeMentionSnapshot,
    desired: RecipeMentionSnapshot,
): Promise<'changed' | 'unchanged'> {
    if (expected.id !== desired.id || expected.slug !== desired.slug)
        throw new Error('Snapshot identity mismatch');
    return db.$transaction(
        async (tx) => {
            await tx.$queryRaw`SELECT id FROM "Recipe" WHERE id = ${expected.id} FOR UPDATE`;
            await tx.$queryRaw`SELECT id FROM "RecipeIngredient" WHERE "recipeId" = ${expected.id} FOR UPDATE`;
            const current = await readMentionSnapshot(tx, expected.id);
            // Safe resume after a process stopped after committing a recipe.
            try {
                assertSnapshotMatches(desired, current);
                return 'unchanged';
            } catch {
                /* compare expected below */
            }
            assertSnapshotMatches(expected, current);
            const oldIds = new Set(expected.ingredients.map((row) => row.id));
            const desiredIds = new Set(desired.ingredients.map((row) => row.id));
            for (const row of desired.ingredients) {
                if (oldIds.has(row.id)) {
                    const before = expected.ingredients.find((old) => old.id === row.id)!;
                    if (JSON.stringify(before) !== JSON.stringify(row))
                        throw new Error(
                            'Migration cannot change existing ingredient quantities or notes',
                        );
                    continue;
                }
                // Manually reviewed restoration must identify a real catalogue item/unit.
                const ingredient = await tx.ingredient.findUniqueOrThrow({
                    where: { id: row.ingredientId },
                });
                const unit = await tx.unit.findUniqueOrThrow({ where: { id: row.unitId } });
                if (ingredient.name !== row.name || unit.shortName !== row.unit)
                    throw new Error('Restoration catalogue/unit does not match the reviewed row');
                await tx.recipeIngredient.create({
                    data: {
                        id: row.id,
                        sourceId: row.sourceId,
                        recipeId: expected.id,
                        ingredientId: row.ingredientId,
                        unitId: row.unitId,
                        amount: row.amount,
                        notes: row.notes,
                        position: row.position,
                        isOptional: row.isOptional,
                    },
                });
            }
            const removed = [...oldIds].filter((id) => !desiredIds.has(id));
            if (removed.length)
                await tx.recipeIngredient.deleteMany({
                    where: { recipeId: expected.id, id: { in: removed } },
                });
            await tx.recipe.update({
                where: { id: expected.id },
                data: {
                    flowNodes: desired.flowNodes as Prisma.InputJsonValue,
                    updatedAt: new Date(desired.updatedAt),
                },
            });
            assertSnapshotMatches(desired, await readMentionSnapshot(tx, expected.id));
            return 'changed';
        },
        { isolationLevel: 'Serializable' },
    );
}
