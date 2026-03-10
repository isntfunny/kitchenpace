import { NextRequest, NextResponse } from 'next/server';

import { getServerAuthSession, logMissingSession } from '@app/lib/auth';
import { logAuth } from '@app/lib/auth-logger';
import type { UploadType } from '@app/lib/s3';
import { processFileUpload } from '@app/lib/upload/processUpload';

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

    if (!type || !['profile', 'recipe', 'comment', 'step', 'cook'].includes(type)) {
        return NextResponse.json({ error: 'Invalid upload type' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    try {
        const result = await processFileUpload(file, type, session.user.id);

        if (!result.success) {
            logAuth('warn', 'POST /api/upload: image rejected by moderation', {
                userId: session.user.id,
                type,
            });
            return NextResponse.json(
                { error: result.error, reason: 'Inhalt verstößt gegen unsere Richtlinien' },
                { status: result.httpStatus },
            );
        }

        logAuth('info', 'POST /api/upload: file uploaded', {
            userId: session.user.id,
            type,
            key: result.key,
            moderationStatus: result.moderationStatus,
        });

        return NextResponse.json({ key: result.key, moderationStatus: result.moderationStatus });
    } catch (error) {
        logAuth('error', 'POST /api/upload failed', {
            message: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
