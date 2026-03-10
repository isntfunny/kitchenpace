import {
    CopyObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    ListObjectsV2Command,
    PutObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

// eslint-disable-next-line import/order
import { BUCKET, s3Client } from './client';

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

export async function upload(key: string, body: Buffer, contentType: string): Promise<void> {
    const uploader = new Upload({
        client: s3Client,
        params: {
            Bucket: BUCKET,
            Key: key,
            Body: body,
            ContentType: contentType,
        },
    });
    await uploader.done();
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function getBuffer(key: string): Promise<Buffer> {
    const response = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));

    if (!response.Body) {
        throw new Error('Empty response from S3');
    }

    const stream = response.Body as AsyncIterable<Uint8Array>;
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

export async function exists(key: string): Promise<boolean> {
    try {
        await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
        return true;
    } catch {
        return false;
    }
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteObject(key: string): Promise<void> {
    await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

// ---------------------------------------------------------------------------
// Copy / Move
// ---------------------------------------------------------------------------

export async function copyObject(sourceKey: string, destKey: string): Promise<void> {
    await s3Client.send(
        new CopyObjectCommand({
            Bucket: BUCKET,
            CopySource: `${BUCKET}/${sourceKey}`,
            Key: destKey,
        }),
    );
}

export async function moveObject(sourceKey: string, destKey: string): Promise<void> {
    await copyObject(sourceKey, destKey);
    await deleteObject(sourceKey);
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

export async function listByPrefix(prefix: string): Promise<string[]> {
    const response = await s3Client.send(
        new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix }),
    );
    return (response.Contents ?? []).map((obj) => obj.Key!).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Put (lower-level, for cache writes etc.)
// ---------------------------------------------------------------------------

export async function putObject(
    key: string,
    body: Buffer,
    contentType: string,
    cacheControl?: string,
): Promise<void> {
    await s3Client.send(
        new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: body,
            ContentType: contentType,
            ...(cacheControl ? { CacheControl: cacheControl } : {}),
        }),
    );
}

// ---------------------------------------------------------------------------
// Backward-compat aliases
// ---------------------------------------------------------------------------

import type { UploadType } from './keys';
import { generateUploadKey } from './keys';

export interface UploadResult {
    url: string;
    key: string;
}

/** @deprecated Use `upload()` + `generateUploadKey()` directly */
export async function uploadFile(
    file: Buffer,
    filename: string,
    contentType: string,
    type: UploadType,
): Promise<UploadResult> {
    const key = generateUploadKey(type, filename);
    await upload(key, file, contentType);

    const baseUrl = process.env.S3_ENDPOINT || '';
    const url = `${baseUrl}/${BUCKET}/${key}`;
    return { url, key };
}

/** @deprecated Use `deleteObject()` */
export const deleteFile = deleteObject;

/** @deprecated Use `getBuffer()` */
export const getFileBuffer = getBuffer;

/** @deprecated Use key directly — URLs should not be constructed from S3 */
export async function getFileUrl(key: string): Promise<string> {
    const baseUrl = process.env.S3_ENDPOINT || '';
    return `${baseUrl}/${BUCKET}/${key}`;
}
