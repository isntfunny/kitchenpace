import { type NextRequest, NextResponse } from 'next/server';

import { auth } from './src/lib/auth-server';
import { checkRateLimit, getApiRateLimitBucket } from './src/lib/rate-limit';
import { isTrackingEnabled, trackApiRequest } from './src/lib/tracking';

function getClientIp(request: NextRequest): string {
    return (
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        'unknown'
    );
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 1. Skip paths that never need interception
    if (
        pathname.startsWith('/banned') ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon')
    ) {
        return NextResponse.next();
    }

    // 2. Rate-limit API endpoints (runs before session check to save resources)
    if (pathname.startsWith('/api/')) {
        const bucket = getApiRateLimitBucket(pathname);
        if (bucket) {
            const ip = getClientIp(request);
            const { allowed, remaining, resetIn } = await checkRateLimit(bucket, ip);
            if (!allowed) {
                return NextResponse.json(
                    { error: 'Too many requests' },
                    {
                        status: 429,
                        headers: {
                            'Retry-After': String(resetIn),
                            'X-RateLimit-Remaining': String(remaining),
                        },
                    },
                );
            }
        }
    }

    // 3. Let auth routes through (after rate limiting)
    if (pathname.startsWith('/api/auth')) {
        return NextResponse.next();
    }

    // 4. Tracking
    if (isTrackingEnabled()) {
        void trackApiRequest(request);
    }

    // 5. Ban check
    const session = await auth.api.getSession({
        headers: request.headers,
    });

    if (session?.user?.banned === true) {
        return NextResponse.redirect(new URL('/banned', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        // Match all paths except static files and images
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
