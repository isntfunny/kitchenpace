import sharp from 'sharp';

import type { AspectRatio } from './keys';
import { BREAKPOINTS, heightForAspect, thumbKey, ogThumbKey } from './keys';
import { exists, getBuffer, putObject } from './operations';

// ---------------------------------------------------------------------------
// Generate full responsive set for a key + aspect ratio
// ---------------------------------------------------------------------------

export interface VariantResult {
    width: number;
    key: string;
}

/**
 * Generate all breakpoint variants for an image at a given aspect ratio.
 * Skips widths larger than the source image.
 * Returns the list of generated variant keys.
 */
export async function generateResponsiveSet(
    originalKey: string,
    aspect: AspectRatio,
): Promise<VariantResult[]> {
    const buffer = await getBuffer(originalKey);
    const meta = await sharp(buffer).metadata();
    const srcWidth = meta.width ?? 1920;

    const results: VariantResult[] = [];

    for (const bp of BREAKPOINTS) {
        if (bp > srcWidth) continue;

        const tKey = thumbKey(originalKey, aspect, bp);

        // Skip if already cached
        if (await exists(tKey)) {
            results.push({ width: bp, key: tKey });
            continue;
        }

        const height = heightForAspect(bp, aspect);

        let resized: Buffer;
        if (height === null) {
            // 'original' aspect — resize width only, preserve ratio
            resized = await sharp(buffer)
                .resize(bp, undefined, { withoutEnlargement: true })
                .webp({ quality: 80 })
                .toBuffer();
        } else {
            resized = await sharp(buffer)
                .resize(bp, height, { fit: 'cover', position: 'attention' })
                .webp({ quality: 80 })
                .toBuffer();
        }

        await putObject(tKey, resized, 'image/webp', 'public, max-age=604800');
        results.push({ width: bp, key: tKey });
    }

    return results;
}

// ---------------------------------------------------------------------------
// Generate OG image (1200x630, JPEG)
// ---------------------------------------------------------------------------

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

/**
 * Generate an OpenGraph image (1200x630 JPEG) from an original.
 * Uses sharp attention-based smart cropping.
 * Returns the S3 key of the generated OG image.
 */
export async function generateOgImage(originalKey: string): Promise<string> {
    const tKey = ogThumbKey(originalKey);

    // Skip if already exists
    if (await exists(tKey)) return tKey;

    const buffer = await getBuffer(originalKey);
    const ogBuffer = await sharp(buffer)
        .resize(OG_WIDTH, OG_HEIGHT, { fit: 'cover', position: 'attention' })
        .jpeg({ quality: 85 })
        .toBuffer();

    await putObject(tKey, ogBuffer, 'image/jpeg', 'public, max-age=604800');
    return tKey;
}
