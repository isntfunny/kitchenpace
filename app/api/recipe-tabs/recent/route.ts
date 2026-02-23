import { NextResponse } from 'next/server';

import { getServerAuthSession, logMissingSession } from '@/lib/auth';
import { logAuth } from '@/lib/auth-logger';
import { prisma } from '@/lib/prisma';

const MAX_RECENT = 5;

async function loadRecentRecipes(userId: string) {
    const pinnedIds = new Set(
        (
            await prisma.pinnedFavorite.findMany({
                where: { userId },
                select: { recipeId: true },
            })
        ).map((entry) => entry.recipeId),
    );

    const recentViews = await prisma.userViewHistory.findMany({
        where: { userId },
        include: {
            recipe: {
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    imageUrl: true,
                    prepTime: true,
                    cookTime: true,
                    difficulty: true,
                },
            },
        },
        orderBy: { viewedAt: 'desc' },
        take: MAX_RECENT,
    });

    return recentViews.map((view) => ({
        id: view.recipe.id,
        title: view.recipe.title,
        slug: view.recipe.slug,
        imageUrl: view.recipe.imageUrl,
        prepTime: view.recipe.prepTime,
        cookTime: view.recipe.cookTime,
        difficulty: view.recipe.difficulty,
        viewedAt: view.viewedAt,
        pinned: pinnedIds.has(view.recipeId),
    }));
}

export async function GET() {
    const session = await getServerAuthSession('api/recipe-tabs/recent:GET');

    if (!session?.user?.id) {
        logMissingSession(session, 'api/recipe-tabs/recent:GET');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const recent = await loadRecentRecipes(session.user.id);
    return NextResponse.json(recent);
}

export async function POST(request: Request) {
    const session = await getServerAuthSession('api/recipe-tabs/recent:POST');

    if (!session?.user?.id) {
        logMissingSession(session, 'api/recipe-tabs/recent:POST');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { recipeId } = body ?? {};

    if (!recipeId) {
        return NextResponse.json({ error: 'recipeId is required' }, { status: 400 });
    }

    const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId },
        select: { id: true },
    });

    if (!recipe) {
        return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    const history = await prisma.userViewHistory.findFirst({
        where: { userId: session.user.id, recipeId },
    });

    if (history) {
        await prisma.userViewHistory.update({
            where: { id: history.id },
            data: { viewedAt: new Date() },
        });
    } else {
        await prisma.userViewHistory.create({
            data: {
                userId: session.user.id,
                recipeId,
                viewedAt: new Date(),
            },
        });
    }

    const recent = await loadRecentRecipes(session.user.id);

    logAuth('info', 'POST /api/recipe-tabs/recent: tracked view', {
        userId: session.user.id,
        recipeId,
    });

    return NextResponse.json({ recent });
}
