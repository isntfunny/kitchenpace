import { NextResponse } from 'next/server';

import { fetchActivityFeed } from '@app/lib/activity-feed';
import { getServerAuthSession } from '@app/lib/auth';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') === 'user' ? 'user' : 'global';
    const limit = Number.parseInt(searchParams.get('limit') || (scope === 'user' ? '20' : '6'), 10);

    if (scope === 'user') {
        const session = await getServerAuthSession('api/activity');
        if (!session?.user?.id) {
            return NextResponse.json({ activities: [] }, { status: 401 });
        }

        const activities = await fetchActivityFeed({ type: 'user', userId: session.user.id }, limit);
        return NextResponse.json({ activities });
    }

    const activities = await fetchActivityFeed('global', limit);
    return NextResponse.json({ activities });
}
