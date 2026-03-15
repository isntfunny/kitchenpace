/**
 * Downloads an external image URL and uploads it to S3.
 * Used by both the import page and the AI dialog to persist recipe images.
 */

import { upload, generateUploadKey } from '@app/lib/s3';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const FETCH_TIMEOUT_MS = 15_000;

export interface UploadFromUrlResult {
    success: true;
    key: string;
}

export interface UploadFromUrlError {
    success: false;
    error: string;
}

/**
 * Fetches an image from an external URL and uploads it to S3.
 * Returns the S3 key on success, or an error message on failure.
 * Does NOT run moderation — the existing recipe save flow handles that.
 */
export async function uploadImageFromUrl(
    imageUrl: string,
): Promise<UploadFromUrlResult | UploadFromUrlError> {
    if (!imageUrl || !imageUrl.startsWith('http')) {
        return { success: false, error: 'Invalid image URL' };
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        const response = await fetch(imageUrl, {
            signal: controller.signal,
            headers: {
                // Some CDNs require a browser-like User-Agent
                'User-Agent': 'Mozilla/5.0 (compatible; KitchenPace/1.0; +https://kitchenpace.com)',
            },
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            return { success: false, error: `HTTP ${response.status} fetching image` };
        }

        // Determine content type
        const contentType = response.headers.get('content-type')?.split(';')[0]?.trim() ?? '';
        if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
            // Try to infer from URL extension
            const ext = imageUrl.split('.').pop()?.toLowerCase()?.split('?')[0] ?? '';
            const extMap: Record<string, string> = {
                jpg: 'image/jpeg',
                jpeg: 'image/jpeg',
                png: 'image/png',
                gif: 'image/gif',
                webp: 'image/webp',
            };
            if (!extMap[ext]) {
                return { success: false, error: `Unsupported image type: ${contentType}` };
            }
        }

        const buffer = Buffer.from(await response.arrayBuffer());

        if (buffer.length > MAX_IMAGE_SIZE) {
            return { success: false, error: 'Image too large (max 5MB)' };
        }

        if (buffer.length < 1000) {
            return { success: false, error: 'Image too small (likely a placeholder)' };
        }

        // Determine extension from content type or URL
        const finalContentType = ALLOWED_CONTENT_TYPES.includes(contentType)
            ? contentType
            : 'image/jpeg';
        const extMap: Record<string, string> = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/gif': 'gif',
            'image/webp': 'webp',
        };
        const ext = extMap[finalContentType] ?? 'jpg';

        const key = generateUploadKey('recipe', `imported.${ext}`);
        await upload(key, buffer, finalContentType);

        return { success: true, key };
    } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
            return { success: false, error: 'Image download timed out' };
        }
        console.error('[uploadImageFromUrl] Failed:', err);
        return {
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error downloading image',
        };
    }
}
