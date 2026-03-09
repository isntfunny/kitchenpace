import { fetchActivityFeedAfterCursor } from '@app/lib/activity-feed';
import { getServerAuthSession } from '@app/lib/auth';
import { subscribeToRealtimeChannel } from '@app/lib/realtime/broker';
import { isEntityAfterCursor, parseStreamCursor } from '@app/lib/realtime/cursor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') === 'user' ? 'user' : 'global';
    const cursor = parseStreamCursor(searchParams.get('after'), searchParams.get('afterId'));
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
            const send = (event: string, payload: unknown) => {
                controller.enqueue(
                    encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`),
                );
            };

            const catchUpItems = await fetchActivityFeedAfterCursor(feedScope, 25, cursor);
            for (const item of catchUpItems) {
                send('activity.created', item);
            }

            send('ready', { ok: true });

            const unsubscribe = await subscribeToRealtimeChannel(channel, (event) => {
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
                try { controller.close(); } catch { /* already closed by runtime */ }
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
