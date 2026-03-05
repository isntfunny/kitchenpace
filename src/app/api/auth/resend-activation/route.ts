import { randomBytes } from 'crypto';

import { NextResponse } from 'next/server';

import { sendNotifuseActivationEmail } from '@app/lib/notifuse/email';
import { createLogger } from '@shared/logger';
import { prisma } from '@shared/prisma';

const log = createLogger('auth-resend-activation');

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json({ message: 'E-Mail ist erforderlich' }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (!user) {
            return NextResponse.json({
                success: true,
                message:
                    'Wenn ein Konto mit dieser E-Mail existiert und noch nicht aktiviert ist, wurde eine neue Aktivierungsmail gesendet.',
            });
        }

        if (user.isActive) {
            return NextResponse.json({
                success: true,
                message: 'Dieses Konto ist bereits aktiviert. Du kannst dich jetzt anmelden.',
            });
        }

        const activationToken = randomBytes(32).toString('hex');

        await prisma.user.update({
            where: { id: user.id },
            data: {
                activationToken,
            },
        });

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const activationLink = `${appUrl}/auth/activate?token=${activationToken}`;

        const notifuseResponse = await sendNotifuseActivationEmail({
            email: normalizedEmail,
            activationLink,
        });

        log.info('Resent activation email', {
            email: normalizedEmail,
            userId: user.id,
            messageId: notifuseResponse.message_id,
        });

        return NextResponse.json({
            success: true,
            message: 'Aktivierungsmail wurde erneut gesendet',
            messageId: notifuseResponse.message_id,
        });
    } catch (error) {
        log.error('Resend activation failed', {
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json(
            {
                message: 'Ein Fehler ist aufgetreten',
                error: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
        );
    }
}
