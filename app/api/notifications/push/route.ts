import { NextResponse, type NextRequest } from 'next/server';

import { getServerAuthSession, logMissingSession } from '@/lib/auth';
import { logAuth } from '@/lib/auth-logger';
import { prisma } from '@/lib/prisma';

const requireSession = async (context: string) => {
    const session = await getServerAuthSession(context);

    if (!session?.user?.id) {
        logMissingSession(session, context);
        return null;
    }

    return session.user;
};

export async function GET() {
    const user = await requireSession('api/notifications/push:GET');
    if (!user) {
        logAuth('warn', 'GET /api/notifications/push: unauthorized');
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await prisma.pushSubscription.findFirst({ where: { userId: user.id } });

    return NextResponse.json({
        subscribed: Boolean(subscription),
        endpoint: subscription?.endpoint ?? null,
    });
}

export async function POST(request: NextRequest) {
    const user = await requireSession('api/notifications/push:POST');
    if (!user) {
        logAuth('warn', 'POST /api/notifications/push: unauthorized');
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const payload = (await request.json().catch(() => ({}))) as Partial<{
        subscription?: { endpoint?: string; keys?: Record<string, string> };
        label?: string;
    }>;

    const subscription = payload.subscription;
    if (!subscription?.endpoint || !subscription?.keys) {
        return NextResponse.json({ message: 'Invalid subscription payload' }, { status: 400 });
    }

    await prisma.pushSubscription.upsert({
        where: { endpoint: subscription.endpoint },
        update: {
            userId: user.id,
            keys: subscription.keys,
            label: payload.label?.trim() || null,
        },
        create: {
            userId: user.id,
            endpoint: subscription.endpoint,
            keys: subscription.keys,
            label: payload.label?.trim() || null,
        },
    });

    return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
    const user = await requireSession('api/notifications/push:DELETE');
    if (!user) {
        logAuth('warn', 'DELETE /api/notifications/push: unauthorized');
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const payload = (await request.json().catch(() => ({}))) as Partial<{ endpoint?: string }>;
    const endpoint = payload.endpoint?.trim();

    if (!endpoint) {
        return NextResponse.json({ message: 'Endpoint required' }, { status: 400 });
    }

    await prisma.pushSubscription.deleteMany({
        where: { userId: user.id, endpoint },
    });

    return NextResponse.json({ success: true });
}
