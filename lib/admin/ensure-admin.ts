import { Role } from '@prisma/client';
import { redirect } from 'next/navigation';

import { getServerAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function ensureAdminSession(context?: string) {
    const session = await getServerAuthSession(context);

    if (!session?.user?.id) {
        redirect('/auth/signin');
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== Role.ADMIN) {
        redirect('/');
    }

    return session;
}
