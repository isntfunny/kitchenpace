import bcrypt from 'bcrypt';
import { NextResponse } from 'next/server';

import { createLogger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

const log = createLogger('auth-reset-password');

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { token, password } = body;

        if (!token || !password) {
            return NextResponse.json(
                { error: 'Token und neues Passwort sind erforderlich' },
                { status: 400 },
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: 'Das Passwort muss mindestens 6 Zeichen lang sein' },
                { status: 400 },
            );
        }

        const user = await prisma.user.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: {
                    gt: new Date(),
                },
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'Ungültiger oder abgelaufener Token' },
                { status: 400 },
            );
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                hashedPassword,
                resetToken: null,
                resetTokenExpiry: null,
            },
        });

        log.info('Password reset successful', { userId: user.id });

        return NextResponse.json(
            { message: 'Passwort wurde erfolgreich zurückgesetzt' },
            { status: 200 },
        );
    } catch (error) {
        log.error('Password reset failed', {
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ error: 'Ein Fehler ist aufgetreten' }, { status: 500 });
    }
}
