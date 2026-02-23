import { NextResponse } from 'next/server';

import { getServerAuthSession, logMissingSession } from '@/lib/auth';
import { logAuth } from '@/lib/auth-logger';
import { prisma } from '@/lib/prisma';

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ recipeId: string }> },
) {
    const session = await getServerAuthSession('api/recipe-tabs/pinned:DELETE');

    if (!session?.user?.id) {
        logMissingSession(session, 'api/recipe-tabs/pinned:DELETE');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recipeId } = await params;

    if (!recipeId) {
        return NextResponse.json({ error: 'recipeId is required' }, { status: 400 });
    }

    const pinned = await prisma.pinnedFavorite.findUnique({
        where: { userId_recipeId: { userId: session.user.id, recipeId } },
    });

    if (!pinned) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.pinnedFavorite.delete({ where: { id: pinned.id } });

    logAuth('info', 'DELETE /api/recipe-tabs/pinned: removed pinned recipe', {
        userId: session.user.id,
        recipeId,
    });

    return NextResponse.json({ success: true });
}
