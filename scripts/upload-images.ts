import 'dotenv/config';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

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

const imagesDir = './tmp/images';

const files = readdirSync(imagesDir);

for (const file of files) {
    const filePath = join(imagesDir, file);
    const fileContent = readFileSync(filePath);

    const key = `recipes/${file}`;

    const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: fileContent,
        ContentType: 'image/jpeg',
    });

    await s3Client.send(command);
    console.log(`✅ Uploaded: ${key}`);
}

console.log('🎉 All images uploaded!');
