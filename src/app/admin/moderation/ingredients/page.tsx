import { ensureModeratorSession } from '@app/lib/admin/ensure-moderator';
import { prisma } from '@shared/prisma';

import { IngredientReviewTable } from '../ingredient-review-table';

export const dynamic = 'force-dynamic';

export default async function IngredientReviewPage() {
    await ensureModeratorSession('moderation-ingredients');

    const ingredients = await prisma.ingredient.findMany({
        where: { needsReview: true },
        orderBy: { createdAt: 'desc' },
        include: {
            ingredientUnits: {
                include: { unit: { select: { shortName: true } } },
            },
            _count: { select: { recipes: true } },
        },
        take: 100,
    });

    return <IngredientReviewTable ingredients={ingredients} />;
}
