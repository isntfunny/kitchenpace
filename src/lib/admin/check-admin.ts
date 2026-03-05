import { Role } from '@prisma/client';

import { prisma } from '@shared/prisma';

/**
 * Check if a user has admin role. Does a fresh DB lookup (doesn't trust JWT).
 */
export async function isAdmin(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
    });
    return user?.role === Role.ADMIN;
}
