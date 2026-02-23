import { NextResponse } from 'next/server';

import { getServerAuthSession, logMissingSession } from '@/lib/auth';
import { logAuth } from '@/lib/auth-logger';
import { prisma } from '@/lib/prisma';

const MAX_RECENT = 10;

async function loadRecentRecipes(userId: string) {
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
        distinct: ['recipeId'],
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
    }));
}

export async function GET() {
    const session = await getServerAuthSession('api/recent-recipes:GET');

    if (!session?.user?.id) {
        logMissingSession(session, 'api/recent-recipes:GET');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const recent = await loadRecentRecipes(session.user.id);
    return NextResponse.json(recent);
}

export async function POST(request: Request) {
    try {
        const session = await getServerAuthSession('api/recent-recipes:POST');

        if (!session?.user?.id) {
            logMissingSession(session, 'api/recent-recipes:POST');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { recipeId } = body;

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

        const existing = await prisma.userViewHistory.findFirst({
            where: { userId: session.user.id, recipeId },
        });

        if (existing) {
            await prisma.userViewHistory.update({
                where: { id: existing.id },
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

        const count = await prisma.userViewHistory.count({
            where: { userId: session.user.id },
        });

        if (count > MAX_RECENT * 2) {
            const toDelete = await prisma.userViewHistory.findMany({
                where: { userId: session.user.id },
                orderBy: { viewedAt: 'asc' },
                take: count - MAX_RECENT,
                select: { id: true },
            });

            const idsToDelete = toDelete.map((t) => t.id);
            await prisma.userViewHistory.deleteMany({
                where: { id: { in: idsToDelete } },
            });
        }

        const recent = await loadRecentRecipes(session.user.id);

        logAuth('info', 'POST /api/recent-recipes: tracked view', {
            userId: session.user.id,
            recipeId,
        });

        return NextResponse.json({ recent });
    } catch (error) {
        logAuth('error', 'POST /api/recent-recipes failed', {
            message: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json(
            { error: 'Internal Server Error', details: String(error) },
            { status: 500 },
        );
    }
}
