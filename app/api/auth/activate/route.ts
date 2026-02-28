import { NextResponse } from 'next/server';

import { fireEvent } from '@/lib/events/fire';
import { createLogger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

const log = createLogger('auth-activate');

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

        await fireEvent({
            event: 'userActivated',
            actorId: user.id,
            data: {
                email: user.email ?? '',
                name: user.name || undefined,
            },
        });

        log.info('User activated', { userId: user.id, email: user.email });

        return NextResponse.json({
            success: true,
            message: 'Konto erfolgreich aktiviert!',
        });
    } catch (error) {
        log.error('Activation failed', {
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ message: 'Ein Fehler ist aufgetreten' }, { status: 500 });
    }
}
