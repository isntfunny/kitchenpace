import { Role } from '@prisma/client';

import { fetchAdminInboxItems } from '@app/lib/admin-inbox';
import { getServerAuthSession } from '@app/lib/auth';
import { subscribeToRealtimeChannel } from '@app/lib/realtime/broker';
import { isEntityAfterCursor, parseStreamCursor } from '@app/lib/realtime/cursor';
import { prisma } from '@shared/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireModerator() {
    const session = await getServerAuthSession('api/admin/notifications/stream');

    if (!session?.user?.id) {
        return null;
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
    });

    if (user?.role !== Role.ADMIN && user?.role !== Role.MODERATOR) {
        return null;
    }

    return session.user;
}

export async function GET(request: Request) {
    const user = await requireModerator();
    if (!user) {
        return new Response('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cursor = parseStreamCursor(searchParams.get('after'), searchParams.get('afterId'));
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const send = (event: string, payload: unknown) => {
                controller.enqueue(
                    encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`),
                );
            };

            const catchUpItems = await fetchAdminInboxItems(50);
            const orderedCatchUpItems = [...catchUpItems]
                .filter((item) => isEntityAfterCursor(item, cursor))
                .sort((a, b) => {
                    if (a.createdAt === b.createdAt) {
                        return a.id.localeCompare(b.id);
                    }

                    return a.createdAt.localeCompare(b.createdAt);
                });

            for (const item of orderedCatchUpItems) {
                send('admin-inbox.created', item);
            }

            send('ready', { ok: true });

            const unsubscribe = await subscribeToRealtimeChannel('admin-notifications', (event) => {
                if (event.type === 'admin-inbox.removed') {
                    send(event.type, event.payload);
                    return;
                }

                if (!isEntityAfterCursor(event, cursor)) {
                    return;
                }

                send(event.type, event.payload);
            });

            const heartbeat = setInterval(() => {
                controller.enqueue(encoder.encode(': keepalive\n\n'));
            }, 25_000);

            request.signal.addEventListener('abort', async () => {
                clearInterval(heartbeat);
                await unsubscribe();
                controller.close();
            });
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
        },
    });
}
