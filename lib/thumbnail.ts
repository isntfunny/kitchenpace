export interface ThumbnailOptions {
    width?: number;
    height?: number;
    quality?: number;
    fit?: 'cover' | 'contain' | 'fill';
}

const DEFAULT_OPTIONS: ThumbnailOptions = {
    width: 400,
    height: 300,
    quality: 80,
    fit: 'cover',
};

export function getThumbnailUrl(
    key: string | null | undefined,
    options: ThumbnailOptions = {},
): string {
    if (!key) return '/placeholder.jpg';

    const opts = { ...DEFAULT_OPTIONS, ...options };
    const params = new URLSearchParams();

    if (opts.width) params.set('width', opts.width.toString());
    if (opts.height) params.set('height', opts.height.toString());
    if (opts.quality && opts.quality !== 80) params.set('quality', opts.quality.toString());
    if (opts.fit && opts.fit !== 'cover') params.set('fit', opts.fit);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${baseUrl}/api/thumbnail?key=${encodeURIComponent(key)}&${params.toString()}`;
}

export function extractKeyFromUrl(url: string): string | null {
    if (!url) return null;

    if (url.startsWith('/')) return null;

    const bucket = process.env.S3_BUCKET || 'kitchenpace';
    const endpoint = process.env.S3_ENDPOINT || '';

    const cleanEndpoint = endpoint.replace(/^https?:\/\//, '');
    const pattern = `${cleanEndpoint}/${bucket}/(.+)`;
    const match = url.match(new RegExp(pattern));

    if (match) return match[1];

    if (url.includes(`/${bucket}/`)) {
        const parts = url.split(`/${bucket}/`);
        return parts[1] || null;
    }

    return null;
}
