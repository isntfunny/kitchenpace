import { NextResponse } from 'next/server';

import { getServerAuthSession, logMissingSession } from '@/lib/auth';
import { logAuth } from '@/lib/auth-logger';
import { prisma } from '@/lib/prisma';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerAuthSession('api/pinned-favorites:DELETE');

    if (!session?.user?.id) {
        logMissingSession(session, 'api/pinned-favorites:DELETE');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const pinnedFavorite = await prisma.pinnedFavorite.findFirst({
        where: { id, userId: session.user.id },
    });

    if (!pinnedFavorite) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const deletedPosition = pinnedFavorite.position;

    await prisma.$transaction([
        prisma.pinnedFavorite.delete({
            where: { id },
        }),
        prisma.pinnedFavorite.updateMany({
            where: {
                userId: session.user.id,
                position: { gt: deletedPosition },
            },
            data: {
                position: { decrement: 1 },
            },
        }),
    ]);

    logAuth('info', 'DELETE /api/pinned-favorites: removed pinned recipe', {
        userId: session.user.id,
        recipeId: pinnedFavorite.recipeId,
    });

    return NextResponse.json({ success: true });
}
