import { Role } from '@prisma/client';

import { fetchAdminInboxItems } from '@app/lib/admin-inbox';
import { getServerAuthSession, logMissingSession } from '@app/lib/auth';
import { logAuth } from '@app/lib/auth-logger';
import { serializeNotification } from '@app/lib/events/views';
import { subscribeToRealtimeChannels, type RealtimeChannel } from '@app/lib/realtime/broker';
import { isEntityAfterCursor, parseStreamCursor } from '@app/lib/realtime/cursor';
import { prisma } from '@shared/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const session = await getServerAuthSession('api/notifications/stream');

    if (!session?.user?.id) {
        logMissingSession(session, 'api/notifications/stream');
        logAuth('warn', 'GET /api/notifications/stream: unauthorized');
        return new Response('Unauthorized', { status: 401 });
    }

    const userId = session.user.id;
    const role = (session.user as { role?: string }).role;
    const isAdminOrMod = role === Role.ADMIN || role === Role.MODERATOR;
    const { searchParams } = new URL(request.url);
    const cursor = parseStreamCursor(searchParams.get('after'), searchParams.get('afterId'));
    const encoder = new TextEncoder();

    const channels: RealtimeChannel[] = [`notifications:user:${userId}`];
    if (isAdminOrMod) {
        channels.push('admin-notifications');
    }

    const stream = new ReadableStream({
        async start(controller) {
            const send = (event: string, payload: unknown) => {
                controller.enqueue(
                    encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`),
                );
            };

            const catchUpNotifications = await prisma.notification.findMany({
                where: {
                    userId,
                    ...(cursor
                        ? {
                              OR: [
                                  { createdAt: { gt: cursor.createdAt } },
                                  {
                                      createdAt: cursor.createdAt,
                                      id: { gt: cursor.id },
                                  },
                              ],
                          }
                        : {}),
                },
                orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
                take: 50,
            });

            for (const notification of catchUpNotifications) {
                send('notification.created', serializeNotification(notification));
            }

            if (isAdminOrMod) {
                const adminItems = await fetchAdminInboxItems(50);
                for (const item of adminItems) {
                    send('admin-inbox.created', item);
                }
            }

            send('ready', { ok: true });

            const unsubscribe = await subscribeToRealtimeChannels(channels, (_channel, event) => {
                if (event.type !== 'admin-inbox.removed' && !isEntityAfterCursor(event, cursor)) {
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
                try {
                    controller.close();
                } catch {
                    /* already closed by runtime */
                }
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
