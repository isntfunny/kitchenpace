import { prisma } from '@/lib/prisma';
import { getThumbnailUrl, extractKeyFromUrl } from './thumbnail-client';

export type ThumbnailSource =
    | { type: 'recipe'; id: string }
    | { type: 'user'; id: string }
    | { type: 'key'; key: string };

export async function getThumbnailUrlBySource(
    source: ThumbnailSource,
    options: {
        width?: number;
        height?: number;
        quality?: number;
        fit?: 'cover' | 'contain' | 'fill';
    } = {},
): Promise<string> {
    const { getThumbnailUrl } = await import('@/lib/thumbnail-client');
    let key: string | null | undefined;

    if (source.type === 'key') {
        key = source.key;
    } else if (source.type === 'recipe') {
        const recipe = await prisma.recipe.findUnique({
            where: { id: source.id },
            select: { imageKey: true },
        });
        key = recipe?.imageKey;
    } else if (source.type === 'user') {
        const profile = await prisma.profile.findUnique({
            where: { userId: source.id },
            select: { photoUrl: true },
        });
        key = profile?.photoUrl ? extractKeyFromUrl(profile.photoUrl) : null;
    }

    return getThumbnailUrl(key, options);
}
