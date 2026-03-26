import type { Prisma } from '@prisma/client';

import { toRecipeCardData, type RecipeCardData } from '@app/lib/recipe-card';
import { prisma } from '@shared/prisma';

import type { RecipeFilterProps } from './types';

/**
 * Resolves RecipeFilterProps into actual recipe data.
 * Used by MDX components to fetch recipes based on filters or explicit IDs.
 */
export async function resolveRecipeFilter(
    props: RecipeFilterProps,
    viewerUserId?: string | null,
): Promise<RecipeCardData[]> {
    // Explicit IDs take priority
    if (props.ids && props.ids.length > 0) {
        const recipes = await prisma.recipe.findMany({
            where: {
                id: { in: props.ids },
                status: 'PUBLISHED',
                moderationStatus: { in: ['AUTO_APPROVED', 'APPROVED'] },
            },
            include: { categories: { include: { category: true } } },
        });

        // Preserve ID order
        const byId = new Map(recipes.map((r) => [r.id, r]));
        return props.ids
            .map((id) => byId.get(id))
            .filter(Boolean)
            .map((r) => toRecipeCardData(r!));
    }

    // Build dynamic query from filter props
    const where: Prisma.RecipeWhereInput = {
        status: 'PUBLISHED',
        moderationStatus: { in: ['AUTO_APPROVED', 'APPROVED'] },
    };

    // byMyself requires a logged-in viewer — return empty if not available
    if (props.byMyself && !viewerUserId) {
        return [];
    }

    const userId = props.byMyself
        ? viewerUserId
        : props.byUser
          ? await resolveUserSlug(props.byUser)
          : null;
    if (userId) {
        where.authorId = userId;
    }

    if (props.tags && props.tags.length > 0) {
        where.tags = { some: { tag: { slug: { in: props.tags } } } };
    }

    if (props.category) {
        where.categories = { some: { category: { slug: props.category } } };
    }

    const orderBy = buildOrderBy(props.sort ?? 'newest');
    const limit = props.limit ?? 8;

    const recipes = await prisma.recipe.findMany({
        where,
        orderBy,
        take: limit,
        include: { categories: { include: { category: true } } },
    });

    return recipes.map(toRecipeCardData);
}

async function resolveUserSlug(slug: string): Promise<string | null> {
    const profile = await prisma.profile.findUnique({
        where: { slug },
        select: { userId: true },
    });
    return profile?.userId ?? null;
}

function buildOrderBy(
    sort: 'rating' | 'newest' | 'popular',
): Prisma.RecipeOrderByWithRelationInput {
    switch (sort) {
        case 'rating':
            return { rating: 'desc' };
        case 'popular':
            return { viewCount: 'desc' };
        case 'newest':
        default:
            return { createdAt: 'desc' };
    }
}
