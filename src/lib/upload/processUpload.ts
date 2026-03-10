import { moderateContent, persistModerationResult } from '@app/lib/moderation/moderationService';
import { upload, generateUploadKey, trashKeyFrom, moveObject } from '@app/lib/s3';
import type { UploadType } from '@app/lib/s3';

export type ProcessUploadResult =
    | { success: true; key: string; moderationStatus: string }
    | { success: false; error: string; httpStatus: number };

export async function processFileUpload(
    file: File,
    type: UploadType,
    userId: string,
): Promise<ProcessUploadResult> {
    const buffer = Buffer.from(await file.arrayBuffer());
    const key = generateUploadKey(type, file.name);

    await upload(key, buffer, file.type);

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
        authorId: userId,
        imageKey: key,
    };

    if (modResult.decision === 'REJECTED') {
        const trashKey = trashKeyFrom(key);
        await moveObject(key, trashKey);
        await persistModerationResult(modContentType, key, userId, modResult, modSnapshot);
        return { success: false, error: 'Bild wurde abgelehnt', httpStatus: 400 };
    }

    await persistModerationResult(modContentType, key, userId, modResult, modSnapshot);

    return { success: true, key, moderationStatus: modResult.decision };
}
