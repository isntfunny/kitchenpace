import { getRealtimeRedis } from './realtime/redis';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

type RateLimitBucket = 'auth' | 'upload' | 'ai' | 'scrape' | 'search' | 'semantic';

interface RateLimitRule {
    /** Max requests allowed in the window */
    limit: number;
    /** Window size in seconds */
    window: number;
}

const RULES: Record<RateLimitBucket, RateLimitRule> = {
    auth: { limit: 10, window: 60 }, // 10 login attempts / min
    upload: { limit: 20, window: 600 }, // 20 uploads / 10 min
    ai: { limit: 5, window: 60 }, // 5 AI calls / min
    scrape: { limit: 10, window: 60 }, // 10 scrape calls / min
    search: { limit: 60, window: 60 }, // 60 searches / min
    semantic: { limit: 10, window: 60 }, // 10 embedding calls / min
};

// ---------------------------------------------------------------------------
// Bucket resolver — maps a pathname to a rate-limit bucket (or null)
// ---------------------------------------------------------------------------

export function getApiRateLimitBucket(pathname: string): RateLimitBucket | null {
    if (pathname.startsWith('/api/auth/sign-in')) return 'auth';
    if (pathname.startsWith('/api/upload') || pathname.startsWith('/api/qrupload')) return 'upload';
    if (pathname.startsWith('/api/ai/')) return 'ai';
    if (pathname.startsWith('/api/scrape')) return 'scrape';
    if (pathname.startsWith('/api/search')) return 'search';
    return null;
}

// ---------------------------------------------------------------------------
// Atomic fixed-window counter via Redis Lua script
// ---------------------------------------------------------------------------

const INCR_WITH_TTL_LUA = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return current
`;

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetIn: number;
}

export async function checkRateLimit(
    bucket: RateLimitBucket,
    identifier: string,
): Promise<RateLimitResult> {
    const rule = RULES[bucket];

    try {
        const redis = getRealtimeRedis();
        const windowId = Math.floor(Date.now() / 1000 / rule.window);
        const key = `rl:${bucket}:${identifier}:${windowId}`;

        const current = (await redis.eval(INCR_WITH_TTL_LUA, 1, key, rule.window)) as number;

        const remaining = Math.max(0, rule.limit - current);
        const secondsIntoWindow = (Date.now() / 1000) % rule.window;
        const resetIn = Math.ceil(rule.window - secondsIntoWindow);

        return { allowed: current <= rule.limit, remaining, resetIn };
    } catch {
        // Redis down → fail open (allow the request)
        return { allowed: true, remaining: -1, resetIn: 0 };
    }
}
