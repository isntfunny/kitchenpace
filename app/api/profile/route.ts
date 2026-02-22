import { NextResponse, type NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getOrCreateProfile, upsertProfile } from '@/lib/profile';

const MAX_NICKNAME_LENGTH = 32;
const MAX_TEASER_LENGTH = 160;
const MAX_PHOTO_URL_LENGTH = 2048;

const sanitizeString = (value: unknown, maxLength: number): string | null => {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    return trimmed.slice(0, maxLength);
};

const sanitizeBoolean = (value: unknown): boolean | undefined => {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        if (value.toLowerCase() === 'true') {
            return true;
        }

        if (value.toLowerCase() === 'false') {
            return false;
        }
    }

    return undefined;
};

const requireSession = async () => {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return null;
    }

    return {
        userId: session.user.id,
        email: session.user.email ?? '',
    };
};

export async function GET() {
    const session = await requireSession();
    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const profile = await getOrCreateProfile(session.userId, session.email);

    if (!profile) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ profile });
}

export async function PUT(request: NextRequest) {
    const session = await requireSession();
    if (!session) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();

    const nickname = sanitizeString(payload.nickname, MAX_NICKNAME_LENGTH);
    const teaser = sanitizeString(payload.teaser, MAX_TEASER_LENGTH);
    const photoUrl = sanitizeString(payload.photoUrl, MAX_PHOTO_URL_LENGTH);
    const ratingsPublic = sanitizeBoolean(payload.ratingsPublic);
    const followsPublic = sanitizeBoolean(payload.followsPublic);
    const favoritesPublic = sanitizeBoolean(payload.favoritesPublic);
    const showInActivity = sanitizeBoolean(payload.showInActivity);

    const profileUpdates: Parameters<typeof upsertProfile>[0]['data'] = {
        nickname,
        teaser,
        photoUrl,
    };

    if (ratingsPublic !== undefined) {
        profileUpdates.ratingsPublic = ratingsPublic;
    }

    if (followsPublic !== undefined) {
        profileUpdates.followsPublic = followsPublic;
    }

    if (favoritesPublic !== undefined) {
        profileUpdates.favoritesPublic = favoritesPublic;
    }

    if (showInActivity !== undefined) {
        profileUpdates.showInActivity = showInActivity;
    }

    const profile = await upsertProfile({
        userId: session.userId,
        email: session.email,
        data: profileUpdates,
    });

    return NextResponse.json({ profile });
}
