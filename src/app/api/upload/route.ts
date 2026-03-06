import { NextRequest, NextResponse } from 'next/server';

import { getServerAuthSession, logMissingSession } from '@app/lib/auth';
import { logAuth } from '@app/lib/auth-logger';
import { moderateContent, persistModerationResult } from '@app/lib/moderation/moderationService';
import { deleteFile, uploadFile, UploadType } from '@app/lib/s3';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export async function POST(request: NextRequest) {
    const session = await getServerAuthSession('api/upload');

    if (!session?.user?.id) {
        logMissingSession(session, 'api/upload');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as UploadType | null;

    if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!type || !['profile', 'recipe', 'comment'].includes(type)) {
        return NextResponse.json({ error: 'Invalid upload type' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await uploadFile(buffer, file.name, file.type, type);

        logAuth('info', 'POST /api/upload: file uploaded', {
            userId: session.user.id,
            type,
        });

        // Run AI image moderation
        const modResult = await moderateContent({ imageUrl: result.url });

        if (modResult.decision === 'REJECTED') {
            // Delete the uploaded file from S3
            await deleteFile(result.key);

            logAuth('warn', 'POST /api/upload: image rejected by moderation', {
                userId: session.user.id,
                type,
                score: modResult.score,
            });

            return NextResponse.json(
                {
                    error: 'Bild wurde abgelehnt',
                    reason: 'Inhalt verstößt gegen unsere Richtlinien',
                },
                { status: 400 },
            );
        }

        if (modResult.decision === 'PENDING') {
            // Queue for human review but let the upload succeed
            await persistModerationResult(
                type === 'recipe' ? 'recipe' : type === 'profile' ? 'profile' : 'comment',
                result.key, // use S3 key as contentId for image uploads
                session.user.id,
                modResult,
                {
                    contentType: type,
                    contentId: result.key,
                    authorId: session.user.id,
                    imageUrl: result.url,
                },
            );

            logAuth('info', 'POST /api/upload: image queued for moderation', {
                userId: session.user.id,
                type,
                score: modResult.score,
            });
        }

        return NextResponse.json({
            url: result.url,
            key: result.key,
            moderationStatus: modResult.decision,
        });
    } catch (error) {
        logAuth('error', 'POST /api/upload failed', {
            message: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
