import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import smartcrop from 'smartcrop';

import { getFileBuffer, BUCKET, s3Client } from '@/lib/s3';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SmartCropInput = any;

interface ThumbnailParams {
    width?: number;
    height?: number;
    quality?: number;
    fit?: 'cover' | 'contain' | 'fill';
}

function getCacheKey(originalKey: string, params: ThumbnailParams): string {
    const { width = 400, height = 300, quality = 80, fit = 'cover' } = params;
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
        const { GetObjectCommand } = await import('@aws-sdk/client-s3');
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
    } catch {
        return null;
    }
}

async function saveCachedImage(
    cacheKey: string,
    buffer: Buffer,
    contentType: string,
): Promise<void> {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: cacheKey,
        Body: buffer,
        ContentType: contentType,
        CacheControl: 'public, max-age=86400',
    });
    await s3Client.send(command);
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    const width = parseInt(searchParams.get('width') || '400', 10);
    const height = parseInt(searchParams.get('height') || '300', 10);
    const quality = parseInt(searchParams.get('quality') || '80', 10);
    const fit = (searchParams.get('fit') || 'cover') as 'cover' | 'contain' | 'fill';

    if (!key) {
        return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 });
    }

    try {
        const cacheKey = getCacheKey(key, { width, height, quality, fit });

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

        const imageBuffer = await getFileBuffer(key);

        const cropResult = await smartcrop.crop(imageBuffer as SmartCropInput, { width, height });
        const crop = cropResult.topCrop;

        const processor = sharp(imageBuffer)
            .extract({
                left: Math.round(crop.x),
                top: Math.round(crop.y),
                width: Math.round(crop.width),
                height: Math.round(crop.height),
            })
            .resize(width, height, {
                fit: 'cover',
                position: 'center',
            })
            .webp({ quality });

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
        console.error('Thumbnail error:', error);
        return NextResponse.json({ error: 'Failed to process image' }, { status: 500 });
    }
}
