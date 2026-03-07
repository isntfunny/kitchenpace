import { NextFetchEvent, NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { isTrackingEnabled, trackApiRequest } from './src/lib/tracking';

/**
 * Proxy: ban enforcement + API request tracking.
 * Runs on Node.js runtime (Next.js 16 default for proxy).
 */
export async function proxy(request: NextRequest, event: NextFetchEvent) {
    const { pathname } = request.nextUrl;

    // Skip static files, auth API, and the banned page itself
    if (
        pathname.startsWith('/banned') ||
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon')
    ) {
        return NextResponse.next();
    }

    // Ban check — reads JWT directly, no DB hit
    const token = await getToken({ req: request });
    if (token?.role === 'BANNED') {
        return NextResponse.redirect(new URL('/banned', request.url));
    }

    // Fire-and-forget API tracking
    if (isTrackingEnabled()) {
        event.waitUntil(trackApiRequest(request));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        // Match all paths except static files and images
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
