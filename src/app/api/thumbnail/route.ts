import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

import { getFileBuffer, BUCKET, s3Client } from '@app/lib/s3';
import { extractKeyFromUrl } from '@app/lib/thumbnail-client';
import { createLogger } from '@shared/logger';
import { prisma } from '@shared/prisma';

const log = createLogger('thumbnail');

type FitOption = 'cover' | 'contain' | 'fill';
const VALID_FITS: FitOption[] = ['cover', 'contain', 'fill'];
const MAX_DIMENSION = 2000;

interface ThumbnailParams {
    width: number;
    height: number;
    quality: number;
    fit: FitOption;
}

// ---------------------------------------------------------------------------
// Tier 1: In-memory LRU cache
// ---------------------------------------------------------------------------

const MAX_MEMORY_BYTES = 50 * 1024 * 1024; // 50 MB
const MAX_MEMORY_ENTRIES = 200;

interface MemoryCacheEntry {
    buffer: Buffer;
    contentType: string;
}

const memoryCache = new Map<string, MemoryCacheEntry>();
let memoryCacheBytes = 0;

function evictMemoryCache(neededBytes: number): void {
    for (const [key, entry] of memoryCache) {
        if (memoryCacheBytes + neededBytes <= MAX_MEMORY_BYTES && memoryCache.size < MAX_MEMORY_ENTRIES) {
            break;
        }
        memoryCacheBytes -= entry.buffer.length;
        memoryCache.delete(key);
    }
}

function getFromMemory(cacheKey: string): MemoryCacheEntry | null {
    const entry = memoryCache.get(cacheKey);
    if (!entry) return null;

    // Move to end (most recently used)
    memoryCache.delete(cacheKey);
    memoryCache.set(cacheKey, entry);
    return entry;
}

function setInMemory(cacheKey: string, buffer: Buffer, contentType: string): void {
    // Don't cache entries larger than 5 MB individually
    if (buffer.length > 5 * 1024 * 1024) return;

    // Remove existing entry first if present
    const existing = memoryCache.get(cacheKey);
    if (existing) {
        memoryCacheBytes -= existing.buffer.length;
        memoryCache.delete(cacheKey);
    }

    evictMemoryCache(buffer.length);

    memoryCache.set(cacheKey, { buffer, contentType });
    memoryCacheBytes += buffer.length;
}

// ---------------------------------------------------------------------------
// Tier 2: S3 cache
// ---------------------------------------------------------------------------

async function getFromS3Cache(cacheKey: string): Promise<Buffer | null> {
    try {
        const response = await s3Client.send(
            new GetObjectCommand({ Bucket: BUCKET, Key: cacheKey }),
        );
        if (!response.Body) return null;

        const chunks: Uint8Array[] = [];
        for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks);
    } catch {
        return null;
    }
}

