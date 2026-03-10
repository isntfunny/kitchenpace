import { NextRequest, NextResponse } from 'next/server';

import { createUserNotification } from '@app/lib/events/persist';
import { verifyQRToken } from '@app/lib/qrupload/jwt';
import { getTokenValue, completeToken } from '@app/lib/qrupload/redis';
import type { UploadType } from '@app/lib/s3';
import { processFileUpload } from '@app/lib/upload/processUpload';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export async function POST(request: NextRequest) {
    const authHeader = request.headers.get('Authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload;
    try {
        payload = await verifyQRToken(token);
    } catch {
        return NextResponse.json({ error: 'Ungültiger oder abgelaufener QR-Code' }, { status: 401 });
    }

    const state = await getTokenValue(payload.tokenId);
    if (!state) {
        return NextResponse.json({ error: 'QR-Code abgelaufen' }, { status: 410 });
    }
    if (state.status !== 'pending') {
        return NextResponse.json({ error: 'Foto wurde bereits hochgeladen' }, { status: 409 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
        return NextResponse.json({ error: 'Keine Datei ausgewählt' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'Datei zu groß (max. 5 MB)' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({ error: 'Ungültiges Dateiformat' }, { status: 400 });
    }

    const result = await processFileUpload(file, payload.type as UploadType, payload.userId);

    if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: result.httpStatus });
    }

    await completeToken(payload.tokenId, result.key, result.moderationStatus);

    const label = payload.label ?? 'Foto';
    await createUserNotification({
        userId: payload.userId,
        type: 'SYSTEM',
        title: 'Foto hochgeladen',
        message: `${label} wurde erfolgreich hochgeladen.`,
        data: payload.recipeId ? { recipeId: payload.recipeId } : undefined,
    }).catch((err) => console.error('[QRUpload] Notification failed', err));

    return NextResponse.json({ key: result.key, moderationStatus: result.moderationStatus });
}
