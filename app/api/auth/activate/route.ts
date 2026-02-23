import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { token } = body;

        if (!token) {
            return NextResponse.json({ message: 'Aktivierungscode erforderlich' }, { status: 400 });
        }

        const user = await prisma.user.findFirst({
            where: {
                activationToken: token,
                isActive: false,
            },
        });

        if (!user) {
            return NextResponse.json(
                { message: 'Ungültiger oder bereits verwendeter Aktivierungscode' },
                { status: 400 },
            );
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                isActive: true,
                activationToken: null,
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Konto erfolgreich aktiviert!',
        });
    } catch (error) {
        console.error('Activation error:', error);
        return NextResponse.json({ message: 'Ein Fehler ist aufgetreten' }, { status: 500 });
    }
}
