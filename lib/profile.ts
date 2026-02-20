import type { Profile } from '@prisma/client';

import { prisma } from './prisma';

type ProfileFields = Pick<Profile, 'nickname' | 'teaser' | 'photoUrl'>;

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
    return prisma.profile.upsert({
        where: { userId: params.userId },
        create: {
            userId: params.userId,
            email: params.email,
            nickname: params.data.nickname,
            teaser: params.data.teaser,
            photoUrl: params.data.photoUrl,
        },
        update: {
            nickname: params.data.nickname,
            teaser: params.data.teaser,
            photoUrl: params.data.photoUrl,
            email: params.email,
        },
    });
};
