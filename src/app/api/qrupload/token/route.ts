import { randomUUID } from 'crypto';

import { NextRequest, NextResponse } from 'next/server';

import { getServerAuthSession } from '@app/lib/auth';
import { signQRToken } from '@app/lib/qrupload/jwt';
import { setTokenPending } from '@app/lib/qrupload/redis';
import type { CreateTokenRequest, CreateTokenResponse } from '@app/lib/qrupload/types';

const VALID_TYPES = ['profile', 'recipe', 'comment', 'step', 'cook'];
const APP_URL =
    process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export async function POST(request: NextRequest) {
    const session = await getServerAuthSession('api/qrupload/token');
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as CreateTokenRequest;
    const { type, recipeId, stepId, label } = body;

    if (!VALID_TYPES.includes(type)) {
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const tokenId = randomUUID();
    const userId = session.user.id;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const token = await signQRToken({ tokenId, userId, type, recipeId, stepId, label });
    await setTokenPending(tokenId, userId);

    const qrUrl = `${APP_URL}/qrupload#${token}`;

    return NextResponse.json({ token, qrUrl, expiresAt, tokenId } satisfies CreateTokenResponse);
}
