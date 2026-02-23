import { NextResponse } from 'next/server';

import { getServerAuthSession, logMissingSession } from '@/lib/auth';
import { logAuth } from '@/lib/auth-logger';
import { prisma } from '@/lib/prisma';

const MAX_PINNED = 3;

export async function GET() {
    const session = await getServerAuthSession('api/pinned-favorites:GET');

    if (!session?.user?.id) {
        logMissingSession(session, 'api/pinned-favorites:GET');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pinnedFavorites = await prisma.pinnedFavorite.findMany({
        where: { userId: session.user.id },
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
        orderBy: { position: 'asc' },
    });

    return NextResponse.json(pinnedFavorites);
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

    const existingCount = await prisma.pinnedFavorite.count({
        where: { userId: session.user.id },
    });

    if (existingCount >= MAX_PINNED) {
        return NextResponse.json(
            { error: `Maximum ${MAX_PINNED} pinned favorites allowed` },
            { status: 400 },
        );
    }

    const existing = await prisma.pinnedFavorite.findFirst({
        where: { userId: session.user.id, recipeId },
    });

    if (existing) {
        return NextResponse.json({ error: 'Recipe already pinned' }, { status: 400 });
    }

    const position = existingCount;

    const pinnedFavorite = await prisma.pinnedFavorite.create({
        data: {
            userId: session.user.id,
            recipeId,
            position,
        },
        include: {
            recipe: {
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    imageUrl: true,
                },
            },
        },
    });

    logAuth('info', 'POST /api/pinned-favorites: pinned recipe', {
        userId: session.user.id,
        recipeId,
    });

    return NextResponse.json(pinnedFavorite, { status: 201 });
}
