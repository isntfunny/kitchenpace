import { NextResponse } from 'next/server';

import { getServerAuthSession, logMissingSession } from '@/lib/auth';
import { logAuth } from '@/lib/auth-logger';
import { prisma } from '@/lib/prisma';

export async function GET() {
    const session = await getServerAuthSession('api/auth/profile');

    if (!session?.user?.id) {
        logMissingSession(session, 'api/auth/profile');
        return NextResponse.json({ profile: null });
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
    });

    if (!user) {
        logAuth('warn', 'api/auth/profile: session user missing in DB', {
            userId: session.user.id,
        });
        return NextResponse.json({ profile: null, needsSignOut: true });
    }

    const profile = await prisma.profile.findUnique({
        where: { userId: session.user.id },
    });

    if (!profile) {
        logAuth('debug', 'api/auth/profile: no profile entry', {
            userId: session.user.id,
        });
    }

    return NextResponse.json({
        profile: profile
            ? {
                  photoUrl: profile.photoUrl,
                  nickname: profile.nickname,
              }
            : null,
    });
}
