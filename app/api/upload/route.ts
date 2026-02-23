import { NextRequest, NextResponse } from 'next/server';

import { getServerAuthSession, logMissingSession } from '@/lib/auth';
import { logAuth } from '@/lib/auth-logger';
import { uploadFile, UploadType } from '@/lib/s3';

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

        return NextResponse.json({
            url: result.url,
            key: result.key,
        });
    } catch (error) {
        logAuth('error', 'POST /api/upload failed', {
            message: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
