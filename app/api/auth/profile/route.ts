import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { signOut } from 'next-auth/react';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ profile: null });
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
    });

    if (!user) {
        await signOut({ redirect: false });
        return NextResponse.json({ profile: null, needsSignOut: true });
    }

    const profile = await prisma.profile.findUnique({
        where: { userId: session.user.id },
    });

    return NextResponse.json({
        profile: profile
            ? {
                  photoUrl: profile.photoUrl,
                  nickname: profile.nickname,
              }
            : null,
    });
}
