import { createHash } from 'crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UploadType = 'profile' | 'recipe' | 'comment' | 'cook' | 'step';

export type AspectRatio =
    | '16:9'
    | '4:3'
    | '3:2'
    | '1:1'
    | '4:1'
    | '3:1'
    | '3:4'
    | '2:1'
    | 'original';

export const BREAKPOINTS = [320, 640, 960, 1280, 1920] as const;

// ---------------------------------------------------------------------------
// Key generation
// ---------------------------------------------------------------------------

function randomSuffix(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

function extensionOf(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || 'jpg';
}

/** Key for fresh uploads awaiting moderation: `uploads/{type}/{ts}-{rand}.{ext}` */
export function generateUploadKey(type: UploadType, filename: string): string {
    return `uploads/${type}/${randomSuffix()}.${extensionOf(filename)}`;
}

/** Key for approved originals: `approved/{type}/{entityId}/original.{ext}` */
export function approvedKey(type: UploadType, entityId: string, ext: string): string {
    return `approved/${type}/${entityId}/original.${ext.replace(/^\./, '')}`;
}

/** Key for trashed (rejected) originals: `trash/{type}/{ts}-{rand}.{ext}` */
export function trashKeyFrom(uploadKey: string): string {
    // Replace leading 'uploads/' with 'trash/'
    return uploadKey.replace(/^uploads\//, 'trash/');
}

// ---------------------------------------------------------------------------
// Thumb / cache keys
// ---------------------------------------------------------------------------

/** Deterministic 12-char hex hash of an S3 key */
function keyHash(s3Key: string): string {
    return createHash('sha256').update(s3Key).digest('hex').slice(0, 12);
}

/** Aspect ratio string safe for S3 paths (e.g. '16:9' → '16-9') */
function aspectSlug(aspect: AspectRatio): string {
    return aspect.replace(':', '-');
}

/** Cache key for a responsive variant: `thumbs/{hash}/{aspect}/{width}.webp` */
export function thumbKey(originalKey: string, aspect: AspectRatio, width: number): string {
    return `thumbs/${keyHash(originalKey)}/${aspectSlug(aspect)}/${width}.webp`;
}

/** Cache key for an OG image: `thumbs/{hash}/og/1200.jpg` */
export function ogThumbKey(originalKey: string): string {
    return `thumbs/${keyHash(originalKey)}/og/1200.jpg`;
}

/** Cache key for category OG images: `thumbs/og-category/{slug}.png` */
export function categoryOgKey(slug: string): string {
    return `thumbs/og-category/${slug}.png`;
}

// ---------------------------------------------------------------------------
// Key parsing & resolution
// ---------------------------------------------------------------------------

export type KeyPrefix = 'uploads' | 'approved' | 'trash' | 'thumbs' | 'legacy';

export function parsePrefix(key: string): KeyPrefix {
    if (key.startsWith('uploads/')) return 'uploads';
    if (key.startsWith('approved/')) return 'approved';
    if (key.startsWith('trash/')) return 'trash';
    if (key.startsWith('thumbs/')) return 'thumbs';
    return 'legacy'; // old keys like recipes/, steps/, profiles/
}

// ---------------------------------------------------------------------------
// Aspect ratio math
// ---------------------------------------------------------------------------

const ASPECT_RATIOS: Record<Exclude<AspectRatio, 'original'>, [number, number]> = {
    '16:9': [16, 9],
    '4:3': [4, 3],
    '3:2': [3, 2],
    '1:1': [1, 1],
    '4:1': [4, 1],
    '3:1': [3, 1],
    '3:4': [3, 4],
    '2:1': [2, 1],
};

/** Calculate height for a given width and aspect ratio. Returns null for 'original'. */
export function heightForAspect(width: number, aspect: AspectRatio): number | null {
    if (aspect === 'original') return null;
    const [w, h] = ASPECT_RATIOS[aspect];
    return Math.round((width * h) / w);
}

/** Snap a requested width to the nearest breakpoint */
export function snapToBreakpoint(w: number): number {
    let closest: number = BREAKPOINTS[0];
    let minDiff = Math.abs(w - closest);
    for (const bp of BREAKPOINTS) {
        const diff = Math.abs(w - bp);
        if (diff < minDiff) {
            minDiff = diff;
            closest = bp;
        }
    }
    return closest;
}
