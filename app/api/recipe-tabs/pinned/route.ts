import { NextResponse } from 'next/server';

import { fetchPinnedEntries, markHistoryPinned, MAX_PINNED } from '@/app/api/recipe-tabs/helpers';
import { getServerAuthSession, logMissingSession } from '@/lib/auth';
import { logAuth } from '@/lib/auth-logger';
import { prisma } from '@/lib/prisma';

export async function GET() {
    const session = await getServerAuthSession('api/recipe-tabs/pinned:GET');

    if (!session?.user?.id) {
        logMissingSession(session, 'api/recipe-tabs/pinned:GET');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entries: pinned } = await fetchPinnedEntries(session.user.id);
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

    const { entries: existingPinned, source } = await fetchPinnedEntries(session.user.id);

    if (existingPinned.some((entry) => entry.id === recipeId)) {
        return NextResponse.json(existingPinned);
    }

    if (existingPinned.length >= MAX_PINNED) {
        return NextResponse.json(
            { error: `Maximum ${MAX_PINNED} pinned recipes allowed` },
            { status: 400 },
        );
    }

    if (source === 'table') {
        const usedSlots = new Set(existingPinned.map((entry) => entry.position));
        const availablePosition = [0, 1, 2].find((slot) => !usedSlots.has(slot));

        if (availablePosition === undefined) {
            return NextResponse.json({ error: 'No pinned slots available' }, { status: 400 });
        }

        await prisma.pinnedFavorite.create({
            data: {
                userId: session.user.id,
                recipeId,
                position: availablePosition,
            },
        });

        await markHistoryPinned(session.user.id, recipeId, true);
    } else {
        await markHistoryPinned(session.user.id, recipeId, true);
    }

    const { entries: pinned } = await fetchPinnedEntries(session.user.id);

    logAuth('info', 'POST /api/recipe-tabs/pinned: pinned recipe', {
        userId: session.user.id,
        recipeId,
    });

    return NextResponse.json(pinned, { status: 201 });
}
