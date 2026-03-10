import type { UploadType } from '@app/lib/s3';

export interface QRUploadTokenPayload {
    tokenId: string;
    userId: string;
    type: UploadType;
    recipeId?: string;
    stepId?: string;
    label?: string;
}

export interface QRTokenRedisValue {
    status: 'pending' | 'complete';
    userId: string;
    imageKey?: string;
    moderationStatus?: string;
}

export interface CreateTokenRequest {
    type: UploadType;
    recipeId?: string;
    stepId?: string;
    label?: string;
}

export interface CreateTokenResponse {
    token: string;
    qrUrl: string;
    expiresAt: string;
    tokenId: string;
}

export interface PollStatusResponse {
    status: 'pending' | 'complete' | 'expired';
    imageKey?: string;
    moderationStatus?: string;
}
