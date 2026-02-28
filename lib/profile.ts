import type { Profile } from '@prisma/client';

import { prisma } from './prisma';

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
};

export const getOrCreateProfile = async (userId: string, email: string) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        return null;
    }

    return prisma.profile.upsert({
        where: { userId },
        create: {
            userId,
            email,
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

    return prisma.profile.upsert({
        where: { userId: params.userId },
        create: {
            userId: params.userId,
            email: params.email,
            ...definedData,
        },
        update: {
            email: params.email,
            ...definedData,
        },
    });
};
