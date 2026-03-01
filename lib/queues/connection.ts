import Redis from 'ioredis';

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
        console.error(`[Redis ${name || 'default'}] Error:`, err.message);
    });

    redis.on('connect', () => {
        console.log(`[Redis ${name || 'default'}] Connected`);
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

export function getSubscriber(): Redis {
    if (!_subscriber) {
        _subscriber = createRedisInstance('bullmq-subscriber');
    }
    return _subscriber;
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
