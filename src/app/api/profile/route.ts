import { NextResponse, type NextRequest } from 'next/server';

import { getServerAuthSession, logMissingSession } from '@app/lib/auth';
import { logAuth } from '@app/lib/auth-logger';
import { getOrCreateProfile, upsertProfile } from '@app/lib/profile';
import { prisma } from '@shared/prisma';

const MAX_NICKNAME_LENGTH = 40;
const MAX_TEASER_LENGTH = 160;
const MAX_PHOTO_KEY_LENGTH = 2048;

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
    const session = await getServerAuthSession('api/profile');

    if (!session?.user?.id) {
        logMissingSession(session, 'api/profile');
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
        logAuth('warn', 'GET /api/profile: unauthorized');
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const profile = await getOrCreateProfile(session.userId);

    if (!profile) {
        logAuth('warn', 'GET /api/profile: profile not found', {
            userId: session.userId,
        });
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ profile });
}

export async function PUT(request: NextRequest) {
    const session = await requireSession();
    if (!session) {
        logAuth('warn', 'PUT /api/profile: unauthorized');
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();

    const nickname = sanitizeString(payload.nickname, MAX_NICKNAME_LENGTH);

    if (nickname) {
        const existing = await prisma.profile.findFirst({
            where: { nickname, userId: { not: session.userId } },
        });
        if (existing) {
            return NextResponse.json(
                { message: 'Dieser Nickname ist bereits vergeben' },
                { status: 400 },
            );
        }
    }

    const teaser = sanitizeString(payload.teaser, MAX_TEASER_LENGTH);
    const photoKey = sanitizeString(payload.photoKey, MAX_PHOTO_KEY_LENGTH);
    const ratingsPublic = sanitizeBoolean(payload.ratingsPublic);
    const followsPublic = sanitizeBoolean(payload.followsPublic);
    const favoritesPublic = sanitizeBoolean(payload.favoritesPublic);
    const cookedPublic = sanitizeBoolean(payload.cookedPublic);
    const trophiesPublic = sanitizeBoolean(payload.trophiesPublic);
    const showInActivity = sanitizeBoolean(payload.showInActivity);
    const notifyOnAnonymous = sanitizeBoolean(payload.notifyOnAnonymous);
    const notifyOnNewFollower = sanitizeBoolean(payload.notifyOnNewFollower);
    const notifyOnRecipeLike = sanitizeBoolean(payload.notifyOnRecipeLike);
    const notifyOnRecipeComment = sanitizeBoolean(payload.notifyOnRecipeComment);
    const notifyOnRecipeRating = sanitizeBoolean(payload.notifyOnRecipeRating);
    const notifyOnRecipeCooked = sanitizeBoolean(payload.notifyOnRecipeCooked);
    const notifyOnRecipePublished = sanitizeBoolean(payload.notifyOnRecipePublished);
    const notifyOnWeeklyPlanReminder = sanitizeBoolean(payload.notifyOnWeeklyPlanReminder);
    const notifyOnSystemMessages = sanitizeBoolean(payload.notifyOnSystemMessages);
    const notifyOnStreamStarted = sanitizeBoolean(payload.notifyOnStreamStarted);
    const notifyOnNewsletter = sanitizeBoolean(payload.notifyOnNewsletter);

    const profileUpdates: Parameters<typeof upsertProfile>[0]['data'] = {};

    if (nickname) {
        profileUpdates.nickname = nickname;
    }
    if (teaser) {
        profileUpdates.teaser = teaser;
    }
    if (photoKey) {
        profileUpdates.photoKey = photoKey;
    }

    if (ratingsPublic !== undefined) {
        profileUpdates.ratingsPublic = ratingsPublic;
    }

    if (followsPublic !== undefined) {
        profileUpdates.followsPublic = followsPublic;
    }

    if (favoritesPublic !== undefined) {
        profileUpdates.favoritesPublic = favoritesPublic;
    }

    if (cookedPublic !== undefined) {
        profileUpdates.cookedPublic = cookedPublic;
    }

    if (trophiesPublic !== undefined) {
        profileUpdates.trophiesPublic = trophiesPublic;
    }

    if (showInActivity !== undefined) {
        profileUpdates.showInActivity = showInActivity;
    }

    if (notifyOnAnonymous !== undefined) {
        profileUpdates.notifyOnAnonymous = notifyOnAnonymous;
    }
    if (notifyOnNewFollower !== undefined) {
        profileUpdates.notifyOnNewFollower = notifyOnNewFollower;
    }
    if (notifyOnRecipeLike !== undefined) {
        profileUpdates.notifyOnRecipeLike = notifyOnRecipeLike;
    }
    if (notifyOnRecipeComment !== undefined) {
        profileUpdates.notifyOnRecipeComment = notifyOnRecipeComment;
    }
    if (notifyOnRecipeRating !== undefined) {
        profileUpdates.notifyOnRecipeRating = notifyOnRecipeRating;
    }
    if (notifyOnRecipeCooked !== undefined) {
        profileUpdates.notifyOnRecipeCooked = notifyOnRecipeCooked;
    }
    if (notifyOnRecipePublished !== undefined) {
        profileUpdates.notifyOnRecipePublished = notifyOnRecipePublished;
    }
    if (notifyOnWeeklyPlanReminder !== undefined) {
        profileUpdates.notifyOnWeeklyPlanReminder = notifyOnWeeklyPlanReminder;
    }
    if (notifyOnSystemMessages !== undefined) {
        profileUpdates.notifyOnSystemMessages = notifyOnSystemMessages;
    }
    if (notifyOnStreamStarted !== undefined) {
        profileUpdates.notifyOnStreamStarted = notifyOnStreamStarted;
    }
    if (notifyOnNewsletter !== undefined) {
        profileUpdates.notifyOnNewsletter = notifyOnNewsletter;
    }

    // Text moderation happens inside upsertProfile() — throws on REJECTED
    try {
        const profile = await upsertProfile({
            userId: session.userId,
            data: profileUpdates,
        });

        logAuth('info', 'PUT /api/profile: profile updated', {
            userId: session.userId,
        });

        return NextResponse.json({ profile });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.startsWith('CONTENT_REJECTED:')) {
            return NextResponse.json(
                { error: message.replace('CONTENT_REJECTED:', '') },
                { status: 400 },
            );
        }
        throw error;
    }
}

export async function PATCH(request: NextRequest) {
    const session = await requireSession();
    if (!session) {
        logAuth('warn', 'PATCH /api/profile: unauthorized');
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();
    const newEmail = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : null;

    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        return NextResponse.json({ message: 'Ungültige E-Mail-Adresse' }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({
        where: { email: newEmail, id: { not: session.userId } },
        select: { id: true },
    });

    if (existing) {
        return NextResponse.json(
            { message: 'Diese E-Mail-Adresse ist bereits vergeben' },
            { status: 400 },
        );
    }

    await prisma.user.update({ where: { id: session.userId }, data: { email: newEmail } });

    logAuth('info', 'PATCH /api/profile: email updated', { userId: session.userId });

    return NextResponse.json({ success: true });
}
