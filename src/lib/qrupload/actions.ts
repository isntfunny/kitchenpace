'use server';

import { verifyQRToken } from './jwt';
import { getTokenValue } from './redis';
import type { PollStatusResponse } from './types';

export async function pollQRUploadStatus(token: string): Promise<PollStatusResponse> {
    let payload;
    try {
        payload = await verifyQRToken(token);
    } catch {
        return { status: 'expired' };
    }

    const state = await getTokenValue(payload.tokenId);
    if (!state) return { status: 'expired' };

    return {
        status: state.status,
        imageKey: state.imageKey,
        moderationStatus: state.moderationStatus,
    };
}
