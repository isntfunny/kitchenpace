import Redis from 'ioredis';

import { createLogger } from '../../shared/logger';

const log = createLogger('redis');

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

export interface RedisConfig {
    host: string;
    port: number;
    password?: string;
}

export const redisConfig: RedisConfig = {
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
};

function createRedisInstance(name?: string): Redis {
    const redis = new Redis({
        host: REDIS_HOST,
        port: REDIS_PORT,
        password: REDIS_PASSWORD,
        maxRetriesPerRequest: null,
        lazyConnect: true,
        ...(name && { connectionName: name }),
    });

    redis.on('error', (err) => {
        log.error('Redis connection error', { client: name || 'default', error: err });
    });

    redis.on('connect', () => {
        log.info('Redis connected', { client: name || 'default' });
    });

    return redis;
}

let _redis: Redis | null = null;
let _subscriber: Redis | null = null;

export function getRedis(): Redis {
    if (!_redis) {
        _redis = createRedisInstance('bullmq-main');
    }
    return _redis;
}

export async function disconnectRedis(): Promise<void> {
    if (_redis) {
        await _redis.quit();
        _redis = null;
    }
    if (_subscriber) {
        await _subscriber.quit();
        _subscriber = null;
    }
}
