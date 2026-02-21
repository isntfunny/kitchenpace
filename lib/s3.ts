import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

const s3Client = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || '',
        secretAccessKey: process.env.S3_SECRET || '',
    },
    forcePathStyle: true,
});

const BUCKET = process.env.S3_BUCKET || 'kitchenpace';

export type UploadType = 'profile' | 'recipe' | 'comment';

const getFolder = (type: UploadType): string => {
    const folders: Record<UploadType, string> = {
        profile: 'profiles',
        recipe: 'recipes',
        comment: 'comments',
    };
    return folders[type];
};

const generateKey = (type: UploadType, filename: string): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = filename.split('.').pop() || 'jpg';
    return `${getFolder(type)}/${timestamp}-${random}.${ext}`;
};

export interface UploadResult {
    url: string;
    key: string;
}

export async function uploadFile(
    file: Buffer,
    filename: string,
    contentType: string,
    type: UploadType,
): Promise<UploadResult> {
    const key = generateKey(type, filename);

    const upload = new Upload({
        client: s3Client,
        params: {
            Bucket: BUCKET,
            Key: key,
            Body: file,
            ContentType: contentType,
        },
    });

    await upload.done();

    const baseUrl = process.env.S3_ENDPOINT || '';
    const url = `${baseUrl}/${BUCKET}/${key}`;

    return { url, key };
}

export async function deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
    });

    await s3Client.send(command);
}

export async function getFileUrl(key: string): Promise<string> {
    const baseUrl = process.env.S3_ENDPOINT || '';
    return `${baseUrl}/${BUCKET}/${key}`;
}

export { s3Client, BUCKET };
