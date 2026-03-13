import { fetchActivityFeedAfterCursor } from '@app/lib/activity-feed';
import { getServerAuthSession } from '@app/lib/auth';
import { subscribeToRealtimeChannel } from '@app/lib/realtime/broker';
import {
    formatStreamCursor,
    isEntityAfterCursor,
    resolveRequestStreamCursor,
} from '@app/lib/realtime/cursor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') === 'user' ? 'user' : 'global';
    const cursor = resolveRequestStreamCursor(request);
    const encoder = new TextEncoder();

    let channel: `activity:user:${string}` | 'activity:global' = 'activity:global';
    let feedScope: 'global' | { type: 'user'; userId: string } = 'global';

    if (scope === 'user') {
        const session = await getServerAuthSession('api/activity/stream');
        if (!session?.user?.id) {
            return new Response('Unauthorized', { status: 401 });
        }

        channel = `activity:user:${session.user.id}`;
        feedScope = { type: 'user', userId: session.user.id };
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

            const catchUpItems = await fetchActivityFeedAfterCursor(feedScope, 25, cursor);
            for (const item of catchUpItems) {
                send('activity.created', item, item);
            }

            send('ready', { ok: true });

            const unsubscribe = await subscribeToRealtimeChannel(channel, (event) => {
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
