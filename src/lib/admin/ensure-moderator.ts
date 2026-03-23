import { redirect } from 'next/navigation';

import { getServerAuthSession } from '@app/lib/auth';
import { prisma } from '@shared/prisma';

export async function ensureModeratorSessionWithRole(context?: string) {
    const session = await getServerAuthSession(context);

    if (!session?.user?.id) {
        redirect('/auth/signin');
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
        redirect('/');
    }

    return { session, role: user.role as 'admin' | 'moderator' };
}

export async function ensureModeratorSession(context?: string) {
    const { session } = await ensureModeratorSessionWithRole(context);
    return session;
}
