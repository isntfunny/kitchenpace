import { readFile } from 'fs/promises';
import { join } from 'path';

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

import { getServerAuthSession } from '@app/lib/auth';
import {
    getBuffer,
    exists,
    putObject,
    thumbKey,
    parsePrefix,
    snapToBreakpoint,
    heightForAspect,
    BREAKPOINTS,
} from '@app/lib/s3';
import type { AspectRatio } from '@app/lib/s3';
import { createLogger } from '@shared/logger';
import { prisma } from '@shared/prisma';

const log = createLogger('thumbnail');

const VALID_ASPECTS: AspectRatio[] = [
    '16:9',
    '4:3',
    '3:2',
    '1:1',
    '4:1',
    '3:1',
    '3:4',
    '2:1',
    'original',
];

// ---------------------------------------------------------------------------
// In-memory LRU cache
// ---------------------------------------------------------------------------

const MAX_MEMORY_BYTES = 50 * 1024 * 1024;
const MAX_MEMORY_ENTRIES = 200;

interface MemoryCacheEntry {
    buffer: Buffer;
    contentType: string;
}

const memoryCache = new Map<string, MemoryCacheEntry>();
let memoryCacheBytes = 0;

function evictMemoryCache(neededBytes: number): void {
    for (const [key, entry] of memoryCache) {
        if (
            memoryCacheBytes + neededBytes <= MAX_MEMORY_BYTES &&
            memoryCache.size < MAX_MEMORY_ENTRIES
        )
            break;
        memoryCacheBytes -= entry.buffer.length;
        memoryCache.delete(key);
    }
}

function getFromMemory(cacheKey: string): MemoryCacheEntry | null {
    const entry = memoryCache.get(cacheKey);
    if (!entry) return null;
    memoryCache.delete(cacheKey);
    memoryCache.set(cacheKey, entry);
    return entry;
}

function setInMemory(cacheKey: string, buffer: Buffer, contentType: string): void {
    if (buffer.length > 5 * 1024 * 1024) return;
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
// Access control
// ---------------------------------------------------------------------------

async function canAccessKey(key: string): Promise<boolean> {
    const prefix = parsePrefix(key);

    // Public prefixes: serve freely
    if (prefix === 'approved' || prefix === 'thumbs' || prefix === 'legacy') {
        return true;
    }

    // uploads/ = any authenticated user (owner needs to preview their pending content)
    if (prefix === 'uploads') {
        const session = await getServerAuthSession('thumbnail-access');
        return Boolean(session?.user?.id);
    }

    // trash/ = admin/mod only
    if (prefix === 'trash') {
        const session = await getServerAuthSession('thumbnail-access');
        if (!session?.user?.id) return false;

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true },
        });

        return user?.role === 'admin' || user?.role === 'moderator';
    }

    return false;
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
            select: { photoKey: true },
        });
        if (!profile) return null;
        return profile.photoKey ?? null;
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

let placeholderCache: Buffer | null = null;

async function placeholderResponse(): Promise<NextResponse> {
    if (!placeholderCache) {
        placeholderCache = await readFile(join(process.cwd(), 'public', 'recipe_placeholder.jpg'));
    }
    return new NextResponse(new Uint8Array(placeholderCache), {
        headers: {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=86400',
            'X-Cache': 'PLACEHOLDER',
        },
    });
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);

    // Parse aspect ratio
    const aspectParam = searchParams.get('aspect') || 'original';
    if (!VALID_ASPECTS.includes(aspectParam as AspectRatio)) {
        return errorResponse(`Invalid aspect ratio: ${aspectParam}`, 400);
    }
    const aspect = aspectParam as AspectRatio;

    // Parse width (optional, snapped to nearest breakpoint)
    const wParam = searchParams.get('w');
    const requestedWidth = wParam ? Number.parseInt(wParam, 10) : null;
    if (requestedWidth !== null && (!Number.isFinite(requestedWidth) || requestedWidth <= 0)) {
        return errorResponse('w must be a positive integer', 400);
    }
    const width = requestedWidth ? snapToBreakpoint(requestedWidth) : 960;

    // Resolve the S3 key
    const resolvedKey =
        searchParams.get('key') ??
        (await resolveImageKey(searchParams.get('type'), searchParams.get('id')));

    if (!resolvedKey) {
        if (searchParams.get('type')) return placeholderResponse();
        return errorResponse('Missing key or invalid type/id', 400);
    }

    // Access control
    if (!(await canAccessKey(resolvedKey))) {
        return errorResponse('Forbidden', 403);
    }

    try {
        const tKey = thumbKey(resolvedKey, aspect, width);

        // Tier 1: Memory cache
        const memHit = getFromMemory(tKey);
        if (memHit) {
            return imageResponse(memHit.buffer, memHit.contentType, 'MEMORY');
        }

        // Tier 2: S3 thumb cache
        try {
            if (await exists(tKey)) {
                const s3Hit = await getBuffer(tKey);
                setInMemory(tKey, s3Hit, 'image/webp');
                return imageResponse(s3Hit, 'image/webp', 'S3');
            }
        } catch {
            /* cache miss */
        }

        // Tier 3: Generate ALL breakpoints for this key+aspect
        const originalBuffer = await getBuffer(resolvedKey);
        const meta = await sharp(originalBuffer).metadata();
        const srcWidth = meta.width ?? 1920;

        let resultBuffer: Buffer | null = null;

        for (const bp of BREAKPOINTS) {
            if (bp > srcWidth) continue;

            const bpKey = thumbKey(resolvedKey, aspect, bp);
            const height = heightForAspect(bp, aspect);

            let resized: Buffer;
            if (height === null) {
                resized = await sharp(originalBuffer)
                    .resize(bp, undefined, { withoutEnlargement: true })
                    .webp({ quality: 80 })
                    .toBuffer();
            } else {
                resized = await sharp(originalBuffer)
                    .resize(bp, height, { fit: 'cover', position: 'attention' })
                    .webp({ quality: 80 })
                    .toBuffer();
            }

            if (bp === width) {
                resultBuffer = resized;
                setInMemory(bpKey, resized, 'image/webp');
                await putObject(bpKey, resized, 'image/webp', 'public, max-age=604800');
            } else {
                putObject(bpKey, resized, 'image/webp', 'public, max-age=604800').catch((err) => {
                    log.warn('Failed to cache breakpoint variant', {
                        key: bpKey,
                        error: String(err),
                    });
                });
            }
        }

        if (resultBuffer) {
            return imageResponse(resultBuffer, 'image/webp', 'MISS');
        }

        // Width larger than source — generate at source width
        const height = heightForAspect(srcWidth, aspect);
        const fallbackBuffer =
            height === null
                ? await sharp(originalBuffer).webp({ quality: 80 }).toBuffer()
                : await sharp(originalBuffer)
                      .resize(srcWidth, height, { fit: 'cover', position: 'attention' })
                      .webp({ quality: 80 })
                      .toBuffer();

        setInMemory(tKey, fallbackBuffer, 'image/webp');
        return imageResponse(fallbackBuffer, 'image/webp', 'MISS');
    } catch (error) {
        log.error('Thumbnail generation failed', {
            key: resolvedKey,
            error: error instanceof Error ? error.message : String(error),
        });
        return placeholderResponse();
    }
}
