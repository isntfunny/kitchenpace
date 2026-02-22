import bcrypt from 'bcrypt';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

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

        return NextResponse.json(
            { message: 'Passwort wurde erfolgreich zurückgesetzt' },
            { status: 200 },
        );
    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json({ error: 'Ein Fehler ist aufgetreten' }, { status: 500 });
    }
}
