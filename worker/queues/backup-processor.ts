import { exec } from 'child_process';
import { createReadStream, promises as fs } from 'fs';
import path from 'path';
import { promisify } from 'util';

import { S3Client, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Job } from 'bullmq';

import { BackupJob } from './types';

const execAsync = promisify(exec);

interface BackupResult {
    filename: string;
    size: number;
    duration: number;
    destination: string;
}

// S3 Client für MinIO
const s3Client = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || '',
        secretAccessKey: process.env.S3_SECRET_KEY || '',
    },
    forcePathStyle: true,
});

const BACKUP_BUCKET = process.env.S3_BUCKET || 'kitchenpace';
const BACKUP_PREFIX = 'backups/database/';
const LOCAL_BACKUP_DIR = process.env.BACKUP_DIR || '/app/backups';

/**
 * Führt ein Datenbank-Backup durch und speichert es in MinIO/S3
 */
export async function processDatabaseBackup(job: Job<BackupJob>): Promise<BackupResult> {
    const startTime = Date.now();
    const { type } = job.data;

    console.log(`[BackupWorker] Starting ${type} backup job ${job.id}`);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `kitchenpace_${type}_${timestamp}.dump`;
    const localPath = path.join(LOCAL_BACKUP_DIR, filename);

    try {
        // 1. Backup-Verzeichnis sicherstellen
        await fs.mkdir(LOCAL_BACKUP_DIR, { recursive: true });

        // 2. pg_dump ausführen
        console.log(`[BackupWorker] Creating database dump: ${filename}`);
        await createDatabaseDump(localPath);

        // 3. Dateigröße prüfen
        const stats = await fs.stat(localPath);
        console.log(`[BackupWorker] Dump created: ${formatBytes(stats.size)}`);

        // 4. Zu MinIO uploaden
        await uploadToMinIO(localPath, filename, type);

        // 5. Lokale Retention anwenden (nur stündliche Backups)
        if (type === 'hourly') {
            await cleanupLocalBackups();
        }

        // 6. Cloud Retention anwenden
        await cleanupCloudBackups(type);

        // 7. Lokale Datei aufräumen
        await fs.unlink(localPath);

        const duration = Date.now() - startTime;
        console.log(`[BackupWorker] Backup completed in ${duration}ms`, {
            filename,
            size: stats.size,
            destination: 'minio',
        });

        return {
            filename,
            size: stats.size,
            duration,
            destination: 'minio',
        };
    } catch (error) {
        // Cleanup bei Fehler
        try {
            await fs.unlink(localPath);
        } catch {
            // Ignorieren
        }
        throw error;
    }
}

/**
 * Erstellt ein PostgreSQL-Backup mit pg_dump
 */
async function createDatabaseDump(outputPath: string): Promise<void> {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        throw new Error('DATABASE_URL not configured');
    }

    // pg_dump mit custom format (komprimiert, schneller)
    const command = `pg_dump -Fc "${dbUrl}" > "${outputPath}"`;

    const { stderr } = await execAsync(command);
    if (stderr && !stderr.includes('NOTICE')) {
        console.warn(`[BackupWorker] pg_dump stderr: ${stderr}`);
    }
}

/**
 * Upload zu MinIO/S3
 */
async function uploadToMinIO(localPath: string, filename: string, type: string): Promise<void> {
    const key = `${BACKUP_PREFIX}${type}/${filename}`;
    const fileStream = createReadStream(localPath);

    console.log(`[BackupWorker] Uploading to MinIO: ${key}`);

    const upload = new Upload({
        client: s3Client,
        params: {
            Bucket: BACKUP_BUCKET,
            Key: key,
            Body: fileStream,
            ContentType: 'application/octet-stream',
            Metadata: {
                'backup-type': type,
                'created-at': new Date().toISOString(),
            },
        },
    });

    upload.on('httpUploadProgress', (progress) => {
        const percent =
            progress.loaded && progress.total
                ? Math.round((progress.loaded / progress.total) * 100)
                : 0;
        console.log(`[BackupWorker] Upload progress: ${percent}%`);
    });

    await upload.done();
    console.log(`[BackupWorker] Upload completed: ${key}`);
}

/**
 * Löscht alte lokale Backups (nur stündliche, letzte 24h)
 */
async function cleanupLocalBackups(): Promise<void> {
    const files = await fs.readdir(LOCAL_BACKUP_DIR);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 Stunden

    for (const file of files) {
        if (!file.startsWith('kitchenpace_hourly_')) continue;

        const filePath = path.join(LOCAL_BACKUP_DIR, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtime.getTime() > maxAge) {
            await fs.unlink(filePath);
            console.log(`[BackupWorker] Deleted old local backup: ${file}`);
        }
    }
}

/**
 * Löscht alte Cloud-Backups in MinIO
 */
async function cleanupCloudBackups(type: string): Promise<void> {
    const retentionDays = type === 'hourly' ? 7 : 30;
    const prefix = `${BACKUP_PREFIX}${type}/`;

    const listCommand = new ListObjectsV2Command({
        Bucket: BACKUP_BUCKET,
        Prefix: prefix,
    });

    const response = await s3Client.send(listCommand);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const objectsToDelete = (response.Contents || [])
        .filter((obj) => {
            if (!obj.LastModified) return false;
            return obj.LastModified < cutoffDate;
        })
        .map((obj) => obj.Key)
        .filter((key): key is string => !!key);

    for (const key of objectsToDelete) {
        await s3Client.send(
            new DeleteObjectCommand({
                Bucket: BACKUP_BUCKET,
                Key: key,
            }),
        );
        console.log(`[BackupWorker] Deleted old cloud backup: ${key}`);
    }
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
