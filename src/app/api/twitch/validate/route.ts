import { NextRequest, NextResponse } from 'next/server';

import { getServerAuthSession, logMissingSession } from '@app/lib/auth';
import { getTwitchUser } from '@app/lib/twitch/api';

/**
 * GET /api/twitch/validate?username=...
 *
 * Validates a Twitch username and returns display info for the UI.
 * Requires authentication.
 */
export async function GET(request: NextRequest) {
    const session = await getServerAuthSession('api/twitch/validate');

    if (!session?.user?.id) {
        logMissingSession(session, 'api/twitch/validate');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const username = request.nextUrl.searchParams.get('username')?.trim();

    if (!username || username.length < 2) {
        return NextResponse.json({ valid: false });
    }

    try {
        const user = await getTwitchUser(username);

        if (!user) {
            return NextResponse.json({ valid: false });
        }

        return NextResponse.json({
            valid: true,
            displayName: user.displayName,
            profileImageUrl: user.profileImageUrl,
        });
    } catch (error) {
        console.error('[Twitch Validate] Failed to look up user', {
            username,
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ error: 'Failed to validate Twitch user' }, { status: 500 });
    }
}
