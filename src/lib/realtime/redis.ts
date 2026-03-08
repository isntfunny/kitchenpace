import Redis from 'ioredis';

type GlobalWithRealtimeRedis = typeof globalThis & {
    realtimeRedis?: Redis;
    realtimeSubscriber?: Redis;
};

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = Number.parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

function createRedisConnection(name: string) {
    const client = new Redis({
        host: REDIS_HOST,
        port: REDIS_PORT,
        password: REDIS_PASSWORD,
        lazyConnect: true,
        maxRetriesPerRequest: null,
        connectionName: name,
    });

    client.on('error', (error) => {
        console.error(`[Realtime Redis:${name}]`, error.message);
    });

    return client;
}

const globalWithRealtimeRedis = globalThis as GlobalWithRealtimeRedis;

export function getRealtimeRedis() {
    if (!globalWithRealtimeRedis.realtimeRedis) {
        globalWithRealtimeRedis.realtimeRedis = createRedisConnection('realtime-publisher');
    }

    return globalWithRealtimeRedis.realtimeRedis;
}

export function createRealtimeSubscriber() {
    return createRedisConnection(`realtime-subscriber-${Math.random().toString(36).slice(2, 8)}`);
}
