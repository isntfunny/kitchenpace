import { prisma } from '@shared/prisma';

import { getThumbnailUrl } from './thumbnail-client';
import type { AspectRatio } from './thumbnail-client';

export type ThumbnailSource =
    | { type: 'recipe'; id: string }
    | { type: 'user'; id: string }
    | { type: 'key'; key: string };

export async function getThumbnailUrlBySource(
    source: ThumbnailSource,
    aspect: AspectRatio = 'original',
    width?: number,
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
                select: { photoKey: true },
            });
            key = profile?.photoKey ?? null;
            break;
        }
    }

    return getThumbnailUrl(key, aspect, width);
}
