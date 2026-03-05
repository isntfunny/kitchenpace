'use server';

import { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import { prisma } from '@shared/prisma';

export async function updateUserRole(userId: string, role: Role) {
    await prisma.user.update({
        where: { id: userId },
        data: { role },
    });
    revalidatePath('/admin/accounts');
}

export async function toggleUserActive(userId: string, isActive: boolean) {
    await prisma.user.update({
        where: { id: userId },
        data: { isActive },
    });
    revalidatePath('/admin/accounts');
}

export async function sendPasswordReset(userId: string) {
    const crypto = await import('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await prisma.user.update({
        where: { id: userId },
        data: {
            resetToken,
            resetTokenExpiry,
        },
    });

    // In a real app, you would send an email here
    // For now, we just return the token for testing purposes
    return { token: resetToken };
}
