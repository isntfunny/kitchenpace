import { Role } from '@prisma/client';

import { fetchAdminInboxItems } from '@app/lib/admin-inbox';
import { getServerAuthSession } from '@app/lib/auth';
import { subscribeToRealtimeChannel } from '@app/lib/realtime/broker';
import {
    formatStreamCursor,
    isEntityAfterCursor,
    resolveRequestStreamCursor,
} from '@app/lib/realtime/cursor';
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

    const cursor = resolveRequestStreamCursor(request);
    const encoder = new TextEncoder();

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
                send('admin-inbox.created', item, item);
            }

            send('ready', { ok: true });

            const unsubscribe = await subscribeToRealtimeChannel('admin-notifications', (event) => {
                if (event.type === 'admin-inbox.removed') {
                    send(event.type, event.payload, event);
                    return;
                }

                if (!isEntityAfterCursor(event, cursor)) {
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
