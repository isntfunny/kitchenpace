import type { Profile } from '@prisma/client';

import { prisma } from './prisma';

type ProfileFields = Partial<Pick<Profile, 'nickname' | 'teaser' | 'photoUrl'>> & {
    ratingsPublic?: boolean;
    followsPublic?: boolean;
    favoritesPublic?: boolean;
    showInActivity?: boolean;
};

export const getOrCreateProfile = async (userId: string, email: string) => {
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