async function saveToS3Cache(cacheKey: string, buffer: Buffer, contentType: string): Promise<void> {
    try {
        await s3Client.send(
            new PutObjectCommand({
                Bucket: BUCKET,
                Key: cacheKey,
                Body: buffer,
                ContentType: contentType,
                CacheControl: 'public, max-age=604800',
            }),
        );
    } catch (error) {
        log.warn('Failed to persist thumbnail to S3 cache', {
            cacheKey,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// ---------------------------------------------------------------------------
// Tier 3: Generate with sharp
// ---------------------------------------------------------------------------

async function generateThumbnail(
    originalKey: string,
    params: ThumbnailParams,
): Promise<Buffer> {
    const imageBuffer = await getFileBuffer(originalKey);
    const meta = await sharp(imageBuffer).metadata();
    const srcW = meta.width ?? params.width;
    const srcH = meta.height ?? params.height;

    // Clamp to source dimensions, preserving the requested aspect ratio
    const scale = Math.min(srcW / params.width, srcH / params.height, 1);
    const width = Math.round(params.width * scale);
    const height = Math.round(params.height * scale);

    return sharp(imageBuffer)
        .resize(width, height, {
            fit: params.fit,
            position: 'attention',
        })
        .webp({ quality: params.quality })
        .toBuffer();
}

// ---------------------------------------------------------------------------
// Cache key + helpers
// ---------------------------------------------------------------------------

function buildCacheKey(originalKey: string, params: ThumbnailParams): string {
    // Use full path (slashes → dashes) to avoid collisions across folders
    const safePath = originalKey.replace(/\.[^.]+$/, '').replace(/\//g, '-');
    return `cache/${safePath}-${params.width}x${params.height}-q${params.quality}-${params.fit}.webp`;
}

const CONTENT_TYPES: Record<string, string> = {
    webp: 'image/webp',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
};

function contentTypeFor(ext: string): string {
    return CONTENT_TYPES[ext] || 'image/webp';
}

// ---------------------------------------------------------------------------
// Parameter parsing
// ---------------------------------------------------------------------------

function parsePositiveInt(value: string | null, max = MAX_DIMENSION): number | undefined | null {
    if (value === null) return undefined;
    const n = Number.parseInt(value, 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.min(n, max);
}

function parseQuality(value: string | null): number | undefined | null {
    if (value === null) return undefined;
    const n = Number.parseInt(value, 10);
    if (!Number.isFinite(n)) return null;
    return Math.max(1, Math.min(100, n));
}

function parseFit(value: string | null): FitOption {
    return value && VALID_FITS.includes(value as FitOption) ? (value as FitOption) : 'cover';
}

// ---------------------------------------------------------------------------
// Key resolution (type + id → S3 key)
// ---------------------------------------------------------------------------

async function resolveImageKey(type: string | null, id: string | null): Promise<string | null> {
    if (!type || !id) return null;

    if (type === 'recipe') {
        const recipe = await prisma.recipe.findUnique({
            where: { id },
            select: { imageKey: true },
        });
        return recipe?.imageKey ?? null;
    }

    if (type === 'user') {
        const profile = await prisma.profile.findUnique({
            where: { userId: id },
            select: { photoUrl: true },
        });
        if (!profile?.photoUrl) return null;
        return extractKeyFromUrl(profile.photoUrl);
    }

    return null;
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

function imageResponse(buffer: Buffer, contentType: string, cacheHit: 'MEMORY' | 'S3' | 'MISS') {
    return new NextResponse(new Uint8Array(buffer), {
        headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400',
            'X-Cache': cacheHit,
        },
    });
}

function errorResponse(message: string, status: number) {
    return NextResponse.json({ error: message }, { status });
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);

    // Parse & validate params
    const width = parsePositiveInt(searchParams.get('width'));
    const height = parsePositiveInt(searchParams.get('height'));
    if (width === null) return errorResponse('width must be a positive integer', 400);
    if (height === null) return errorResponse('height must be a positive integer', 400);

    const quality = parseQuality(searchParams.get('quality'));
    if (quality === null) return errorResponse('quality must be a number between 1 and 100', 400);

    const fit = parseFit(searchParams.get('fit'));
    const shouldResize = width !== undefined && height !== undefined;

    // Resolve the S3 key
    const resolvedKey =
        searchParams.get('key') ??
        (await resolveImageKey(searchParams.get('type'), searchParams.get('id')));

    if (!resolvedKey) {
        return errorResponse('Missing key or invalid type/id', 400);
    }

    try {
        // No resize requested — pass through original (still use memory cache)
        if (!shouldResize) {
            const passthroughKey = `passthrough/${resolvedKey}`;
            const memHit = getFromMemory(passthroughKey);
            if (memHit) {
                return imageResponse(memHit.buffer, memHit.contentType, 'MEMORY');
            }

            const buffer = await getFileBuffer(resolvedKey);
            const ext = resolvedKey.split('.').pop()?.toLowerCase() || 'jpg';
            const ct = contentTypeFor(ext);
            setInMemory(passthroughKey, buffer, ct);
            return imageResponse(buffer, ct, 'MISS');
        }

        const params: ThumbnailParams = {
            width: width!,
            height: height!,
            quality: quality ?? 80,
            fit,
        };
        const cacheKey = buildCacheKey(resolvedKey, params);
        const webpType = contentTypeFor('webp');

        // Tier 1: Memory
        const memHit = getFromMemory(cacheKey);
        if (memHit) {
            return imageResponse(memHit.buffer, memHit.contentType, 'MEMORY');
        }

        // Tier 2: S3
        const s3Hit = await getFromS3Cache(cacheKey);
        if (s3Hit) {
            setInMemory(cacheKey, s3Hit, webpType);
            return imageResponse(s3Hit, webpType, 'S3');
        }

        // Tier 3: Generate
        const generated = await generateThumbnail(resolvedKey, params);

        // Populate both caches (S3 write is fire-and-forget)
        setInMemory(cacheKey, generated, webpType);
        saveToS3Cache(cacheKey, generated, webpType);

        return imageResponse(generated, webpType, 'MISS');
    } catch (error) {
        log.error('Thumbnail generation failed', {
            key: resolvedKey,
            error: error instanceof Error ? error.message : String(error),
        });
        return errorResponse('Failed to process image', 500);
    }
}
