import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
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

    return NextResponse.json({ success: true });
}
