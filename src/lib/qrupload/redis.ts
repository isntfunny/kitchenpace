import { getRealtimeRedis } from '@app/lib/realtime/redis';

import type { QRTokenRedisValue } from './types';

const TTL_SECONDS = 15 * 60;

const key = (tokenId: string) => `qrupload:${tokenId}`;

export async function setTokenPending(tokenId: string, userId: string): Promise<void> {
    const redis = getRealtimeRedis();
    const value: QRTokenRedisValue = { status: 'pending', userId };
    await redis.set(key(tokenId), JSON.stringify(value), 'EX', TTL_SECONDS);
}

export async function getTokenValue(tokenId: string): Promise<QRTokenRedisValue | null> {
    const redis = getRealtimeRedis();
    const raw = await redis.get(key(tokenId));
    if (!raw) return null;
    return JSON.parse(raw) as QRTokenRedisValue;
}

export async function completeToken(
    tokenId: string,
    imageKey: string,
    moderationStatus: string,
): Promise<void> {
    const redis = getRealtimeRedis();
    const existing = await getTokenValue(tokenId);
    const ttl = await redis.ttl(key(tokenId));
    const remaining = ttl > 0 ? ttl : 60;
    const value: QRTokenRedisValue = {
        status: 'complete',
        userId: existing?.userId ?? '',
        imageKey,
        moderationStatus,
    };
    await redis.set(key(tokenId), JSON.stringify(value), 'EX', remaining);
}
