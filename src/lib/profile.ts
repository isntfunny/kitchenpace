import type { Profile } from '@prisma/client';

import { moderateContent } from '@app/lib/moderation/moderationService';
import { generateUniqueSlug } from '@app/lib/slug';
import { prisma } from '@shared/prisma';

type ProfileFields = Partial<Pick<Profile, 'nickname' | 'teaser' | 'photoUrl'>> & {
    ratingsPublic?: boolean;
    followsPublic?: boolean;
    favoritesPublic?: boolean;
    showInActivity?: boolean;
    notifyOnAnonymous?: boolean;
    notifyOnNewFollower?: boolean;
    notifyOnRecipeLike?: boolean;
    notifyOnRecipeComment?: boolean;
    notifyOnRecipeRating?: boolean;
    notifyOnRecipeCooked?: boolean;
    notifyOnRecipePublished?: boolean;
    notifyOnWeeklyPlanReminder?: boolean;
    notifyOnSystemMessages?: boolean;
    notifyOnNewsletter?: boolean;
};

export const getOrCreateProfile = async (userId: string, email: string) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        return null;
    }

    const nickname = user.name ?? `user_${userId.slice(0, 8)}`;
    const slug = await generateUniqueSlug(
        nickname,
        async (s) => !!(await prisma.profile.findUnique({ where: { slug: s } })),
    );

    return prisma.profile.upsert({
        where: { userId },
        create: {
            userId,
            email,
            nickname,
            slug,
        },
        update: {},
    });
};

export const upsertProfile = async (params: {
    userId: string;
    email: string;
    data: ProfileFields;
}) => {
    const definedData = Object.fromEntries(
        Object.entries(params.data).filter(([, value]) => value !== undefined),
    ) as ProfileFields;

    // Content moderation on text fields
    const textParts = [definedData.nickname, definedData.teaser].filter(Boolean);
    if (textParts.length > 0) {
        const modResult = await moderateContent({ text: textParts.join('\n') });
        if (modResult.decision === 'REJECTED') {
            throw new Error('CONTENT_REJECTED:Dein Profil enthält unzulässige Inhalte — bitte überprüfe deinen Text.');
        }
    }

    let nickname = definedData.nickname;
    if (!nickname) {
        const user = await prisma.user.findUnique({ where: { id: params.userId } });
        nickname = user?.name ?? `user_${params.userId.slice(0, 8)}`;
    }

    const slug = await generateUniqueSlug(
        nickname,
        async (s) => !!(await prisma.profile.findUnique({ where: { slug: s } })),
    );

    return prisma.profile.upsert({
        where: { userId: params.userId },
        create: {
            userId: params.userId,
            email: params.email,
            nickname,
            slug,
            teaser: definedData.teaser,
            photoUrl: definedData.photoUrl,
            ratingsPublic: definedData.ratingsPublic,
            followsPublic: definedData.followsPublic,
            favoritesPublic: definedData.favoritesPublic,
            showInActivity: definedData.showInActivity,
            notifyOnAnonymous: definedData.notifyOnAnonymous,
            notifyOnNewFollower: definedData.notifyOnNewFollower,
            notifyOnRecipeLike: definedData.notifyOnRecipeLike,
            notifyOnRecipeComment: definedData.notifyOnRecipeComment,
            notifyOnRecipeRating: definedData.notifyOnRecipeRating,
            notifyOnRecipeCooked: definedData.notifyOnRecipeCooked,
            notifyOnRecipePublished: definedData.notifyOnRecipePublished,
            notifyOnWeeklyPlanReminder: definedData.notifyOnWeeklyPlanReminder,
            notifyOnSystemMessages: definedData.notifyOnSystemMessages,
        },
        update: {
            email: params.email,
            nickname,
            ...(definedData.nickname ? { slug } : {}),
            teaser: definedData.teaser,
            photoUrl: definedData.photoUrl,
            ratingsPublic: definedData.ratingsPublic,
            followsPublic: definedData.followsPublic,
            favoritesPublic: definedData.favoritesPublic,
            showInActivity: definedData.showInActivity,
            notifyOnAnonymous: definedData.notifyOnAnonymous,
            notifyOnNewFollower: definedData.notifyOnNewFollower,
            notifyOnRecipeLike: definedData.notifyOnRecipeLike,
            notifyOnRecipeComment: definedData.notifyOnRecipeComment,
            notifyOnRecipeRating: definedData.notifyOnRecipeRating,
            notifyOnRecipeCooked: definedData.notifyOnRecipeCooked,
            notifyOnRecipePublished: definedData.notifyOnRecipePublished,
            notifyOnWeeklyPlanReminder: definedData.notifyOnWeeklyPlanReminder,
            notifyOnSystemMessages: definedData.notifyOnSystemMessages,
        },
    });
};
