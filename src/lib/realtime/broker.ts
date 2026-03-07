import { createRealtimeSubscriber, getRealtimeRedis } from './redis';

export type RealtimeChannel =
    | `notifications:user:${string}`
    | 'admin-notifications'
    | 'activity:global'
    | `activity:user:${string}`;

export type RealtimeEvent<TPayload = unknown> = {
    id: string;
    createdAt: string;
    type: string;
    payload: TPayload;
};

export async function publishRealtimeEvent<TPayload>(
    channel: RealtimeChannel,
    event: RealtimeEvent<TPayload>,
) {
    const redis = getRealtimeRedis();
    if (redis.status !== 'ready') {
        await redis.connect().catch(() => {});
    }

    await redis.publish(channel, JSON.stringify(event));
}

export async function subscribeToRealtimeChannel(
    channel: RealtimeChannel,
    onEvent: (event: RealtimeEvent) => void,
) {
    return subscribeToRealtimeChannels([channel], (_ch, event) => onEvent(event));
}

export async function subscribeToRealtimeChannels(
    channels: RealtimeChannel[],
    onEvent: (channel: string, event: RealtimeEvent) => void,
) {
    const subscriber = createRealtimeSubscriber();

    if (subscriber.status !== 'ready') {
        await subscriber.connect().catch(() => {});
    }

    await subscriber.subscribe(...channels);

    const listener = (channel: string, message: string) => {
        try {
            onEvent(channel, JSON.parse(message) as RealtimeEvent);
        } catch (error) {
            console.error('[Realtime] Failed to parse event', error);
        }
    };

    subscriber.on('message', listener);

    return async () => {
        subscriber.off('message', listener);
        await subscriber.unsubscribe(...channels).catch(() => {});
        await subscriber.quit().catch(() => {});
    };
}
