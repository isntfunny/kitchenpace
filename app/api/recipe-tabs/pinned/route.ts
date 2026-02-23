import { NextResponse } from 'next/server';

import { getServerAuthSession, logMissingSession } from '@/lib/auth';
import { logAuth } from '@/lib/auth-logger';
import { prisma } from '@/lib/prisma';

const MAX_PINNED = 3;

async function buildPinnedResponse(userId: string) {
    const pinnedEntries = await prisma.pinnedFavorite.findMany({
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
        orderBy: { position: 'asc' },
    });

    return pinnedEntries.map((entry) => ({
        id: entry.recipe.id,
        title: entry.recipe.title,
        slug: entry.recipe.slug,
        imageUrl: entry.recipe.imageUrl,
        prepTime: entry.recipe.prepTime,
        cookTime: entry.recipe.cookTime,
        difficulty: entry.recipe.difficulty,
        position: entry.position,
    }));
}

export async function GET() {
    const session = await getServerAuthSession('api/recipe-tabs/pinned:GET');

    if (!session?.user?.id) {
        logMissingSession(session, 'api/recipe-tabs/pinned:GET');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pinned = await buildPinnedResponse(session.user.id);
    return NextResponse.json(pinned);
}

export async function POST(request: Request) {
    const session = await getServerAuthSession('api/recipe-tabs/pinned:POST');

    if (!session?.user?.id) {
        logMissingSession(session, 'api/recipe-tabs/pinned:POST');
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

    const existingPinned = await prisma.pinnedFavorite.findMany({
        where: { userId: session.user.id },
        orderBy: { position: 'asc' },
    });

    if (existingPinned.some((entry) => entry.recipeId === recipeId)) {
        const pinned = await buildPinnedResponse(session.user.id);
        return NextResponse.json(pinned);
    }

    if (existingPinned.length >= MAX_PINNED) {
        return NextResponse.json(
            { error: `Maximum ${MAX_PINNED} pinned recipes allowed` },
            { status: 400 },
        );
    }

    const usedSlots = new Set(existingPinned.map((entry) => entry.position));
    const availablePosition = [0, 1, 2].find((slot) => !usedSlots.has(slot));

    if (availablePosition === undefined) {
        return NextResponse.json({ error: 'No pinned slots available' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
        await tx.pinnedFavorite.create({
            data: {
                userId: session.user.id,
                recipeId,
                position: availablePosition,
            },
        });

        const history = await tx.userViewHistory.findFirst({
            where: { userId: session.user.id, recipeId },
        });

        if (history) {
            await tx.userViewHistory.update({
                where: { id: history.id },
                data: { viewedAt: new Date() },
            });
        } else {
            await tx.userViewHistory.create({
                data: {
                    userId: session.user.id,
                    recipeId,
                    viewedAt: new Date(),
                },
            });
        }
    });

    const pinned = await buildPinnedResponse(session.user.id);

    logAuth('info', 'POST /api/recipe-tabs/pinned: pinned recipe', {
        userId: session.user.id,
        recipeId,
    });

    return NextResponse.json(pinned, { status: 201 });
}
