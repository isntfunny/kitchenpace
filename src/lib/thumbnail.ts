import { prisma } from '@shared/prisma';

import { extractKeyFromUrl, getThumbnailUrl, ThumbnailOptions } from './thumbnail-client';

export type ThumbnailSource =
    | { type: 'recipe'; id: string }
    | { type: 'user'; id: string }
    | { type: 'key'; key: string };

export async function getThumbnailUrlBySource(
    source: ThumbnailSource,
    options: ThumbnailOptions = {},
): Promise<string> {
    let key: string | null | undefined;

    switch (source.type) {
        case 'key':
            key = source.key;
            break;
        case 'recipe': {
            const recipe = await prisma.recipe.findUnique({
                where: { id: source.id },
                select: { imageKey: true },
            });
            key = recipe?.imageKey;
            break;
        }
        case 'user': {
            const profile = await prisma.profile.findUnique({
                where: { userId: source.id },
                select: { photoUrl: true },
            });
            key = profile?.photoUrl ? extractKeyFromUrl(profile.photoUrl) : null;
            break;
        }
    }

    return getThumbnailUrl(key, options);
}
