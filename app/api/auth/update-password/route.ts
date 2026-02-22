import bcrypt from 'bcrypt';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
        }

        const { currentPassword, newPassword } = await request.json();

        if (!currentPassword || !newPassword) {
            return NextResponse.json(
                { error: 'Aktuelles und neues Passwort sind erforderlich' },
                { status: 400 },
            );
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { error: 'Das neue Passwort muss mindestens 6 Zeichen enthalten' },
                { status: 400 },
            );
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
        });

        if (!user?.hashedPassword) {
            return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
        }

        const isValid = await bcrypt.compare(currentPassword, user.hashedPassword);

        if (!isValid) {
            return NextResponse.json({ error: 'Aktuelles Passwort ist falsch' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                hashedPassword,
            },
        });

        return NextResponse.json({ message: 'Passwort erfolgreich aktualisiert' }, { status: 200 });
    } catch (error) {
        console.error('Update password error:', error);
        return NextResponse.json({ error: 'Ein Fehler ist aufgetreten' }, { status: 500 });
    }
}
