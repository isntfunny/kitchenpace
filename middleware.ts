import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Middleware: redirect banned users to /banned
 * Reads the JWT token directly (no DB hit) — ban takes effect after session is invalidated
 */
export async function middleware(request: NextRequest) {
    // Skip static files, API routes, and the banned page itself
    const { pathname } = request.nextUrl;
    if (
        pathname.startsWith('/banned') ||
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon')
    ) {
        return NextResponse.next();
    }

    const token = await getToken({ req: request });

    if (token?.role === 'BANNED') {
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
