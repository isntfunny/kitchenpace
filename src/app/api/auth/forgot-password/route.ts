import crypto from 'crypto';

import { NextResponse } from 'next/server';

import { sendNotifusePasswordResetEmail } from '@app/lib/notifuse/email';
import { createLogger } from '@shared/logger';
import { prisma } from '@shared/prisma';

const log = createLogger('auth-forgot-password');

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ error: 'E-Mail-Adresse ist erforderlich' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (!user) {
            return NextResponse.json(
                {
                    message:
                        'Falls ein Konto mit dieser E-Mail existiert, wurde eine E-Mail gesendet.',
                },
                { status: 200 },
            );
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken,
                resetTokenExpiry,
            },
        });

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const resetLink = `${appUrl}/auth/new-password?token=${resetToken}`;

        await sendNotifusePasswordResetEmail({
            email: user.email!,
            resetLink,
        });

        log.info('Password reset requested', { userId: user.id, email: user.email });

        return NextResponse.json(
            { message: 'Falls ein Konto mit dieser E-Mail existiert, wurde eine E-Mail gesendet.' },
            { status: 200 },
        );
    } catch (error) {
        log.error('Forgot password failed', {
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ error: 'Ein Fehler ist aufgetreten' }, { status: 500 });
    }
}
