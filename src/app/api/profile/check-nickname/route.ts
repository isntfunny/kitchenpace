import { NextResponse, type NextRequest } from 'next/server';

import { getServerAuthSession } from '@app/lib/auth';
import { prisma } from '@shared/prisma';

export async function GET(request: NextRequest) {
    const session = await getServerAuthSession('api/profile/check-nickname');

    if (!session?.user?.id) {
        return NextResponse.json({ available: false }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const nickname = searchParams.get('nickname')?.trim() ?? '';

    if (nickname.length < 2) {
        return NextResponse.json({ available: false });
    }

    const existing = await prisma.profile.findFirst({
        where: { nickname, userId: { not: session.user.id } },
        select: { id: true },
    });

    return NextResponse.json({ available: !existing });
}
