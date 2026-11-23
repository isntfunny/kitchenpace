/**
 * Tiny blurred preview of a recipe image (KUC-146).
 *
 * Stored on the recipe as a WebP data URL (~150–300 bytes) and rendered inline
 * by SmartImage, so a card shows the image's colours at once and fades over to
 * the real image when it has loaded. The image itself is still only served by
 * recipe ID through /api/thumbnail.
 */

import sharp from 'sharp';

import { getBuffer, parsePrefix } from '@app/lib/s3';
import { prisma } from '@shared/prisma';
import { addSyncRecipeJob } from '@worker/queues';

/** Longest side of the stored preview; the browser blurs it further. */
export const PLACEHOLDER_SIZE = 16;

export interface ImagePlaceholder {
    dataUrl: string;
    width: number;
    height: number;
}

/** Build the preview from the original image bytes. */
export async function buildImagePlaceholder(original: Buffer): Promise<ImagePlaceholder> {
    // rotate() applies the EXIF orientation, so width/height match what browsers show.
    const meta = await sharp(original).metadata();
    const data = await sharp(original)
        .rotate()
        .resize(PLACEHOLDER_SIZE, PLACEHOLDER_SIZE, { fit: 'inside' })
        .webp({ quality: 50, alphaQuality: 50 })
        .toBuffer();

    // EXIF orientations 5–8 swap width and height.
    const swapped = (meta.orientation ?? 1) >= 5;
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;

    return {
        dataUrl: `data:image/webp;base64,${data.toString('base64')}`,
        width: swapped ? height : width,
        height: swapped ? width : height,
    };
}

export type PlaceholderResult = 'created' | 'no-image' | 'not-public' | 'changed';

/**
 * Compute and store the preview for one recipe. Only public (approved) images
 * get one, so no preview of an image awaiting moderation is published. The write
 * is guarded by the image key it was made from: if the image changed meanwhile,
 * nothing is written (a DB trigger also clears the preview on every key change).
 */
export async function updateRecipeImagePlaceholder(recipeId: string): Promise<PlaceholderResult> {
    const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId },
        select: { imageKey: true, updatedAt: true },
    });
    const imageKey = recipe?.imageKey;
    if (!imageKey) return 'no-image';

    const prefix = parsePrefix(imageKey);
    if (prefix !== 'approved' && prefix !== 'legacy') return 'not-public';

    const placeholder = await buildImagePlaceholder(await getBuffer(imageKey));
    const { count } = await prisma.recipe.updateMany({
        where: { id: recipeId, imageKey },
        data: {
            imagePlaceholder: placeholder.dataUrl,
            imageWidth: placeholder.width,
            imageHeight: placeholder.height,
            // Not a content change: keep updatedAt, it is the sitemap's lastmod.
            updatedAt: recipe.updatedAt,
        },
    });
    if (count === 0) return 'changed';

    // The search index syncs by updatedAt, which stays unchanged, so push this recipe.
    await addSyncRecipeJob(recipeId).catch((error) =>
        console.error('[image-placeholder] sync-recipe job failed', error),
    );
    return 'created';
}
