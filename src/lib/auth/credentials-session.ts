'use server';

import { randomUUID } from 'crypto';

import bcrypt from 'bcrypt';
import { cookies } from 'next/headers';

import { logAuth } from '@app/lib/auth-logger';
import { prisma } from '@shared/prisma';

import { SESSION_COOKIE_NAME, SESSION_MAX_AGE } from './session-cookie';

type SignInResult =
    | { success: true }
    | { error: 'INVALID_CREDENTIALS' | 'ACCOUNT_INACTIVE' | 'ACCOUNT_BANNED' };

export async function credentialsSignIn(email: string, password: string): Promise<SignInResult> {
    const sanitizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
        where: { email: sanitizedEmail },
    });

    if (!user?.hashedPassword) {
        logAuth('warn', 'credentialsSignIn: user missing or no password hash', {
            email: sanitizedEmail,
        });
        return { error: 'INVALID_CREDENTIALS' };
    }

    const isValid = await bcrypt.compare(password, user.hashedPassword);
    if (!isValid) {
        logAuth('warn', 'credentialsSignIn: invalid password', { userId: user.id });
        return { error: 'INVALID_CREDENTIALS' };
    }

    if (!user.isActive) {
        logAuth('warn', 'credentialsSignIn: account not activated', { userId: user.id });
        return { error: 'ACCOUNT_INACTIVE' };
    }

    if (user.role === 'BANNED') {
        logAuth('warn', 'credentialsSignIn: account banned', { userId: user.id });
        return { error: 'ACCOUNT_BANNED' };
    }

    const sessionToken = randomUUID();
    const expires = new Date(Date.now() + SESSION_MAX_AGE * 1000);
    const { getRequestMetadata } = await import('./device');
    const metadata = await getRequestMetadata();

    await prisma.session.create({
        data: {
            sessionToken,
            userId: user.id,
            expires,
            ...metadata,
        },
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        expires,
    });

    logAuth('info', 'credentialsSignIn: success', { userId: user.id });

    return { success: true };
}
