import { NextRequest, NextResponse } from 'next/server';

import { getServerAuthSession, logMissingSession } from '@app/lib/auth';
import { logAuth } from '@app/lib/auth-logger';
import { moderateContent, persistModerationResult } from '@app/lib/moderation/moderationService';
import { upload, generateUploadKey, trashKeyFrom, moveObject } from '@app/lib/s3';
import type { UploadType } from '@app/lib/s3';

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
        const buffer = Buffer.from(await file.arrayBuffer());
        const key = generateUploadKey(type, file.name);

        // Upload to uploads/ prefix (private staging area)
        await upload(key, buffer, file.type);

        logAuth('info', 'POST /api/upload: file uploaded', {
            userId: session.user.id,
            type,
            key,
        });

        // Run AI image moderation using base64 data URL (bucket is private)
        const base64Url = `data:${file.type};base64,${buffer.toString('base64')}`;
        const modResult = await moderateContent({ imageKey: base64Url });

        const modContentType =
            type === 'step'
                ? 'step_image'
                : type === 'recipe'
                  ? 'recipe_image'
                  : type === 'profile'
                    ? 'profile'
                    : type === 'cook'
                      ? 'cook_image'
                      : 'comment';
        const modSnapshot = {
            contentType: type,
            contentId: key,
            authorId: session.user.id,
            imageKey: key,
        };

        if (modResult.decision === 'REJECTED') {
            // Move to trash/ instead of deleting
            const trashKey = trashKeyFrom(key);
            await moveObject(key, trashKey);

            await persistModerationResult(
                modContentType,
                key,
                session.user.id,
                modResult,
                modSnapshot,
            );

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

        // Persist moderation result for audit trail (PENDING + AUTO_APPROVED)
        await persistModerationResult(modContentType, key, session.user.id, modResult, modSnapshot);

        if (modResult.decision === 'PENDING') {
            logAuth('info', 'POST /api/upload: image queued for moderation', {
                userId: session.user.id,
                type,
                score: modResult.score,
            });
        }

        // AUTO_APPROVED: move to approved/ prefix
        // For now we keep it in uploads/ and let the consumer handle approval
        // since we don't know the entityId yet (recipe/step may not be saved yet)
        // The approveImage flow will be triggered when the entity is persisted

        return NextResponse.json({
            key,
            moderationStatus: modResult.decision,
        });
    } catch (error) {
        logAuth('error', 'POST /api/upload failed', {
            message: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
