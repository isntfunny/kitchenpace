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

    const history = await prisma.userViewHistory.findFirst({
        where: { id, userId: session.user.id },
    });

    if (!history) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.userViewHistory.update({
        where: { id: history.id },
        data: { pinned: false },
    });

    logAuth('info', 'DELETE /api/pinned-favorites: removed pinned recipe', {
        userId: session.user.id,
        recipeId: history.recipeId,
    });

    return NextResponse.json({ success: true });
}
