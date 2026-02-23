import { NextResponse } from 'next/server';

import { getServerAuthSession, logMissingSession } from '@/lib/auth';
import { logAuth } from '@/lib/auth-logger';
import { prisma } from '@/lib/prisma';

const MAX_PINNED = 3;

async function buildPinnedResponse(userId: string) {
    const pinnedEntries = await prisma.userViewHistory.findMany({
        where: { userId, pinned: true },
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
        take: MAX_PINNED,
    });

    return pinnedEntries.map((entry) => ({
        id: entry.recipe.id,
        title: entry.recipe.title,
        slug: entry.recipe.slug,
        imageUrl: entry.recipe.imageUrl,
        prepTime: entry.recipe.prepTime,
        cookTime: entry.recipe.cookTime,
        difficulty: entry.recipe.difficulty,
        pinned: entry.pinned,
        viewedAt: entry.viewedAt,
    }));
}

export async function GET() {
    const session = await getServerAuthSession('api/pinned-favorites:GET');

    if (!session?.user?.id) {
        logMissingSession(session, 'api/pinned-favorites:GET');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pinned = await buildPinnedResponse(session.user.id);
    return NextResponse.json(pinned);
}

export async function POST(request: Request) {
    const session = await getServerAuthSession('api/pinned-favorites:POST');

    if (!session?.user?.id) {
        logMissingSession(session, 'api/pinned-favorites:POST');
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

    const pinnedCount = await prisma.userViewHistory.count({
        where: { userId: session.user.id, pinned: true },
    });

    if (pinnedCount >= MAX_PINNED) {
        return NextResponse.json(
            { error: `Maximum ${MAX_PINNED} pinned favorites allowed` },
            { status: 400 },
        );
    }

    await prisma.userViewHistory.upsert({
        where: { userId_recipeId: { userId: session.user.id, recipeId } },
        update: { pinned: true, viewedAt: new Date() },
        create: {
            userId: session.user.id,
            recipeId,
            viewedAt: new Date(),
            pinned: true,
        },
    });

    const pinned = await buildPinnedResponse(session.user.id);

    logAuth('info', 'POST /api/pinned-favorites: pinned recipe', {
        userId: session.user.id,
        recipeId,
    });

    return NextResponse.json(pinned, { status: 201 });
}
