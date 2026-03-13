import { Role } from '@prisma/client';

import { getServerAuthSession, logMissingSession } from '@app/lib/auth';
import { logAuth } from '@app/lib/auth-logger';
import { serializeNotification } from '@app/lib/events/views';
import { subscribeToRealtimeChannels, type RealtimeChannel } from '@app/lib/realtime/broker';
import {
    formatStreamCursor,
    isEntityAfterCursor,
    resolveRequestStreamCursor,
} from '@app/lib/realtime/cursor';
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
    const cursor = resolveRequestStreamCursor(request);
    const encoder = new TextEncoder();

    const channels: RealtimeChannel[] = [`notifications:user:${userId}`];
    if (isAdminOrMod) {
        channels.push('admin-notifications');
    }

    const stream = new ReadableStream({
        async start(controller) {
            const sendComment = (comment: string) => {
                controller.enqueue(encoder.encode(`: ${comment}\n\n`));
            };

            const send = (
                event: string,
                payload: unknown,
                eventCursor?: { createdAt: Date | string; id: string },
            ) => {
                const lines: string[] = [];
                if (eventCursor) {
                    lines.push(`id: ${formatStreamCursor(eventCursor.createdAt, eventCursor.id)}`);
                }

                lines.push(`event: ${event}`);
                lines.push(`data: ${JSON.stringify(payload)}`);
                controller.enqueue(encoder.encode(`${lines.join('\n')}\n\n`));
            };

            controller.enqueue(encoder.encode('retry: 3000\n\n'));
            sendComment('connected');

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
                send('notification.created', serializeNotification(notification), notification);
            }

            send('ready', { ok: true });

            const unsubscribe = await subscribeToRealtimeChannels(channels, (_channel, event) => {
                if (event.type !== 'admin-inbox.removed' && !isEntityAfterCursor(event, cursor)) {
                    return;
                }

                send(event.type, event.payload, event);
            });

            const heartbeat = setInterval(() => {
                sendComment('keepalive');
            }, 25_000);

            request.signal.addEventListener(
                'abort',
                async () => {
                    clearInterval(heartbeat);
                    await unsubscribe();
                    try {
                        controller.close();
                    } catch {
                        /* already closed by runtime */
                    }
                },
                { once: true },
            );
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    });
}
