import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

import { getFileBuffer, BUCKET, s3Client } from '@app/lib/s3';
import { extractKeyFromUrl } from '@app/lib/thumbnail-client';
import { createLogger } from '@shared/logger';
import { prisma } from '@shared/prisma';

const log = createLogger('thumbnail');

type FitOption = 'cover' | 'contain' | 'fill';

interface NormalizedThumbnailParams {
    width: number;
    height: number;
    quality: number;
    fit: FitOption;
}

function getCacheKey(originalKey: string, params: NormalizedThumbnailParams): string {
    const { width, height, quality, fit } = params;
    const filename = originalKey.split('/').pop()?.split('.')[0] || 'image';
    const ext = 'webp';
    return `cache/${filename}-${width}x${height}-q${quality}-${fit}.${ext}`;
}

function getContentType(format: string): string {
    const types: Record<string, string> = {
        webp: 'image/webp',
        jpeg: 'image/jpeg',
        jpg: 'image/jpeg',
        png: 'image/png',
    };
    return types[format] || 'image/webp';
}

async function getCachedImage(cacheKey: string): Promise<Buffer | null> {
    try {
        const command = new GetObjectCommand({
            Bucket: BUCKET,
            Key: cacheKey,
        });
        const response = await s3Client.send(command);

        if (!response.Body) return null;

        const stream = response.Body as AsyncIterable<Uint8Array>;
        const chunks: Uint8Array[] = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks);
    } catch (error) {
        log.warn('Unable to read cached thumbnail', {
            cacheKey,
            error: error instanceof Error ? error.message : String(error),
        });
        return null;
    }
}

async function saveCachedImage(
    cacheKey: string,
    buffer: Buffer,
    contentType: string,
): Promise<void> {
    const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: cacheKey,
        Body: buffer,
        ContentType: contentType,
        CacheControl: 'public, max-age=86400',
    });
    try {
        await s3Client.send(command);
    } catch (error) {
        log.warn('Unable to persist thumbnail cache', {
            cacheKey,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

function parsePositiveIntParam(value: string | null): number | undefined | null {
    if (value === null) return undefined;
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return null;
    return parsed > 0 ? parsed : null;
}

function sanitizeQuality(value: string | null): number | undefined | null {
    if (value === null) return undefined;
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return null;
    if (parsed < 1) return 1;
    if (parsed > 100) return 100;
    return parsed;
}

function sanitizeFit(value: string | null): FitOption {
    const allowed: FitOption[] = ['cover', 'contain', 'fill'];
    if (!value) return 'cover';
    if (allowed.includes(value as FitOption)) {
        return value as FitOption;
    }
    return 'cover';
}

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

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const type = searchParams.get('type');
    const id = searchParams.get('id');
    const widthParam = searchParams.get('width');
    const heightParam = searchParams.get('height');
    const qualityParam = searchParams.get('quality');

    const width = parsePositiveIntParam(widthParam);
    const height = parsePositiveIntParam(heightParam);
    if (widthParam !== null && width === null) {
        return NextResponse.json({ error: 'width must be a positive integer' }, { status: 400 });
    }
    if (heightParam !== null && height === null) {
        return NextResponse.json({ error: 'height must be a positive integer' }, { status: 400 });
    }

    const parsedQuality = sanitizeQuality(qualityParam);
    if (qualityParam !== null && parsedQuality === null) {
        return NextResponse.json(
            { error: 'quality must be a number between 1 and 100' },
            { status: 400 },
        );
    }
    const quality = parsedQuality ?? 80;
    const fit = sanitizeFit(searchParams.get('fit'));
    const shouldResize = width !== undefined && height !== undefined;

    let resolvedKey = key;

    if (!key && type && id) {
        resolvedKey = await resolveImageKey(type, id);
    }

    if (!resolvedKey) {
        return NextResponse.json({ error: 'Missing key or invalid type/id' }, { status: 400 });
    }

    try {
        if (!shouldResize) {
            const buffer = await getFileBuffer(resolvedKey);
            const ext = resolvedKey.split('.').pop()?.toLowerCase() || 'jpg';
            const contentType = getContentType(ext);

            return new NextResponse(new Uint8Array(buffer), {
                headers: {
                    'Content-Type': contentType,
                    'Cache-Control': 'public, max-age=86400',
                },
            });
        }

        const normalized: NormalizedThumbnailParams = {
            width: width!,
            height: height!,
            quality,
            fit,
        };

        const cacheKey = getCacheKey(resolvedKey, normalized);

        const cachedBuffer = await getCachedImage(cacheKey);
        if (cachedBuffer) {
            return new NextResponse(new Uint8Array(cachedBuffer), {
                headers: {
                    'Content-Type': getContentType('webp'),
                    'Cache-Control': 'public, max-age=86400',
                    'X-Cache': 'HIT',
                },
            });
        }

        const imageBuffer = await getFileBuffer(resolvedKey);

        const processor = sharp(imageBuffer)
            .resize(normalized.width, normalized.height, {
                fit: normalized.fit,
                position: 'entropy',
            })
            .webp({ quality: normalized.quality });

        const outputBuffer = await processor.toBuffer();

        await saveCachedImage(cacheKey, outputBuffer, getContentType('webp'));

        return new NextResponse(new Uint8Array(outputBuffer), {
            headers: {
                'Content-Type': getContentType('webp'),
                'Cache-Control': 'public, max-age=86400',
                'X-Cache': 'MISS',
            },
        });
    } catch (error) {
        log.error('Thumbnail generation failed', {
            key: resolvedKey,
            width,
            height,
            quality,
            fit,
            error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ error: 'Failed to process image' }, { status: 500 });
    }
}
