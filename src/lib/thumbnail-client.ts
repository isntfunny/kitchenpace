import type { AspectRatio } from './s3/keys';

const BREAKPOINTS = [320, 640, 960, 1280, 1920];

// ---------------------------------------------------------------------------
// URL builders
// ---------------------------------------------------------------------------

/** Build a thumbnail URL for a given key, aspect ratio, and width */
export function getThumbnailUrl(
    key: string | null | undefined,
    aspect: AspectRatio = 'original',
    width?: number,
): string {
    if (!key) return '/placeholder.jpg';
    const params = new URLSearchParams({ key, aspect });
    if (width) params.set('w', width.toString());
    return `/api/thumbnail?${params.toString()}`;
}

/** Build a thumbnail URL for a recipe or user by ID */
export function getThumbnailUrlById(
    id: string,
    type: 'recipe' | 'user',
    aspect: AspectRatio = 'original',
    width?: number,
): string {
    const params = new URLSearchParams({ type, id, aspect });
    if (width) params.set('w', width.toString());
    return `/api/thumbnail?${params.toString()}`;
}

/** Generate a full srcset string for all breakpoints */
export function getSrcSet(key: string, aspect: AspectRatio = 'original'): string {
    return BREAKPOINTS.map((w) => `${getThumbnailUrl(key, aspect, w)} ${w}w`).join(', ');
}

/** Generate a full srcset string by ID (recipe/user) */
export function getSrcSetById(
    id: string,
    type: 'recipe' | 'user',
    aspect: AspectRatio = 'original',
): string {
    return BREAKPOINTS.map((w) => `${getThumbnailUrlById(id, type, aspect, w)} ${w}w`).join(', ');
}

// ---------------------------------------------------------------------------
// Key extraction (backward compat)
// ---------------------------------------------------------------------------

export function extractKeyFromUrl(url: string): string | null {
    if (!url) return null;

    // New format: /api/thumbnail?key=approved/...&aspect=...
    if (url.startsWith('/api/thumbnail')) {
        try {
            const params = new URLSearchParams(url.split('?')[1] ?? '');
            return params.get('key') || null;
        } catch {
            return null;
        }
    }

    if (url.startsWith('/')) return null;

    // Legacy: https://.../{bucket}/key
    const bucket = process.env.S3_BUCKET || 'kitchenpace';
    if (url.includes(`/${bucket}/`)) {
        const parts = url.split(`/${bucket}/`);
        return parts[1] || null;
    }

    return null;
}

// Re-export AspectRatio for convenience
export type { AspectRatio };
