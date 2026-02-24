import { NextResponse } from 'next/server';

import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
    const resolvedParams = await params;
    if (!resolvedParams?.id) {
        return NextResponse.json({ viewer: null });
    }

    const session = await getServerAuthSession('recipe-viewer');
    if (!session?.user?.id) {
        return NextResponse.json({ viewer: null });
    }

    const viewerId = session.user.id;

    const recipe = await prisma.recipe.findFirst({
        where: {
            OR: [{ slug: resolvedParams.id }, { id: resolvedParams.id }],
            publishedAt: { not: null },
        },
        select: {
            id: true,
            authorId: true,
        },
    });

    if (!recipe) {
        return NextResponse.json({ viewer: null });
    }

    const [favorite, rating, follow, cookHistory] = await Promise.all([
        prisma.favorite.findUnique({
            where: {
                recipeId_userId: {
                    recipeId: recipe.id,
                    userId: viewerId,
                },
            },
        }),
        prisma.userRating.findUnique({
            where: {
                recipeId_userId: {
                    recipeId: recipe.id,
                    userId: viewerId,
                },
            },
        }),
        recipe.authorId && recipe.authorId !== viewerId
            ? prisma.follow.findUnique({
                  where: {
                      followerId_followingId: {
                          followerId: viewerId,
                          followingId: recipe.authorId,
                      },
                  },
              })
            : null,
        prisma.userCookHistory.findFirst({
            where: {
                recipeId: recipe.id,
                userId: viewerId,
            },
            select: { id: true },
        }),
    ]);

    const viewer = {
        id: viewerId,
        isFavorite: Boolean(favorite),
        rating: rating?.rating ?? null,
        isFollowingAuthor: Boolean(follow),
        canFollow: Boolean(recipe.authorId && recipe.authorId !== viewerId),
        isAuthor: recipe.authorId === viewerId,
        hasCooked: Boolean(cookHistory),
    };

    return NextResponse.json({ viewer });
}
