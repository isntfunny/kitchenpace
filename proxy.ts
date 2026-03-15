import { type NextRequest, NextResponse } from 'next/server';

import { auth } from './src/lib/auth-server';
import { isTrackingEnabled, trackApiRequest } from './src/lib/tracking';

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (
        pathname.startsWith('/banned') ||
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon')
    ) {
        return NextResponse.next();
    }

    if (isTrackingEnabled()) {
        void trackApiRequest(request);
    }

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
