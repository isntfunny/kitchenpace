import bcrypt from 'bcrypt';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password, name } = body;

        if (!email || !password) {
            return NextResponse.json(
                { message: 'E-Mail und Passwort sind erforderlich' },
                { status: 400 },
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { message: 'Passwort muss mindestens 8 Zeichen lang sein' },
                { status: 400 },
            );
        }

        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (existingUser) {
            return NextResponse.json(
                { message: 'Ein Konto mit dieser E-Mail existiert bereits' },
                { status: 400 },
            );
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                name: name || null,
                hashedPassword,
            },
        });

        await prisma.profile.create({
            data: {
                userId: user.id,
                email: email.toLowerCase(),
                nickname: name || null,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json({ message: 'Ein Fehler ist aufgetreten' }, { status: 500 });
    }
}
